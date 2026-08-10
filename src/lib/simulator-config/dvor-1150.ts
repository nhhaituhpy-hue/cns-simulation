import {
  cloneDvor1150Config,
  createDefaultDvor1150Config,
} from "@/lib/dvor1150/defaults";
import type { Dvor1150Config } from "@/lib/dvor1150/types";
import { hasSameJsonShape } from "./shape";
import {
  SIMULATOR_CONFIG_SCHEMA_VERSION,
  type Dvor1150PersistedConfig,
  type SimulatorConfigAdapter,
} from "./types";

function normalizeRuntimeFields(config: Dvor1150Config): Dvor1150PersistedConfig {
  const next = cloneDvor1150Config(config);
  const defaultConfig = createDefaultDvor1150Config();

  // Connection, login, Local/Bypass and the clock belong to the live PMDT
  // session. They must not leak into a user's saved station configuration.
  next.simulation = { ...defaultConfig.simulation };
  return next;
}

export function getDefaultDvor1150Config(): Dvor1150PersistedConfig {
  return normalizeRuntimeFields(createDefaultDvor1150Config());
}

export function extractDvor1150Config(value: Dvor1150Config): Dvor1150PersistedConfig {
  return normalizeRuntimeFields(value);
}

export function parseDvor1150Config(value: unknown): Dvor1150PersistedConfig | null {
  const reference = getDefaultDvor1150Config();
  if (!hasSameJsonShape(value, reference)) return null;
  return normalizeRuntimeFields(value as Dvor1150Config);
}

export const dvor1150ConfigAdapter: SimulatorConfigAdapter<Dvor1150PersistedConfig> = {
  simulatorId: "dvor-1150",
  schemaVersion: SIMULATOR_CONFIG_SCHEMA_VERSION,
  getDefaultConfig: getDefaultDvor1150Config,
  extractConfig: (value) => extractDvor1150Config(value as Dvor1150Config),
  parseConfig: parseDvor1150Config,
};
