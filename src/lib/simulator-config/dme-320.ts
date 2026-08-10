import {
  cloneDme320Config,
  createDefaultDme320Config,
} from "@/modules/operations/dme-320/domain/defaults";
import type { Dme320Config } from "@/modules/operations/dme-320/domain/types";
import { assertValidDme320Config } from "@/modules/operations/dme-320/domain/validation";
import { hasSameJsonShape } from "./shape";
import {
  SIMULATOR_CONFIG_SCHEMA_VERSION,
  type Dme320PersistedConfig,
  type SimulatorConfigAdapter,
} from "./types";

export function getDefaultDme320Config(): Dme320PersistedConfig {
  return cloneDme320Config(createDefaultDme320Config());
}

export function extractDme320Config(value: Dme320Config): Dme320PersistedConfig {
  return cloneDme320Config(value);
}

export function parseDme320Config(value: unknown): Dme320PersistedConfig | null {
  if (!hasSameJsonShape(value, getDefaultDme320Config())) return null;
  const config = cloneDme320Config(value as Dme320Config);
  try {
    assertValidDme320Config(config);
  } catch {
    return null;
  }
  return config;
}

export const dme320ConfigAdapter: SimulatorConfigAdapter<Dme320PersistedConfig> = {
  simulatorId: "dme-320",
  schemaVersion: SIMULATOR_CONFIG_SCHEMA_VERSION,
  getDefaultConfig: getDefaultDme320Config,
  extractConfig: (value) => extractDme320Config(value as Dme320Config),
  parseConfig: parseDme320Config,
};
