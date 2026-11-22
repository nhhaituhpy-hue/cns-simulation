import type { Dme1119aPersistedConfig, Dvor1150aPersistedConfig, SimulatorConfigResponse } from "./types";
import { DME1119A_CONFIG_EXTENSIONS } from "./dme-1119a";

// A consumer representation, not a persisted schema revision.
export const SIMULATOR_CONFIG_DTO_HEADER = "X-CNS-Simulator-Config-DTO";
export const DVOR1150A_CONFIG_DTO_VERSION = "dvor-1150a-extensions-v4";
export const DVOR1150A_CONFIG_DTO_V3 = "dvor-1150a-extensions-v3";
export const DVOR1150A_CONFIG_DTO_V2 = "dvor-1150a-extensions-v2";
export const DVOR1150A_CONFIG_DTO_PREVIOUS_VERSION = "dvor-1150a-extensions-v1";
export const DME1119A_CONFIG_DTO_VERSION = "dme-1119a-extensions-v1";

export function preserveMissingDme1119aExtensions(source: unknown, parsed: Dme1119aPersistedConfig, stored: Dme1119aPersistedConfig): Dme1119aPersistedConfig {
  const next = structuredClone(parsed);
  for (const key of DME1119A_CONFIG_EXTENSIONS) {
    if (!Object.hasOwn(source as object, key)) Object.assign(next, { [key]: structuredClone(stored[key]) });
  }
  return next;
}

export function legacyDme1119aConfig(value: unknown): unknown {
  const next = structuredClone(value) as Dme1119aPersistedConfig;
  for (const key of DME1119A_CONFIG_EXTENSIONS) delete next[key];
  // Stage 4 G12: legacy consumers know one shared Primary/Secondary pair
  // per monitor-routing row. Project the per-path classification back
  // down, using the integral pair as the legacy representative (the
  // modern parser migrates the shared pair back onto both paths).
  next.monitorConfigGeneral = next.monitorConfigGeneral.map((row) => {
    const record = row as unknown as Record<string, unknown>;
    if (!Object.hasOwn(record, "integralPrimary")) return row;
    return {
      parameter: row.parameter,
      primary: row.integralPrimary,
      secondary: row.integralSecondary,
    } as unknown as Dme1119aPersistedConfig["monitorConfigGeneral"][number];
  });
  return next;
}

const monitorExtensions = ["testGeneratorCalibration", "testGenerator", "standbyCalibration"] as const;
const stationExtensions = ["standbyMode", "automaticRestartsEnabled", "firstRestartDelay"] as const;
const keyerExtensions = [
  "keyerInputLevel", "windowedKeyingInput", "selfKeyOnLoss", "shutdownOnLoss",
  "restartWhenResumed", "externalKeying", "suppressOnShutdown",
] as const;

function v3Dvor1150aConfig(value: unknown): Dvor1150aPersistedConfig {
  const config = structuredClone(value) as Dvor1150aPersistedConfig;
  delete config.hardwareCalibration;
  return config;
}

function v2Dvor1150aConfig(value: unknown): Dvor1150aPersistedConfig {
  const config = v3Dvor1150aConfig(value);
  delete config.sidebandTrims;
  return config;
}

function previousDvor1150aConfig(value: unknown): Dvor1150aPersistedConfig {
  const config = v2Dvor1150aConfig(value);
  for (const field of stationExtensions) delete config.station[field];
  return config;
}

function legacyDvor1150aConfig(value: unknown): unknown {
  // Project only the explicitly negotiated additions. Do not reconstruct a
  // legacy profile from current defaults or drop any unrelated profile keys.
  const config = previousDvor1150aConfig(value);
  for (const field of monitorExtensions) delete config.monitor[field];
  for (const id of ["tx1", "tx2"] as const) {
    for (const field of keyerExtensions) delete config.transmitters[id].nominal[field];
  }
  return config;
}

export function preserveMissingDvor1150aExtensions(
  source: unknown,
  parsed: Dvor1150aPersistedConfig,
  stored: Dvor1150aPersistedConfig,
): Dvor1150aPersistedConfig {
  const raw = source as Dvor1150aPersistedConfig;
  const next = structuredClone(parsed);
  if (!Object.hasOwn(raw, "hardwareCalibration")) next.hardwareCalibration = structuredClone(stored.hardwareCalibration);
  if (!Object.hasOwn(raw, "sidebandTrims")) next.sidebandTrims = structuredClone(stored.sidebandTrims);
  for (const field of stationExtensions) {
    if (!Object.hasOwn(raw.station, field)) Object.assign(next.station, { [field]: stored.station[field] });
  }
  for (const field of monitorExtensions) {
    if (!Object.hasOwn(raw.monitor, field)) {
      // All inputs have already passed the exact-shape parser.
      Object.assign(next.monitor, { [field]: structuredClone(stored.monitor[field]) });
    }
  }
  for (const id of ["tx1", "tx2"] as const) {
    for (const field of keyerExtensions) {
      if (!Object.hasOwn(raw.transmitters[id].nominal, field)) {
        Object.assign(next.transmitters[id].nominal, { [field]: stored.transmitters[id].nominal[field] });
      }
    }
  }
  return next;
}

export function projectSimulatorConfigResponse<T extends SimulatorConfigResponse>(
  response: T,
  dto: string | null,
): T {
  if (response.simulatorId === "dme-1119a" && dto !== DME1119A_CONFIG_DTO_VERSION) return {
    ...response,
    initialConfig: legacyDme1119aConfig(response.initialConfig),
    appliedConfig: legacyDme1119aConfig(response.appliedConfig),
    backupConfig: legacyDme1119aConfig(response.backupConfig),
  };
  if (response.simulatorId !== "dvor-1150a" || dto === DVOR1150A_CONFIG_DTO_VERSION) return response;
  const project = dto === DVOR1150A_CONFIG_DTO_V3 ? v3Dvor1150aConfig : dto === DVOR1150A_CONFIG_DTO_V2 ? v2Dvor1150aConfig
    : dto === DVOR1150A_CONFIG_DTO_PREVIOUS_VERSION ? previousDvor1150aConfig : legacyDvor1150aConfig;
  return {
    ...response,
    initialConfig: project(response.initialConfig),
    appliedConfig: project(response.appliedConfig),
    backupConfig: project(response.backupConfig),
  };
}
