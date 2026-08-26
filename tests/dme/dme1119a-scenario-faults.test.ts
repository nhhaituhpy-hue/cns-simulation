import { describe, expect, it } from "vitest";
import {
  cloneDefaultDmePmdtData,
  createDefaultDme1119aSimulationFaults,
} from "@/lib/dme-pmdt-defaults";
import { recomputeDmeDerivedData } from "@/lib/dme1119a/derived-data";
import {
  extractDme1119aConfig,
  hydrateDme1119aData,
} from "@/lib/simulator-config/dme-1119a";

function row(data: ReturnType<typeof cloneDefaultDmePmdtData>, label: string) {
  return data.integralData.find((candidate) => candidate.label === label);
}

describe("DME 1119A Scenario fault stimuli", () => {
  it("keeps session-only simulation faults outside persisted configuration", () => {
    const data = cloneDefaultDmePmdtData();
    data.simulationFaults.transmitters.tx1.powerLossDb = 6;

    expect(extractDme1119aConfig(data)).not.toHaveProperty("simulationFaults");
    expect(hydrateDme1119aData(extractDme1119aConfig(data)).simulationFaults)
      .toEqual(createDefaultDme1119aSimulationFaults());
  });

  it("reduces TX1 measured power without changing the configured alarm limit", () => {
    const data = cloneDefaultDmePmdtData();
    const normal = recomputeDmeDerivedData(data);
    const normalPower = row(normal, "Tx Power")?.mon1Value;
    const normalLimit = normal.alarmLimits.find((candidate) => candidate.parameter === "Tx Power");

    data.simulationFaults.transmitters.tx1.powerLossDb = 6;
    const faulted = recomputeDmeDerivedData(data);

    expect(Number(row(faulted, "Tx Power")?.mon1Value)).toBeLessThan(Number(normalPower));
    expect(faulted.alarmLimits.find((candidate) => candidate.parameter === "Tx Power")).toEqual(normalLimit);
  });

  it("applies delay and spacing drift to the transmitter path represented by each monitor view", () => {
    const data = cloneDefaultDmePmdtData();
    data.simulationFaults.transmitters.tx1.replyDelayDriftUs = 0.6;
    data.simulationFaults.transmitters.tx2.pulseSpacingDriftUs = 0.8;

    const faulted = recomputeDmeDerivedData(data);
    const delay = row(faulted, "Delay");
    const spacing = row(faulted, "Spacing");
    const standbyDelay = faulted.standbyData.find((candidate) => candidate.label === "Delay");
    const standbySpacing = faulted.standbyData.find((candidate) => candidate.label === "Spacing");

    expect(Number(delay?.mon1Value)).toBeGreaterThan(50);
    expect(Number(standbyDelay?.mon1Value)).toBeCloseTo(50, 1);
    expect(Number(spacing?.mon1Value)).toBeCloseTo(12, 1);
    expect(Number(standbySpacing?.mon1Value)).toBeGreaterThan(12);
  });

  it("raises frequency error and classifies the result through existing limits", () => {
    const data = cloneDefaultDmePmdtData();
    data.simulationFaults.transmitters.tx1.frequencyErrorPpm = 40;

    const faulted = recomputeDmeDerivedData(data);
    const frequencyError = row(faulted, "Tx Frequency Error");

    expect(Number(frequencyError?.mon1Value)).toBeGreaterThan(20);
    expect(frequencyError?.mon1Status).toBe("alarm");
  });

  it("reports HPA and RTC communication faults on the affected transmitter", () => {
    const data = cloneDefaultDmePmdtData();
    data.simulationFaults.transmitters.tx1.hpaFault = true;
    data.simulationFaults.transmitters.tx2.rtcCommFault = true;

    const faulted = recomputeDmeDerivedData(data);

    expect(faulted.txStatus.maintenanceAlert.tx1).toBe(true);
    expect(faulted.rtcStatus.commFault.tx2).toBe(true);
    expect(faulted.rtcMaintenanceAlerts.find((item) => item.label === "Monitor Comm Fault")?.tx2).toBe("red");
  });

  it("uses physical antenna VSWR independently of calibration offset", () => {
    const data = cloneDefaultDmePmdtData();
    data.simulationFaults.transmitters.tx1.antennaVswr = 4.5;

    const faulted = recomputeDmeDerivedData(data);
    const vswr = row(faulted, "VSWR");

    expect(Number(vswr?.mon1Value)).toBeCloseTo(4.5, 1);
    expect(vswr?.mon1Status).toBe("alarm");
  });

  it("exposes missing Ident as an alarm according to the configured keyer policy", () => {
    const data = cloneDefaultDmePmdtData();
    data.simulationFaults.identSignal = "missing";

    const faulted = recomputeDmeDerivedData(data);
    const ident = row(faulted, "Ident Status");

    expect(ident?.mon1Status).toBe("red");
  });

  it("propagates temperature and AC failure to facility monitoring", () => {
    const data = cloneDefaultDmePmdtData();
    data.simulationFaults.temperature["HPA #1 Temperature"] = 95;
    data.simulationFaults.acPowerFailed = true;

    const faulted = recomputeDmeDerivedData(data);

    expect(faulted.rmsStatus.acFailure).toBe(true);
    expect(faulted.rmsStatus.onBattery).toBe(true);
    expect(faulted.rmsTemperatureData.find((item) => item.parameter === "HPA #1 Temperature")?.value).toBe(95);
    expect(faulted.rmsStatus.maintenanceAlert).toBe(true);
  });
});
