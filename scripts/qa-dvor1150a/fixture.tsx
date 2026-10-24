import React from "react";
import { createRoot } from "react-dom/client";
import { PmdtLayout } from "../../src/components/vor/pmdt-layout";
import { useVorPmdtStore } from "../../src/stores/vor-pmdt-store";
import {
  createDefaultDvor1150aConfig, buildDvor1150aSnapshot,
  createDefaultDvor1150aScenarioDefinition, evaluateDvor1150aScenario,
} from "../../src/lib/dvor1150a";

declare global { interface Window { __DVOR1150A_QA__: Readonly<{ isolated: boolean; authShim: string; persistence: string; snapshot: typeof snapshot; resetFixture: typeof resetFixture }> } }

// FIXTURE ONLY: no app auth, cookies, server sessions, or simulatorId prop.
// The only writer exposed to automation resets a complete synthetic fixture.
// All exercised configuration edits must go through rendered input handlers.
const allowedProfiles = new Set(["normal", "guest", "remote", "locked", "allowed", "asymmetric-mirror-lock"]);
function resetFixture(options: { profile?: string; activeTx?: "tx1" | "tx2"; loadTx?: "tx1" | "tx2"; noOnAir?: boolean; keyerObservations?: ReturnType<typeof useVorPmdtStore.getState>["keyerObservations"]; seeds?: Record<string, unknown> } = {}) {
  const profile = options.profile ?? "normal";
  if (!allowedProfiles.has(profile)) throw new Error("Unknown fixture profile");
  const state = useVorPmdtStore.getState();
  state.reset();
  const config = createDefaultDvor1150aConfig();
  config.simulation.connected = true;
  config.simulation.local = profile !== "remote";
  config.simulation.integralMonitorBypass = profile !== "remote";
  config.simulation.timestamp = "10/24/2026 12:00:00";
  const active = options.activeTx ?? "tx1";
  const load = options.loadTx;
  for (const tx of ["tx1", "tx2"] as const) {
    config.transmitters[tx].enabled = true;
    config.transmitters[tx].onAir = !options.noOnAir && tx === active;
    config.transmitters[tx].load = tx === load;
  }
  // Fixture seeds are a separate initial-state channel, never a tested edit.
  for (const [path, value] of Object.entries(options.seeds ?? {})) {
    if (!/^(monitor\.(rawMeasurements|calibration|routing|alarmLimits|antennas)|transmitters\.tx[12]\.(nominal|offsets))\./.test(path)) throw new Error(`Unapproved fixture seed: ${path}`);
    const keys = path.split(".");
    let target: Record<string, unknown> = config as unknown as Record<string, unknown>;
    for (const key of keys.slice(0, -1)) {
      if (!target[key] || typeof target[key] !== "object") throw new Error(`Unknown fixture path: ${path}`);
      target = target[key] as Record<string, unknown>;
    }
    if (!(keys.at(-1)! in target)) throw new Error(`Unknown fixture leaf: ${path}`);
    target[keys.at(-1)!] = value;
  }
  const derived = buildDvor1150aSnapshot(config, undefined, active, options.keyerObservations);
  const definition = createDefaultDvor1150aScenarioDefinition();
  definition.id = "isolated-browser-fixture";
  definition.name = "Isolated configuration fixture";
  definition.configuration = structuredClone(config);
  definition.startPolicy.startLocal = config.simulation.local;
  definition.startPolicy.startMonitorBypassed = config.simulation.integralMonitorBypass;
  definition.startPolicy.mainTransmitterId = active;
  definition.studentEditableFieldIds = profile === "allowed" || profile === "asymmetric-mirror-lock"
    ? ["transmitters.tx1.nominal.outputPower", ...(profile === "allowed" ? ["transmitters.tx2.nominal.outputPower"] : [])] : [];
  definition.editPolicy = ["locked", "allowed", "asymmetric-mirror-lock"].includes(profile) ? { mode: "restricted", allowedFieldIds: [...definition.studentEditableFieldIds] } : { mode: "open" };
  useVorPmdtStore.setState({
    keyerObservations: options.keyerObservations,
    config, configDraft: structuredClone(config), configurationBackup: structuredClone(config),
    configDirty: false, needBackup: false, derived, data: derived.data,
    securityLevel: profile === "guest" ? 0 : 4,
    authenticatedUserId: "QA_FIXTURE_NOT_WEB_AUTH", loginDialogOpen: false,
    scenario: { active: ["locked", "allowed", "asymmetric-mirror-lock"].includes(profile), definition, startedAt: null },
    scenarioDraft: definition, scenarioParametersOpen: false, scenarioAuthoringEnabled: true,
    activeScreen: "home", activeView: "home", activeMenuPath: ["Home"],
    // Deliberately no identity/session key: scenario evidence cannot persist.
    scenarioId: null, sessionKey: null, userId: "", mode: "preview",
  });
  return snapshot();
}
function snapshot() {
  const state = useVorPmdtStore.getState();
  return structuredClone({
    config: state.config, configDraft: state.configDraft, configDirty: state.configDirty, keyerObservations: state.keyerObservations,
    needBackup: state.needBackup, data: state.data, derived: state.derived,
    securityLevel: state.securityLevel, activeScreen: state.activeScreen, activeView: state.activeView,
    scenario: state.scenario, scenarioDraft: state.scenarioDraft, lastCommand: state.lastCommand,
    evaluation: state.scenario.active ? evaluateDvor1150aScenario(state.scenario, state.derived, state.config) : null,
  });
}
resetFixture();
Object.defineProperty(window, "__DVOR1150A_QA__", { configurable: false, value: Object.freeze({
  isolated: true, authShim: "initial synthetic store state only; no production auth tested",
  persistence: "simulatorId omitted; no session key; no server writes permitted",
  snapshot, resetFixture,
}) });
createRoot(document.getElementById("root")!).render(
  <div className="pmdt-classic-page dvor1150a-pmdt-page">
    <PmdtLayout mode="preview" scenarioAuthoringEnabled />
  </div>,
);
