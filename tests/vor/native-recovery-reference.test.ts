// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildDvor1150aSnapshot, createDefaultDvor1150aConfig, createLowCarrierAnd9960Scenario, previewDvor1150aScenario } from "@/lib/dvor1150a";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { selexParameterAdapter } from "@/lib/ai/scenario-generation/parameter-selex";

function recoveredStore(outputPower: number) {
  const definition = createLowCarrierAnd9960Scenario();
  const preview = previewDvor1150aScenario(definition);
  const store = createVorPmdtStore();
  store.setState({ mode: "student", config: preview.config, configDraft: structuredClone(preview.config), derived: preview.snapshot, data: preview.snapshot.data,
    scenario: { active: true, definition, startedAt: null }, securityLevel: 3, loginDialogOpen: false });
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", outputPower);
  expect(store.getState().applyConfigChanges()).toBe(true);
  store.getState().setConfigValue("simulation.integralMonitorBypass", false);
  return store.getState();
}

describe("DVOR1150A legacy RF recovery reference", () => {
  it("restores the existing 70 W training reference through real Apply and bypass release", () => {
    const state = recoveredStore(createDefaultDvor1150aConfig().transmitters.tx1.nominal.outputPower);
    expect(state.config.simulation.integralMonitorBypass).toBe(false);
    expect(state.derived.voting.activeTransmitter).toBe("tx1");
    expect(state.derived.voting.systemHealthy).toBe(true);
    for (const monitor of Object.values(state.derived.monitors)) {
      expect(monitor.healthy).toBe(true);
      expect(monitor.parameters.hz9960Modulation.value).toBeCloseTo(29.6);
      expect(monitor.parameters.txPower.value).toBeCloseTo(70.8);
    }
  });

  it("does not accept 125 W as recovery when both CCAs still see over-limit modulation and power", () => {
    const config = createDefaultDvor1150aConfig();
    config.transmitters.tx1.nominal.outputPower = 125;
    const snapshot = buildDvor1150aSnapshot(config);
    for (const monitor of Object.values(snapshot.monitors)) {
      expect(monitor.parameters.hz9960Modulation.value).toBeGreaterThan(config.monitor.alarmLimits.hz9960Modulation.alarmHigh);
      expect(monitor.parameters.hz9960Modulation.status).toBe("alarm");
      expect(monitor.parameters.txPower.value).toBeGreaterThan(config.monitor.alarmLimits.txPower.alarmHigh);
      expect(monitor.parameters.txPower.status).toBe("alarm");
    }
    expect(snapshot.voting.systemHealthy).toBe(false);
    const definition = createLowCarrierAnd9960Scenario();
    expect(() => selexParameterAdapter.verify("dvor-1150a", definition, [
      { fieldId: "configuration.transmitters.tx1.nominal.outputPower", value: 125 },
      { fieldId: "startPolicy.startMonitorBypassed", value: false },
    ])).toThrow(expect.objectContaining({ code: "INVALID_RECOVERY" }));
  });
});
