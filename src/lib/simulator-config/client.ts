import type {
  SimulatorConfigApplyResponse,
  SimulatorConfigAction,
  SimulatorConfigResponse,
  SupportedSimulatorConfigId,
} from "./types";
import { DVOR1150A_CONFIG_DTO_VERSION, SIMULATOR_CONFIG_DTO_HEADER } from "./wire";

function consumerHeaders(simulatorId: SupportedSimulatorConfigId): Record<string, string> {
  return simulatorId === "dvor-1150a"
    ? { [SIMULATOR_CONFIG_DTO_HEADER]: DVOR1150A_CONFIG_DTO_VERSION }
    : {};
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Simulator configuration request failed (${response.status}).`);
  }
  return payload;
}

export function loadSimulatorConfig(
  simulatorId: SupportedSimulatorConfigId,
): Promise<SimulatorConfigResponse> {
  return fetch(`/api/simulator-config/${encodeURIComponent(simulatorId)}`, {
    method: "GET",
    cache: "no-store",
    headers: consumerHeaders(simulatorId),
  }).then((response) => readResponse<SimulatorConfigResponse>(response));
}

export function initializeSimulatorConfig(
  simulatorId: SupportedSimulatorConfigId,
): Promise<SimulatorConfigResponse> {
  return fetch(`/api/simulator-config/${encodeURIComponent(simulatorId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...consumerHeaders(simulatorId) },
    body: JSON.stringify({}),
  }).then((response) => readResponse<SimulatorConfigResponse>(response));
}

export function applySimulatorConfig({
  simulatorId,
  config,
  expectedRevision,
  action = "apply",
  backupConfig,
  changedFields,
  operatorUserId,
  sessionId,
}: {
  simulatorId: SupportedSimulatorConfigId;
  config: unknown;
  expectedRevision: number;
  action?: SimulatorConfigAction;
  backupConfig?: unknown;
  changedFields?: readonly string[];
  operatorUserId?: string | null;
  sessionId?: string | null;
}): Promise<SimulatorConfigApplyResponse> {
  return fetch(`/api/simulator-config/${encodeURIComponent(simulatorId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...consumerHeaders(simulatorId) },
    body: JSON.stringify({
      action,
      config,
      backupConfig,
      expectedRevision,
      changedFields,
      operatorUserId,
      sessionId,
    }),
  }).then((response) => readResponse<SimulatorConfigApplyResponse>(response));
}
