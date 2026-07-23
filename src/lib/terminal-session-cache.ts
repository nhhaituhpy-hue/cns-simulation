import type { TerminalEnginePersistentState } from "./terminal-engine";

const CACHE_NAMESPACE = "cns-simulator:adsb-terminal:v1";

export interface TerminalCacheStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function fingerprintTerminalBaseline(value: unknown): string {
  const serialized = JSON.stringify(value ?? null);
  let hash = 2_166_136_261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildTerminalSessionCacheKey({
  ownerId,
  sessionKey,
  sensorId,
  baselineRevision,
}: {
  ownerId: string;
  sessionKey: string;
  sensorId: string;
  baselineRevision: string;
}): string {
  return [
    CACHE_NAMESPACE,
    ownerId,
    sessionKey,
    sensorId,
    baselineRevision,
  ]
    .map(encodeURIComponent)
    .join(":");
}

export function loadTerminalSessionState(
  storage: TerminalCacheStorage,
  key: string,
): unknown {
  const rawValue = storage.getItem(key);
  return rawValue ? (JSON.parse(rawValue) as unknown) : null;
}

export function saveTerminalSessionState(
  storage: TerminalCacheStorage,
  key: string,
  state: TerminalEnginePersistentState,
): void {
  storage.setItem(key, JSON.stringify(state));
}

export function clearTerminalSessionState(
  storage: TerminalCacheStorage,
  key: string,
): void {
  storage.removeItem(key);
}
