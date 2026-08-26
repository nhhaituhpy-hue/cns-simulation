import { describe, expect, it } from "vitest";
import { reduceDvor220Command } from "@/modules/operations/dvor-220/domain/commands";
import {
  createDefaultDvor220Configuration,
  createInitialDvor220State,
} from "@/modules/operations/dvor-220/domain/defaults";
import {
  advanceDvor220Time,
  classifyDvor220Reading,
  deriveDvor220Snapshot,
} from "@/modules/operations/dvor-220/domain/engine";
import { createAuthorizedDvor220State } from "./helpers";

describe("MOPIENS DVOR 220 derivation engine", () => {
  it("derives a deterministic normal dual hot-standby system and all 48 antennas", () => {
    const state = createInitialDvor220State({ nowMs: 123 });
    const snapshot = deriveDvor220Snapshot(state);

    expect(snapshot.timestampMs).toBe(123);
    expect(snapshot.serviceStatus).toBe("normal");
    expect(snapshot.activeTransmitterId).toBe("tx1");
    expect(snapshot.transmitters.tx1).toMatchObject({ designation: "main", path: "antenna" });
    expect(snapshot.transmitters.tx2).toMatchObject({ designation: "standby", path: "load" });
    expect(snapshot.pdc.antennas).toHaveLength(48);
    expect(new Set(snapshot.pdc.antennas.map((antenna) => antenna.antenna))).toHaveLength(48);
    expect(snapshot.monitors.mon2.channels.standby).toMatchObject({
      enabled: false,
      status: "not-present",
    });
  });

  it("keeps Main/Standby designation independent from Antenna/Load routing", () => {
    const initial = createAuthorizedDvor220State();
    const result = reduceDvor220Command(initial, { type: "changeover" });
    const snapshot = deriveDvor220Snapshot(result.state);

    expect(result.ok).toBe(true);
    expect(snapshot.activeTransmitterId).toBe("tx2");
    expect(snapshot.transmitters.tx1).toMatchObject({ designation: "main", path: "load" });
    expect(snapshot.transmitters.tx2).toMatchObject({ designation: "standby", path: "antenna" });
  });

  it("removes the standby monitor channel with a single-equipment configuration", () => {
    const configuration = createDefaultDvor220Configuration();
    configuration.station.equipmentVersion = "single";
    configuration.station.bypassMonitorsOnBoot = false;
    configuration.monitor.channels.standby.executiveAction = true;
    const state = createInitialDvor220State({ configuration });

    const snapshot = deriveDvor220Snapshot(state);

    expect(snapshot.transmitters.tx2.path).toBe("disconnected");
    expect(snapshot.monitors.mon1.channels.standby).toMatchObject({
      enabled: false,
      status: "not-present",
      primaryAlarm: false,
    });
    expect(snapshot.executiveAlarm).toBe(false);
  });

  it("propagates disabled RF into monitor measurements and alarms", () => {
    let state = createAuthorizedDvor220State();
    state = reduceDvor220Command(state, {
      type: "set-monitor-bypass",
      bypass: false,
    }).state;
    state = reduceDvor220Command(state, {
      type: "set-rf-output",
      transmitterId: "tx1",
      output: "usbCos",
      on: false,
    }).state;
    const stabilizing = deriveDvor220Snapshot(state);

    expect(stabilizing.monitors.mon1.channels.cha).toMatchObject({
      stabilizing: true,
      sampleCount: 0,
      requiredSamples: 10,
      primaryAlarm: false,
    });

    state = advanceDvor220Time(state, 1_000);
    const snapshot = deriveDvor220Snapshot(state);

    expect(snapshot.monitors.mon1.channels.cha.readings.fmIndex).toMatchObject({
      value: 0,
      status: "alarm",
    });
    expect(snapshot.monitors.mon1.channels.cha.primaryAlarm).toBe(true);
    expect(snapshot.executiveAlarm).toBe(true);
  });

  it("couples carrier and sideband power to RF level and 9960 Hz modulation", () => {
    const reducedCarrier = createDefaultDvor220Configuration();
    reducedCarrier.monitor.measurementAverageCount = 2;
    reducedCarrier.transmitters.tx1.carrierScalePercent = 90;
    let state = createInitialDvor220State({ nowMs: 0, configuration: reducedCarrier });
    state = advanceDvor220Time(state, 200);
    let snapshot = deriveDvor220Snapshot(state);

    expect(snapshot.transmitters.tx1.forwardPowerW.carrier).toBe(90);
    expect(snapshot.monitors.mon1.channels.cha.readings.rfLevel.value).toBe(-0.48);
    expect(snapshot.monitors.mon1.channels.cha.readings.am9960Hz).toMatchObject({
      value: 31.62,
      status: "warning",
    });

    const trackedPower = createDefaultDvor220Configuration();
    trackedPower.monitor.measurementAverageCount = 2;
    trackedPower.transmitters.tx1.carrierScalePercent = 90;
    trackedPower.transmitters.tx1.sidebandPowerW = {
      usbCos: 0.9,
      usbSin: 0.9,
      lsbCos: 0.9,
      lsbSin: 0.9,
    };
    state = createInitialDvor220State({ nowMs: 0, configuration: trackedPower });
    state = advanceDvor220Time(state, 200);
    snapshot = deriveDvor220Snapshot(state);

    expect(snapshot.monitors.mon1.channels.cha.readings.am9960Hz).toMatchObject({
      value: 30,
      status: "normal",
    });
    expect(snapshot.monitors.mon2.channels.cha.readings.am9960Hz.value).toBe(30);
  });

  it("classifies transmitter and PDC power against the configured output limits", () => {
    const configuration = createDefaultDvor220Configuration();
    configuration.station.carrierPowerW = 130;
    configuration.transmitters.tx1.sidebandPowerW.usbCos = 0.5;
    const snapshot = deriveDvor220Snapshot(createInitialDvor220State({ configuration }));

    expect(snapshot.transmitters.tx1.forwardPowerW.carrier).toBe(130);
    expect(snapshot.transmitters.tx1.units.cma).toBe("alarm");
    expect(snapshot.transmitters.tx1.units.smaUsb).toBe("warning");
    expect(snapshot.transmitters.tx1.status).toBe("alarm");
    expect(snapshot.pdc.status).toBe("alarm");
  });

  it("propagates typed unit, PDC and antenna faults into their snapshots", () => {
    let state = createInitialDvor220State({ nowMs: 0 });
    state = reduceDvor220Command(state, {
      type: "inject-fault",
      fault: {
        id: "tx1-syn-warning",
        kind: "transmitter-unit",
        transmitterId: "tx1",
        unit: "syn",
        condition: "warning",
      },
    }).state;
    state = reduceDvor220Command(state, {
      type: "inject-fault",
      fault: { id: "pdc-unplugged", kind: "pdc", condition: "unplugged" },
    }).state;
    state = reduceDvor220Command(state, {
      type: "inject-fault",
      fault: { id: "antenna-9", kind: "antenna-vswr", antenna: 9, usbVswr: 3.1 },
    }).state;
    const snapshot = deriveDvor220Snapshot(state);

    expect(snapshot.transmitters.tx1.units.syn).toBe("warning");
    expect(snapshot.pdc.status).toBe("unplugged");
    expect(snapshot.pdc.antennas[8]).toMatchObject({ antenna: 9, usbVswr: 3.1, status: "alarm" });
  });

  it("uses distinct normal, warning and alarm boundaries", () => {
    const band = {
      lowerAlarm: 10,
      lowerWarning: 20,
      nominal: 50,
      upperWarning: 80,
      upperAlarm: 90,
      severity: "primary" as const,
    };

    expect(classifyDvor220Reading(50, band)).toBe("normal");
    expect(classifyDvor220Reading(19, band)).toBe("warning");
    expect(classifyDvor220Reading(10, band)).toBe("alarm");
    expect(classifyDvor220Reading(81, band)).toBe("warning");
    expect(classifyDvor220Reading(90, band)).toBe("alarm");
  });
});
