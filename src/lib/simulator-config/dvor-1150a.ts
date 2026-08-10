import {
  cloneDvor1150aConfig,
  createDefaultDvor1150aConfig,
} from "@/lib/dvor1150a/defaults";
import type { Dvor1150aConfig } from "@/lib/dvor1150a/config-types";
import { hasSameJsonShape } from "./shape";
import {
  SIMULATOR_CONFIG_SCHEMA_VERSION,
  type Dvor1150aPersistedConfig,
  type SimulatorConfigAdapter,
} from "./types";

function normalizeRuntimeFields(config: Dvor1150aConfig): Dvor1150aPersistedConfig {
  const next = cloneDvor1150aConfig(config);
  const defaultConfig = createDefaultDvor1150aConfig();

  // Connection, Local/Remote, bypass and the displayed timestamp describe a
  // live PMDT session, not a user configuration profile.
  next.simulation = { ...defaultConfig.simulation };
  return next;
}
export function getDefaultDvor1150aConfig(): Dvor1150aPersistedConfig {
  return normalizeRuntimeFields(createDefaultDvor1150aConfig());
}

export function extractDvor1150aConfig(value: Dvor1150aConfig): Dvor1150aPersistedConfig {
  return normalizeRuntimeFields(value);
}

export function parseDvor1150aConfig(value: unknown): Dvor1150aPersistedConfig | null {
  const reference = getDefaultDvor1150aConfig();
  if (!hasSameJsonShape(value, reference)) return null;
  return normalizeRuntimeFields(value as Dvor1150aConfig);
}

export const dvor1150aConfigAdapter: SimulatorConfigAdapter<Dvor1150aPersistedConfig> = {
  simulatorId: "dvor-1150a",
  schemaVersion: SIMULATOR_CONFIG_SCHEMA_VERSION,
  getDefaultConfig: getDefaultDvor1150aConfig,
  extractConfig: (value) => extractDvor1150aConfig(value as Dvor1150aConfig),
  parseConfig: parseDvor1150aConfig,
};
