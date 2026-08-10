import { NOI_BAI_TRAINING_SENSOR } from "@/lib/sensor-data-presets";
import { TerminalEngine, type TerminalEnginePersistentState } from "@/lib/terminal-engine";
import {
  SIMULATOR_CONFIG_SCHEMA_VERSION,
  type AdsbPersistedConfig,
  type SimulatorConfigAdapter,
} from "./types";

function createDefaultAdsbEngine(): TerminalEngine {
  return new TerminalEngine({
    targetLoginUser: "sysadmin",
    sensorDataProfile: NOI_BAI_TRAINING_SENSOR,
  });
}

export function getDefaultAdsbConfig(): AdsbPersistedConfig {
  return createDefaultAdsbEngine().getPersistentState();
}

export function extractAdsbConfig(value: TerminalEnginePersistentState): AdsbPersistedConfig {
  return structuredClone(value);
}

export function parseAdsbConfig(value: unknown): AdsbPersistedConfig | null {
  try {
    const engine = createDefaultAdsbEngine();
    engine.restorePersistentState(value);
    return engine.getPersistentState();
  } catch {
    return null;
  }
}

export const adsbConfigAdapter: SimulatorConfigAdapter<AdsbPersistedConfig> = {
  simulatorId: "ads-b",
  schemaVersion: SIMULATOR_CONFIG_SCHEMA_VERSION,
  getDefaultConfig: getDefaultAdsbConfig,
  extractConfig: (value) => extractAdsbConfig(value as TerminalEnginePersistentState),
  parseConfig: parseAdsbConfig,
};
