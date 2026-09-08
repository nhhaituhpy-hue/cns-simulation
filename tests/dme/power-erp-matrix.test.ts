import { describe, expect, it } from "vitest";
import { cloneDefaultDmePmdtData } from "@/lib/dme-pmdt-defaults";
import { recomputeDmeDerivedData } from "@/lib/dme1119a";
import { createDme320SimulationState } from "@/modules/operations/dme-320/domain/engine";
import { deriveDme320MonitorReadings } from "@/modules/operations/dme-320/domain/measurements";

describe("DME power and ERP matrix", () => {
  it("1119A follows HPA state and station power without changing the other TX", () => {
    const source = cloneDefaultDmePmdtData();
    const erp = (data: typeof source) => Number(recomputeDmeDerivedData(data).integralData.find((row) => row.label === "ERP")!.mon1Value);
    const baseline = erp(source);
    const disabled = structuredClone(source);
    disabled.txConfigNominal.powerAmplifiers.hpa1Enabled = false;
    expect(erp(disabled)).toBeCloseTo(baseline - 60, 1);
    const otherDisabled = structuredClone(source);
    otherDisabled.txConfigNominal.powerAmplifiers.hpa2Enabled = false;
    expect(erp(otherDisabled)).toBe(baseline);
    const low = structuredClone(source);
    low.rmsConfigStation.powerLevel = "Low Power";
    expect(erp(low)).toBeCloseTo(baseline - 10, 1);
  });

  it("1119A accepts zero standby monitor power scale independently", () => {
    const source = cloneDefaultDmePmdtData();
    source.monitorOffsets.monitor1.find((row) => row.parameter === "Tx Power Scale")!.standby = 0;
    source.monitorOffsets.monitor1.find((row) => row.parameter === "Tx Power Offset")!.standby = 0;
    const power = recomputeDmeDerivedData(source).standbyData.find((row) => row.label === "Tx Power")!;
    expect(Number(power.mon1Value)).toBe(0);
    expect(Number(power.mon2Value)).toBeGreaterThan(0);
  });

  it("320 follows station power and per-TX output with a fixed ERP reference", () => {
    const state = createDme320SimulationState();
    state.config.running.station.powerOutputWatts = 500;
    state.config.running.transmitters.tx1.outputPowerPercent = 50;
    const result = deriveDme320MonitorReadings(state, "mon1", "executive");
    expect(result.sourceTransponder).toBe("tx1");
    expect(result.readings.peakPowerWatts.value).toBe(250);
    expect(result.readings.erpDb.value).toBeCloseTo(10 * Math.log10(0.25));
  });

  it("320 faults cannot regenerate power after RF Off", () => {
    const state = createDme320SimulationState();
    state.transmitters.tx1.rfEnabled = false;
    state.faults.push({ id: "low-output", kind: "hpa-low-output", target: "tx1", active: true, injectedAtMs: 0 });
    const { readings } = deriveDme320MonitorReadings(state, "mon1", "executive");
    expect(readings.peakPowerWatts.value).toBe(0);
    expect(readings.replyEfficiencyPct.value).toBe(0);
    expect(readings.erpDb.value).toBe(-20);
    state.transmitters.tx1.dcPower = "off";
    const off = deriveDme320MonitorReadings(state, "mon1", "executive").readings;
    expect(off.peakPowerWatts.valid).toBe(false);
    expect(off.peakPowerWatts.value).toBeNull();
  });
});
