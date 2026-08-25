import {
  cloneDvor220,
  createDefaultDvor220Configuration,
} from "@/modules/operations/dvor-220/domain/defaults";
import type { Dvor220Configuration } from "@/modules/operations/dvor-220/domain/types";
import { validateDvor220Configuration } from "@/modules/operations/dvor-220/domain/validation";
import { hasSameJsonShape } from "./shape";
import {
  SIMULATOR_CONFIG_SCHEMA_VERSION,
  type Dvor220PersistedConfig,
  type SimulatorConfigAdapter,
} from "./types";

export function getDefaultDvor220Config(): Dvor220PersistedConfig {
  return cloneDvor220(createDefaultDvor220Configuration());
}

export function extractDvor220Config(value: Dvor220Configuration): Dvor220PersistedConfig {
  return cloneDvor220(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function migrateLegacyDvor220Config(value: unknown): unknown {
  const candidate = cloneDvor220(value);
  if (!isRecord(candidate) || !isRecord(candidate.transmitters)) return candidate;
  for (const transmitterId of ["tx1", "tx2"] as const) {
    const transmitter = candidate.transmitters[transmitterId];
    if (isRecord(transmitter) && !Object.hasOwn(transmitter, "trackingEnabled")) {
      transmitter.trackingEnabled = false;
    }
  }
  return candidate;
}

export function parseDvor220Config(value: unknown): Dvor220PersistedConfig | null {
  const migrated = migrateLegacyDvor220Config(value);
  if (!hasSameJsonShape(migrated, getDefaultDvor220Config())) return null;
  const config = cloneDvor220(migrated as Dvor220Configuration);
  if (validateDvor220Configuration(config).some((issue) => issue.severity === "error")) return null;
  return config;
}

export const dvor220ConfigAdapter: SimulatorConfigAdapter<Dvor220PersistedConfig> = {
  simulatorId: "dvor-220",
  schemaVersion: SIMULATOR_CONFIG_SCHEMA_VERSION,
  getDefaultConfig: getDefaultDvor220Config,
  extractConfig: (value) => extractDvor220Config(value as Dvor220Configuration),
  parseConfig: parseDvor220Config,
};
