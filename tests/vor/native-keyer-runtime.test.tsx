import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildDvor1150aSnapshot, createDefaultDvor1150aConfig, createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a";
import { TxConfigNominal } from "@/components/vor/screens/tx-config-nominal";
import { TxDataMain } from "@/components/vor/screens/tx-data-main";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import type { DvorKeyerObservations } from "@/lib/dvor1150a/config-types";
import { extractDvor1150aConfig, parseDvor1150aConfig } from "@/lib/simulator-config/dvor-1150a";

beforeEach(() => useVorPmdtStore.getState().reset());
afterEach(cleanup);

describe("native keyer explicit runtime observation", () => {
  it("feeds observed external contact and decoded ident to the native engine without changing RF/MON", () => {
    const config = createDefaultDvor1150aConfig();
    config.transmitters.tx1.nominal.keyerMode = "external";
    const before = buildDvor1150aSnapshot(config);
    const after = buildDvor1150aSnapshot(config, undefined, undefined, {
      tx1: { externalSignal: { state: "present", level: "low/closed", decodedIdentCode: "AB12" } },
    });
    expect(after.keyers.tx1).toMatchObject({ externalSignalStatus: "present", inputAsserted: true,
      effectiveIdentCode: "AB12", identStatus: "external-keyed" });
    expect(after.keyers.tx2).toEqual(before.keyers.tx2);
    expect(after.effectiveTransmitters).toEqual(before.effectiveTransmitters);
    expect(after.monitors).toEqual(before.monitors);
    expect(after.voting).toEqual(before.voting);
    expect(before.keyers.tx1.externalSignalStatus).toBe("unspecified");
  });

  it("keeps instructor observations across native draft/Apply and exposes every meaningful digital result", () => {
    const store = useVorPmdtStore;
    store.getState().login("SEC3", "THREE");
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    store.getState().setScenarioAuthoringEnabled(true);
    // Assert the missing public seam rather than failing on a missing-method TypeError.
    expect(store.getState().setKeyerObservation).toBeTypeOf("function");
    act(() => { expect(store.getState().setKeyerObservation("tx1", {
      externalSignal: { state: "present", level: "high/open", decodedIdentCode: "AB12" },
    })).toBe(true); });
    const before = store.getState();
    render(<><TxConfigNominal /><TxDataMain /></>);
    fireEvent.click(screen.getByRole("radio", { name: "External Keying" }));
    fireEvent.change(screen.getByLabelText("Keyer Input Level"), { target: { value: "Active High/Open" } });
    expect(store.getState().config).toBe(before.config);
    expect(store.getState().derived).toBe(before.derived);
    act(() => { expect(store.getState().applyConfigChanges()).toBe(true); });
    expect(store.getState().derived.keyers.tx1).toMatchObject({ externalSignalStatus: "present", inputAsserted: true, effectiveIdentCode: "AB12" });
    expect(document.querySelector('[data-vor-field-id="keyerData.tx1.inputAsserted"]')).toHaveTextContent("true");
    expect(document.querySelector('[data-vor-field-id="keyerData.tx1.effectiveIdentCode"]')).toHaveTextContent("AB12");
    expect(store.getState().derived.monitors).toEqual(before.derived.monitors);
    expect(store.getState().derived.effectiveTransmitters).toEqual(before.derived.effectiveTransmitters);
  });

  it("offers explicit production instructor stimulus controls but never student controls", () => {
    const store = useVorPmdtStore;
    store.getState().setScenarioAuthoringEnabled(true);
    render(<TxDataMain />);
    const signal = screen.getByLabelText("TX1 observed external signal");
    fireEvent.change(signal, { target: { value: "present" } });
    expect(store.getState().keyerObservations?.tx1?.externalSignal).toEqual({ state: "present", level: "high/open" });
    fireEvent.change(screen.getByLabelText("TX1 observed contact"), { target: { value: "low/closed" } });
    fireEvent.change(screen.getByLabelText("TX1 observed decoded ident"), { target: { value: "Q12" } });
    fireEvent.change(screen.getByLabelText("TX1 observed shutdown cause"), { target: { value: "keying-loss" } });
    expect(store.getState().keyerObservations?.tx1).toEqual({ externalSignal: { state: "present", level: "low/closed", decodedIdentCode: "Q12" }, shutdownCause: "keying-loss" });
    act(() => store.getState().setMode("student"));
    expect(screen.queryByLabelText("TX1 observed external signal")).not.toBeInTheDocument();
    expect(store.getState().setKeyerObservation("tx1", { externalSignal: { state: "lost" } })).toBe(false);
  });

  it.each([
    ["External Keying", "external", { externalSignal: { state: "present", level: "high/open", decodedIdentCode: "EXT" } }, { identStatus: "external-keyed" }],
    ["Keyer Input Level", "Active High/Open", { externalSignal: { state: "present", level: "high/open" } }, { inputAsserted: true }],
    ["Windowed Keying Input", true, { externalSignal: { state: "present", level: "low/closed" } }, { inputInterpretation: "windowed-keying" }],
    ["Self-Key on Loss of Keying Signal", true, { externalSignal: { state: "lost" } }, { selfKeyRequested: true, effectiveIdentCode: "TST" }],
    ["Shutdown on Loss of Keyed Signal", true, { externalSignal: { state: "lost" } }, { shutdownRequested: true }],
    ["Restart when Keying Signal Resumes", true, { externalSignal: { state: "resumed", level: "low/closed" }, shutdownCause: "keying-loss" }, { restartRequested: true, identStatus: "shutdown" }],
    ["External Keying output", "Enabled", {}, { externalOutput: { mode: "Enabled", available: true, suppressed: false } }],
    ["External Keying output", "Windowed", {}, { externalOutput: { mode: "Windowed", available: true, suppressed: false } }],
    ["Suppress External Keyer on Shutdown", true, { shutdownCause: "other" }, { externalOutput: { mode: "Enabled", available: false, suppressed: true } }],
  ] as const)("native %s stages then Applies its conditional result", (label, value, observation, expected) => {
    const store = useVorPmdtStore;
    const config = createDefaultDvor1150aConfig();
    for (const tx of Object.values(config.transmitters)) {
      tx.nominal.keyerMode = label === "External Keying" ? "disabled" : "external";
      tx.nominal.externalKeying = label === "Suppress External Keyer on Shutdown" ? "Enabled" : "Disabled";
    }
    store.getState().replaceConfig(config);
    store.getState().login("SEC3", "THREE");
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    store.getState().setScenarioAuthoringEnabled(true);
    expect(store.getState().setKeyerObservation("tx1", observation)).toBe(true);
    const before = store.getState();
    render(<><TxConfigNominal /><TxDataMain /></>);
    const control = label === "External Keying" ? screen.getByRole("radio", { name: label }) : screen.getByLabelText(label);
    if (typeof value === "boolean" || label === "External Keying") fireEvent.click(control);
    else fireEvent.change(control, { target: { value } });
    expect(store.getState().config).toBe(before.config);
    expect(store.getState().derived).toBe(before.derived);
    act(() => { expect(store.getState().applyConfigChanges()).toBe(true); });
    const after = store.getState();
    expect(after.derived.keyers.tx1).toMatchObject(expected);
    expect(after.config.transmitters.tx2.nominal).toEqual(after.config.transmitters.tx1.nominal);
    expect(after.derived.effectiveTransmitters).toEqual(before.derived.effectiveTransmitters);
    expect(after.derived.monitors).toEqual(before.derived.monitors);
    expect(after.derived.voting).toEqual(before.derived.voting);
    for (const [key, result] of Object.entries(expected)) {
      if (key === "externalOutput") for (const [field, output] of Object.entries(result as object)) {
        expect(document.querySelector(`[data-vor-field-id="keyerData.tx1.externalOutput.${field}"]`)).toHaveTextContent(String(output));
      } else expect(document.querySelector(`[data-vor-field-id="keyerData.tx1.${key}"]`)).toHaveTextContent(String(result));
    }
  });

  it.each(["new-scenario", "restart", "restore", "apply-scenario"] as const)(
    "%s clears both transmitters' previous keyer observations and their mounted digital readouts atomically",
    transition => {
      const store = useVorPmdtStore;
      const definition = createDefaultDvor1150aScenarioDefinition();
      definition.id = "keyer-previous-run";
      definition.startPolicy.startLocal = true;
      definition.startPolicy.startMonitorBypassed = true;
      for (const tx of Object.values(definition.configuration.transmitters)) Object.assign(tx.nominal, {
        keyerMode: "external", shutdownOnLoss: true, restartWhenResumed: true,
        externalKeying: "Enabled", suppressOnShutdown: true,
      });
      store.getState().setScenarioAuthoringEnabled(true);
      expect(store.getState().startReviewScenario(definition)).toBe(true);
      store.getState().setMode("preview");
      expect(store.getState().setKeyerObservation("tx1", { externalSignal: { state: "lost" } })).toBe(true);
      expect(store.getState().setKeyerObservation("tx2", {
        externalSignal: { state: "resumed", level: "low/closed", decodedIdentCode: "OLD" },
        shutdownCause: "keying-loss",
      })).toBe(true);
      expect(store.getState().derived.keyers.tx1.shutdownRequested).toBe(true);
      expect(store.getState().derived.keyers.tx2.restartRequested).toBe(true);
      const before = store.getState();
      render(<TxDataMain />);
      const seen: { observations: DvorKeyerObservations | undefined; tx1Shutdown: boolean; tx2Restart: boolean }[] = [];
      const unsubscribe = store.subscribe(state => seen.push({
        observations: state.keyerObservations,
        tx1Shutdown: state.derived.keyers.tx1.shutdownRequested,
        tx2Restart: state.derived.keyers.tx2.restartRequested,
      }));
      const target = structuredClone(definition);
      if (transition === "new-scenario") target.id = "keyer-new-run";
      try {
        act(() => {
          if (transition === "restore") expect(store.getState().restoreScenario()).toBe(true);
          else if (transition === "apply-scenario") {
            store.getState().replaceScenarioDraft(target);
            seen.length = 0;
            expect(store.getState().applyScenario()).toBe(true);
          } else expect(store.getState().startReviewScenario(target)).toBe(true);
        });
      } finally { unsubscribe(); }
      const after = store.getState();
      expect(after.keyerObservations).toBeUndefined();
      if (transition === "restore" || transition === "apply-scenario") {
        expect(screen.getByLabelText("TX2 observed decoded ident")).toHaveValue("");
        expect(screen.getByLabelText("TX2 observed external signal")).toHaveValue("unspecified");
        expect(screen.getByLabelText("TX2 observed shutdown cause")).toHaveValue("unspecified");
      }
      expect(seen.length).toBeGreaterThan(0);
      expect(seen.every(state => state.observations === undefined && !state.tx1Shutdown && !state.tx2Restart)).toBe(true);
      expect(after.scenario.runId).not.toBe(before.scenario.runId);
      const expected = buildDvor1150aSnapshot(after.config, undefined, after.derived.mainTransmitter ?? undefined);
      expect(after.derived).toEqual(expected);
      expect(after.derived.monitors).toEqual(before.derived.monitors);
      expect(after.derived.effectiveTransmitters).toEqual(before.derived.effectiveTransmitters);
      for (const id of ["tx1", "tx2"] as const) {
        expect(document.querySelector(`[data-vor-field-id="keyerData.${id}.externalSignalStatus"]`)).toHaveTextContent("unspecified");
        expect(document.querySelector(`[data-vor-field-id="keyerData.${id}.shutdownRequested"]`)).toHaveTextContent("false");
        expect(document.querySelector(`[data-vor-field-id="keyerData.${id}.restartRequested"]`)).toHaveTextContent("false");
      }
      expect(extractDvor1150aConfig(after.config)).not.toHaveProperty("keyerObservations");
      expect(target).toEqual({ ...definition, id: target.id });
    },
  );

  it("rejects malformed runtime input, keeps old profiles strict, and clears observations on reset", () => {
    const store = useVorPmdtStore;
    expect(store.getState().setKeyerObservation("tx1", {})).toBe(false);
    store.getState().setScenarioAuthoringEnabled(true);
    const bad = { externalSignal: { state: "present", level: "low/closed", decodedIdentCode: 42 } } as unknown as DvorKeyerObservations["tx1"];
    expect(store.getState().setKeyerObservation("tx1", bad)).toBe(false);
    expect(store.getState().setKeyerObservation("tx1", { externalSignal: { state: "lost" } })).toBe(true);
    expect(extractDvor1150aConfig(store.getState().config)).not.toHaveProperty("keyerObservations");
    expect(parseDvor1150aConfig(store.getState().config)).not.toBeNull();
    expect(parseDvor1150aConfig({ ...store.getState().config, inventedField: true })).toBeNull();
    store.getState().reset();
    expect(store.getState().keyerObservations).toBeUndefined();
  });

  it("retains explicit request semantics through native route changes and never restarts RF", () => {
    const store = useVorPmdtStore;
    const config = createDefaultDvor1150aConfig();
    for (const tx of Object.values(config.transmitters)) Object.assign(tx.nominal, {
      keyerMode: "external", selfKeyOnLoss: true, shutdownOnLoss: true, restartWhenResumed: true,
      externalKeying: "Enabled", suppressOnShutdown: true,
    });
    store.getState().replaceConfig(config);
    store.getState().setScenarioAuthoringEnabled(true);
    store.getState().login("SEC3", "THREE");
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    const before = store.getState();
    expect(store.getState().setKeyerObservation("tx1", { externalSignal: { state: "lost" } })).toBe(true);
    expect(store.getState().derived.keyers.tx1).toMatchObject({ lossActionConflict: true, selfKeyRequested: true, shutdownRequested: true, effectiveIdentCode: null });
    expect(store.getState().config).toBe(before.config);
    expect(store.getState().setKeyerObservation("tx1", { externalSignal: { state: "resumed", level: "high/open" }, shutdownCause: "other" })).toBe(true);
    expect(store.getState().derived.keyers.tx1.restartRequested).toBe(false);
    expect(store.getState().setTransmitterMode("tx1", "off")).toBe(true);
    const off = store.getState().config;
    const offMeasurements = store.getState().derived.effectiveTransmitters;
    expect(store.getState().setKeyerObservation("tx1", { externalSignal: { state: "resumed", level: "high/open" }, shutdownCause: "keying-loss" })).toBe(true);
    expect(store.getState().derived.keyers.tx1).toMatchObject({ restartRequested: true, identStatus: "shutdown" });
    expect(store.getState().config).toBe(off);
    expect(store.getState().derived.effectiveTransmitters.tx1.onAir).toBe(false);
    expect(store.getState().derived.effectiveTransmitters).toEqual(offMeasurements);
    expect(store.getState().setKeyerObservation("tx1", undefined)).toBe(true);
    expect(store.getState().keyerObservations?.tx1).toBeUndefined();
  });

  it.each(["main", "standby"] as const)("native ident %s control changes the corresponding logical-role data only after Apply", role => {
    const store = useVorPmdtStore;
    const config = createDefaultDvor1150aConfig();
    store.getState().replaceConfig(config);
    store.getState().login("SEC3", "THREE");
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    const before = store.getState();
    render(<><TxConfigNominal /><TxDataMain /></>);
    const field = role === "main" ? "mainIdentCode" : "standbyIdentCode";
    fireEvent.change(screen.getByLabelText(`txConfigNominal.ident.${field}`), { target: { value: role === "main" ? "AB12" : "Different Ident" } });
    expect(store.getState().config).toBe(before.config);
    expect(store.getState().derived).toBe(before.derived);
    act(() => { expect(store.getState().applyConfigChanges()).toBe(true); });
    if (role === "main") {
      expect(store.getState().derived.keyers.tx1.effectiveIdentCode).toBe("AB12");
      expect(store.getState().derived.keyers.tx2.effectiveIdentCode).toBe("AB12");
    } else {
      expect(store.getState().derived.keyers.tx1.effectiveIdentCode).toBe("TST");
      expect(store.getState().derived.keyers.tx2).toMatchObject({ effectiveIdentCode: null, identStatus: "standby-code-unspecified" });
    }
    expect(store.getState().derived.data.txPower).toEqual(before.derived.data.txPower);
    const expectedMonitors = structuredClone(before.derived.monitors);
    if (role === "main") for (const monitor of Object.values(expectedMonitors)) monitor.parameters.identCode.value = "AB12";
    expect(store.getState().derived.monitors).toEqual(expectedMonitors);
  });

  it("selects standby ident by logical Main instead of permanently treating physical TX2 as standby", () => {
    const config = createDefaultDvor1150aConfig();
    for (const tx of Object.values(config.transmitters)) tx.nominal.standbyIdentCode = "Different Ident";
    const snapshot = buildDvor1150aSnapshot(config, undefined, "tx2");
    expect(snapshot.keyers.tx2).toMatchObject({ selectedIdentCode: "TST", effectiveIdentCode: "TST" });
    expect(snapshot.keyers.tx1).toMatchObject({ selectedIdentCode: null, identStatus: "standby-code-unspecified" });
  });
});
