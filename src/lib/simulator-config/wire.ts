import type { Dme1119aPersistedConfig, Dvor1150aPersistedConfig, SimulatorConfigResponse } from "./types";
import { DME1119A_CONFIG_EXTENSIONS } from "./dme-1119a";

// A consumer representation, not a persisted schema revision.
export const SIMULATOR_CONFIG_DTO_HEADER = "X-CNS-Simulator-Config-DTO";
export const DVOR1150A_CONFIG_DTO_VERSION = "dvor-1150a-extensions-v1";
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
  return next;
}

const monitorExtensions = ["testGeneratorCalibration", "testGenerator", "standbyCalibration"] as const;
const keyerExtensions = [
  "keyerInputLevel", "windowedKeyingInput", "selfKeyOnLoss", "shutdownOnLoss",
  "restartWhenResumed", "externalKeying", "suppressOnShutdown",
] as const;

function legacyDvor1150aConfig(value: unknown): unknown {
  // Project only the explicitly negotiated additions. Do not reconstruct a
  // legacy profile from current defaults or drop any unrelated profile keys.
  const config = structuredClone(value) as Dvor1150aPersistedConfig;
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
  return {
    ...response,
    initialConfig: legacyDvor1150aConfig(response.initialConfig),
    appliedConfig: legacyDvor1150aConfig(response.appliedConfig),
    backupConfig: legacyDvor1150aConfig(response.backupConfig),
  };
}
