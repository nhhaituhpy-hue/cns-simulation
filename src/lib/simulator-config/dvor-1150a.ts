import {
  cloneDvor1150aConfig,
  createDefaultDvor1150aConfig,
  withDvor1150aConfigExtensions,
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
  const compatible = withDvor1150aConfigExtensions(value);
  if (!hasSameJsonShape(compatible, reference)) return null;
  const config = compatible as Dvor1150aConfig;
  // Exact structure alone only checks primitive types, not enum membership.
  for (const id of ["tx1", "tx2"] as const) {
    const nominal = config.transmitters[id].nominal;
    if (!["Active High/Open", "Active Low/Closed"].includes(nominal.keyerInputLevel!) ||
      !["Disabled", "Enabled", "Windowed"].includes(nominal.externalKeying!)) return null;
  }
  if (!["Normal", "No Ident", "Continuous Ident"].includes(config.monitor.testGenerator!.identStatus)) return null;
  return normalizeRuntimeFields(config);
}

export const dvor1150aConfigAdapter: SimulatorConfigAdapter<Dvor1150aPersistedConfig> = {
  simulatorId: "dvor-1150a",
  schemaVersion: SIMULATOR_CONFIG_SCHEMA_VERSION,
  getDefaultConfig: getDefaultDvor1150aConfig,
  extractConfig: (value) => extractDvor1150aConfig(value as Dvor1150aConfig),
  parseConfig: parseDvor1150aConfig,
};
