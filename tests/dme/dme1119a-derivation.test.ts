import { describe, expect, it } from "vitest";
import { cloneDefaultDmePmdtData } from "@/lib/dme-pmdt-defaults";
import {
  calculateLdesThresholdDbm,
  calculateLdesWindowUs,
  deriveIntegrityTestTargets,
  dmeConfigDerivationMap,
  dmeParameterFieldCatalog,
  dmeTransferRequested,
  setDmeParameterValue,
} from "@/lib/dme1119a";
import { createDmePmdtStore } from "@/stores/dme-pmdt-store";

function change(fieldId: string, value: string | number | boolean) {
  return setDmeParameterValue(cloneDefaultDmePmdtData(), fieldId, value);
}

function row(data: ReturnType<typeof cloneDefaultDmePmdtData>, kind: "integral" | "standby", label: string) {
  return (kind === "integral" ? data.integralData : data.standbyData).find((item) => item.label === label);
}

describe("DME 1119A CONFIG -> MONITOR derivation", () => {
  it("keeps an explicit mapping for every catalog field", () => {
    expect(dmeConfigDerivationMap).toHaveLength(dmeParameterFieldCatalog.length);
    expect(dmeParameterFieldCatalog.every((field) => field.derivation?.affects.length && field.derivation.formula && field.derivation.alarmStatus)).toBe(true);
  });

  it("propagates Table 9-5 X to Y channel allocation and calibration baseline", () => {
    const data = change("rmsConfigStation.channelType", "Y");
    expect(data.rmsConfigStation.stationDescription).toContain("117Y");
    expect(row(data, "integral", "Delay")?.mon1Value).toBe("55.99");
    expect(row(data, "integral", "Spacing")?.mon1Value).toBe("29.98");
    expect(row(data, "integral", "Tx Frequency")?.mon1Value).toBe("1078.000");
    expect(row(data, "integral", "Rx LO Frequency")?.mon1Value).toBe("1016.000");
    expect(data.decoderResults.monitor1[0].parameter).toContain("36.0 us");
    expect(data.monitorCalibrationData.monitor1.find((item) => item.parameter === "Delay")?.baseline).toBe(56);
    expect(data.alarmLimits.find((item) => item.parameter === "Delay")?.nominal).toBe(56);
  });

  it("moves RTC/monitor power and PA status with output, station power and HPA enable", () => {
    const base = cloneDefaultDmePmdtData();
    const higher = change("txConfigNominal.rtcParameters.powerOutput", 0);
    expect(Number(row(higher, "integral", "Tx Power")?.mon1Value)).toBeGreaterThan(Number(row(base, "integral", "Tx Power")?.mon1Value));

    const hpaDisabled = change("txConfigNominal.powerAmplifiers.hpa1Enabled", false);
    expect(hpaDisabled.paStatus.find((item) => item.name === "HPA #1")?.outputPower).toBe("red");
    expect(row(hpaDisabled, "integral", "Tx Power")?.mon1Status).toBe("alarm");
    expect(hpaDisabled.txStatus.maintenanceAlert.tx1).toBe(true);

    const hpaRestored = setDmeParameterValue(hpaDisabled, "txConfigNominal.powerAmplifiers.hpa1Enabled", true);
    expect(hpaRestored.txStatus.maintenanceAlert.tx1).toBe(false);

    const thresholdTest = change("txConfigNominal.powerAmplifiers.lowOutputPowerAlertLimit", 100);
    expect(thresholdTest.paStatus.find((item) => item.name === "HPA #1")?.outputPower).toBe("red");
    expect(thresholdTest.txStatus.maintenanceAlert.tx1).toBe(true);
  });

  it("deterministically applies squitter, maximum PRF, dead time and overload", () => {
    const highLoad = change("txConfigNominal.rtcParameters.minimumSquitter", 2000);
    expect(Number(row(highLoad, "integral", "PRF")?.mon1Value)).toBeGreaterThan(792);

    const capped = setDmeParameterValue(highLoad, "txConfigNominal.rtcParameters.maximumPrf", 500);
    expect(Number(row(capped, "integral", "PRF")?.mon1Value)).toBeLessThanOrEqual(475);
    expect(capped.rtcStatus.overload.tx1).toBe(true);

    const dead = change("txConfigNominal.rtcParameters.deadTime", 120);
    expect(dead.trafficLoad.find((item) => item.band === "Total Replies")?.tx1 ?? 0).toBeLessThan(
      cloneDefaultDmePmdtData().trafficLoad.find((item) => item.band === "Total Replies")?.tx1 ?? 0,
    );
  });

  it("crosses the +0.45 us delay alarm and requests dual hot-standby transfer", () => {
    const data = change("txConfigNominal.rtcParameters.replyDelayOffset", 0.45);
    expect(row(data, "integral", "Delay")?.mon1Value).toBe("50.44");
    expect(row(data, "integral", "Delay")?.mon1Status).toBe("alarm");
    expect(data.monitors.integral.priAlarm).toBe(true);
    expect(dmeTransferRequested(data)).toBe(true);
  });

  it("applies TX2 Power Output Scale to standby and RX Sensitivity Offset to Monitor 2 decoder", () => {
    const scaled = change("txOffsets.0.tx2", 90);
    expect(Number(row(scaled, "standby", "Tx Power")?.mon1Value)).not.toBe(968);

    const sensitivity = change("txOffsets.1.tx2", 3);
    expect(sensitivity.decoderResults.monitor1[0].data).toBe(-94.1);
    expect(sensitivity.decoderResults.monitor2[0].data).toBe(-91.1);
  });

  it("keeps TX1 and TX2 Power Output Scale independent and follows the selected antenna path", () => {
    const base = cloneDefaultDmePmdtData();
    const tx1Scaled = change("txOffsets.0.tx1", 60);
    const tx2Scaled = change("txOffsets.0.tx2", 70);
    const baseIntegralPower = row(base, "integral", "Tx Power");
    const baseStandbyPower = row(base, "standby", "Tx Power");

    expect(Number(row(tx1Scaled, "integral", "Tx Power")?.mon1Value)).toBeGreaterThan(Number(baseIntegralPower?.mon1Value));
    expect(row(tx1Scaled, "standby", "Tx Power")).toEqual(baseStandbyPower);
    expect(Number(row(tx1Scaled, "integral", "ERP")?.mon1Value)).toBeGreaterThan(Number(row(base, "integral", "ERP")?.mon1Value));
    expect(tx1Scaled.paStatus.find((item) => item.name === "HPA #1")?.outputPower).toBe("green");
    expect(tx1Scaled.paStatus.find((item) => item.name === "HPA #2")?.outputPower).toBe("green");

    expect(row(tx2Scaled, "integral", "Tx Power")).toEqual(baseIntegralPower);
    expect(Number(row(tx2Scaled, "standby", "Tx Power")?.mon1Value)).toBeGreaterThan(Number(baseStandbyPower?.mon1Value));
    expect(tx2Scaled.paStatus.find((item) => item.name === "HPA #1")?.outputPower).toBe("green");
    expect(tx2Scaled.paStatus.find((item) => item.name === "HPA #2")?.outputPower).toBe("green");
  });

  it("applies per-monitor offsets, independent ERP calibration, and never emits negative VSWR", () => {
    const data = change("monitorOffsets.monitor1.0.integral", 0.25);
    expect(Number(row(data, "integral", "Delay")?.mon1Value)).toBeCloseTo(50.24, 2);

    const withScale = setDmeParameterValue(data, "monitorOffsets.monitor1.2.standby", 200);
    expect(Number(row(withScale, "standby", "Tx Power")?.mon1Value)).toBeGreaterThan(968);
    const withPowerOffset = setDmeParameterValue(withScale, "monitorOffsets.monitor1.3.standby", 20);
    expect(Number(row(withPowerOffset, "standby", "Tx Power")?.mon1Value)).toBeGreaterThan(Number(row(withScale, "standby", "Tx Power")?.mon1Value));
    const withEfficiency = setDmeParameterValue(withPowerOffset, "monitorOffsets.monitor1.4.integral", 2);
    expect(Number(row(withEfficiency, "integral", "Efficiency")?.mon1Value)).toBeGreaterThan(Number(row(data, "integral", "Efficiency")?.mon1Value));
    const withPrf = setDmeParameterValue(withEfficiency, "monitorOffsets.monitor1.5.integral", 20);
    expect(Number(row(withPrf, "integral", "PRF")?.mon1Value)).toBeGreaterThan(Number(row(withEfficiency, "integral", "PRF")?.mon1Value));
    const withFrequency = setDmeParameterValue(withPrf, "monitorOffsets.monitor1.6.integral", 10);
    expect(row(withFrequency, "integral", "Tx Frequency")?.mon1Value).toBe("1204.012");
    const withRxFrequency = setDmeParameterValue(withFrequency, "monitorOffsets.monitor1.7.integral", 20);
    expect(row(withRxFrequency, "integral", "Rx Frequency")?.mon1Value).toBe("1141.011");
    const withErp = setDmeParameterValue(withRxFrequency, "monitorOffsets.monitor1.8.integral", 1);
    expect(Number(row(withErp, "integral", "ERP")?.mon1Value)).toBeGreaterThan(Number(row(withRxFrequency, "integral", "ERP")?.mon1Value));
    const withVswr = setDmeParameterValue(withErp, "monitorOffsets.monitor1.9.integral", -5);
    expect(Number(row(withVswr, "integral", "VSWR")?.mon1Value)).toBeGreaterThanOrEqual(1);

    const erp1 = setDmeParameterValue(withVswr, "monitorSystemSettings.monitor1ReplyAttenuation", 30);
    expect(Number(row(erp1, "integral", "ERP")?.mon1Value)).toBeLessThan(Number(row(withVswr, "integral", "ERP")?.mon1Value));
  });

  it("routes single/dual equipment and standby propagation coherently", () => {
    const single = change("rmsConfigStation.transmitterConfig", "Single Transmitter");
    expect(single.transmitters.tx2.off).toBe("gray");
    expect(row(single, "standby", "Tx Power")?.mon1Value).toBe("—");

    const singleMonitor = change("rmsConfigStation.monitorConfig", "Single Monitor");
    expect(row(singleMonitor, "integral", "Tx Power")?.mon2Value).toBe("—");

    const noHotStandby = change("rmsConfigStation.hotStandby", false);
    expect(row(noHotStandby, "standby", "Tx Power")?.mon1Value).toBe("—");

    const aligned = change("txConfigNominal.rtcParameters.standbyPropagationOffset", 0.4);
    const offset = setDmeParameterValue(aligned, "txOffsets.2.tx2", 0.2);
    expect(offset.delayControl.rtc2.propagationDelay).toBeGreaterThan(
      cloneDefaultDmePmdtData().delayControl.rtc2.propagationDelay,
    );
    expect(Number(row(offset, "standby", "Delay")?.mon1Value)).toBeGreaterThan(
      Number(row(aligned, "standby", "Delay")?.mon1Value),
    );

    const antennaOff = change("monitorTransmitterStatus.transmitterOn.tx1", false);
    expect(row(antennaOff, "integral", "Tx Power")?.mon1Value).toBe("0");
    expect(row(antennaOff, "integral", "Tx Power")?.mon1Status).toBe("gray");
    expect(row(antennaOff, "integral", "Tx Frequency")?.mon1Value).toBe("—");
  });

  it("projects ident selection and secondary transfer voting", () => {
    const secondaryCode = setDmeParameterValue(
      change("txConfigNominal.ident.secondaryIdentCode", "ABC"),
      "txConfigNominal.ident.standbyIdent",
      "Secondary Ident",
    );
    expect(row(secondaryCode, "standby", "Ident Code")?.mon1Value).toBe("ABC");

    const identOff = change("identMode", "off");
    expect(row(identOff, "integral", "Ident Status")?.mon1Status).toBe("yellow");
    expect(identOff.alert).toBe(true);

    const externalKeyer = change("txConfigNominal.ident.keyerSource", "External Keying");
    expect(row(externalKeyer, "integral", "Ident Status")?.mon1Value).toBe("External Keying");
    expect(row(externalKeyer, "integral", "Ident Status")?.mon1Status).toBe("yellow");
    expect(externalKeyer.alert).toBe(true);
    const selfKeyed = setDmeParameterValue(externalKeyer, "txConfigNominal.ident.selfKeyOnLoss", true);
    expect(row(selfKeyed, "integral", "Ident Status")?.mon1Status).toBe("green");

    const secondaryFault = change("monitorOffsets.monitor1.6.integral", 30);
    const votedSecondary = setDmeParameterValue(secondaryFault, "rmsConfigGeneral.votingLogic", "OR");
    const secondaryTransfer = setDmeParameterValue(votedSecondary, "rmsConfigGeneral.transfer", "on Secondary Alarm");
    expect(secondaryTransfer.monitors.integral.secAlarm).toBe(true);
    expect(dmeTransferRequested(secondaryTransfer)).toBe(true);
  });

  it("uses manual integrity target formulas and downgrades failures when integrity is disabled", () => {
    const limit = cloneDefaultDmePmdtData().alarmLimits[0];
    expect(deriveIntegrityTestTargets(limit)).toEqual({ lowLow: 49.56, lowHigh: 49.64, highLow: 50.36, highHigh: 50.44 });

    const limited = change("alarmLimits.0.alarmHigh", 0.2);
    const alarmed = setDmeParameterValue(limited, "txConfigNominal.rtcParameters.replyDelayOffset", 0.3);
    expect(row(alarmed, "integral", "Delay")?.mon1Status).toBe("alarm");

    const downgraded = setDmeParameterValue(alarmed, "rmsConfigGeneral.monitorIntegrityTestsEnabled", false);
    expect(row(downgraded, "integral", "Delay")?.mon1Status).toBe("warning");
    expect(downgraded.monitors.integral.priAlarm).toBe(false);
    expect(downgraded.alert).toBe(true);
  });

  it("keeps SDES/LDES behavior deterministic and documents the manual equations", () => {
    expect(calculateLdesWindowUs(21)).toBe(269.56);
    expect(calculateLdesThresholdDbm(55)).toBe(-41.175);
    const ldes = change("txConfigNominal.operation.ldesEnabled", true);
    const rows = ldes.trafficLoad.find((item) => item.band === "LDES Triggers");
    expect(rows?.tx1 ?? 0).toBeGreaterThan(0);
    expect(ldes.trafficLoad.find((item) => item.band === "Total Replies")?.tx1 ?? 0).toBeLessThan(281);

    const sdes = change("txConfigNominal.operation.sdesEnabled", true);
    expect(sdes.trafficLoad.find((item) => item.band === "Total Replies")?.tx1 ?? 0).toBeLessThan(281);
  });

  it("preserves Apply -> Need Backup -> Backup and Restore/Reset semantics", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    store.getState().setParameterValue("rmsConfigStation.channelType", "Y");
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().needBackup).toBe(true);
    expect(store.getState().backupConfig()).toBe(true);
    expect(store.getState().needBackup).toBe(false);

    store.getState().setParameterValue("rmsConfigStation.channelType", "X");
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().restoreConfig()).toBe(true);
    expect(store.getState().data.rmsConfigStation.channelType).toBe("Y");
    expect(store.getState().needBackup).toBe(false);
  });
});
