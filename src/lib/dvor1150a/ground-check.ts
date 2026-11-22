import type {
  Dvor1150aConfig,
  DvorGroundCheckResult,
  DvorMonitorId,
  DvorTransmitterId,
} from "./config-types";
import { DVOR_TRANSMITTER_IDS } from "./config-types";
import { buildDvorGroundCheck, groundCheckAzimuths } from "./engine";

/**
 * Ground-check runs follow the same simulated-clock lifecycle as the monitor
 * integrity tests (G11): a run is only a snapshot once it completes, so the
 * PMDT never presents live derived values as if a check had been measured.
 * The duration is a trainer model value; the manual does not state one.
 */
export const GROUND_CHECK_DURATION_SECONDS = 60;

export type DvorGroundCheckGraphMode = "fft-errors" | "fft-sum" | "station-error";
export type DvorGroundCheckRunStatus = "idle" | "running" | "completed" | "failed" | "canceled";

export interface DvorGroundCheckRunState {
  status: DvorGroundCheckRunStatus;
  source: DvorMonitorId;
  elapsed: number;
  startedAt: string | null;
  completedAt: string | null;
  result: DvorGroundCheckResult | null;
  failureReason: string | null;
}

export type DvorGroundCheckRuns = Record<DvorTransmitterId, DvorGroundCheckRunState>;

function idleRun(source: DvorMonitorId): DvorGroundCheckRunState {
  return {
    status: "idle",
    source,
    elapsed: 0,
    startedAt: null,
    completedAt: null,
    result: null,
    failureReason: null,
  };
}

export function initialDvorGroundCheckRuns(): DvorGroundCheckRuns {
  return { tx1: idleRun("mon2"), tx2: idleRun("mon2") };
}

export function startDvorGroundCheckRun(
  previous: DvorGroundCheckRunState,
  source: DvorMonitorId,
  startedAt: string,
): DvorGroundCheckRunState {
  return {
    ...previous,
    status: "running",
    source,
    elapsed: 0,
    startedAt,
    failureReason: null,
  };
}

export function cancelDvorGroundCheckRun(previous: DvorGroundCheckRunState): DvorGroundCheckRunState {
  if (previous.status !== "running") return previous;
  return { ...previous, status: "canceled", failureReason: null };
}

export function groundCheckTransmitterUnavailable(config: Dvor1150aConfig, id: DvorTransmitterId): boolean {
  const transmitter = config.transmitters[id];
  return !transmitter.enabled || transmitter.faults.disabled;
}

export function advanceDvorGroundCheckRuns(
  previous: DvorGroundCheckRuns,
  config: Dvor1150aConfig,
  responding: Record<DvorMonitorId, boolean>,
  seconds: number,
): DvorGroundCheckRuns {
  if (!Number.isFinite(seconds) || seconds <= 0) return previous;
  if (DVOR_TRANSMITTER_IDS.every((id) => previous[id].status !== "running")) return previous;
  const next = { ...previous };
  for (const id of DVOR_TRANSMITTER_IDS) {
    const run = previous[id];
    if (run.status !== "running") continue;
    const elapsed = run.elapsed + seconds;
    if (elapsed < GROUND_CHECK_DURATION_SECONDS) {
      next[id] = { ...run, elapsed };
      continue;
    }
    if (groundCheckTransmitterUnavailable(config, id)) {
      next[id] = {
        ...run,
        status: "failed",
        elapsed: GROUND_CHECK_DURATION_SECONDS,
        failureReason: "Transmitter was disabled during the run.",
      };
      continue;
    }
    if (!responding[run.source]) {
      next[id] = {
        ...run,
        status: "failed",
        elapsed: GROUND_CHECK_DURATION_SECONDS,
        failureReason: `${run.source === "mon1" ? "Monitor 1" : "Monitor 2"} did not respond.`,
      };
      continue;
    }
    next[id] = {
      ...run,
      status: "completed",
      elapsed: GROUND_CHECK_DURATION_SECONDS,
      completedAt: run.startedAt
        ? new Date(Date.parse(run.startedAt) + GROUND_CHECK_DURATION_SECONDS * 1000).toISOString()
        : null,
      result: buildDvorGroundCheck(config, id),
      failureReason: null,
    };
  }
  return next;
}

export interface DvorGroundCheckGraphSeries {
  label: string;
  values: readonly number[];
}

/**
 * The FFT views decompose the same snapshot the engine already computes:
 * station error is exactly bias + quadrantal + octantal, so no new error
 * formula is introduced here.
 */
export function groundCheckGraphSeries(
  result: DvorGroundCheckResult,
  mode: DvorGroundCheckGraphMode,
): DvorGroundCheckGraphSeries[] {
  if (mode !== "fft-errors") {
    return [{ label: "Station Error", values: result.stationErrors }];
  }
  const radians = Math.PI / 180;
  return [
    {
      label: "Quadrantal",
      values: groundCheckAzimuths.map(
        (azimuth) => result.quadrantal.amplitude * Math.cos((2 * azimuth + result.quadrantal.phase) * radians),
      ),
    },
    {
      label: "Octantal",
      values: groundCheckAzimuths.map(
        (azimuth) => result.octantal.amplitude * Math.cos((4 * azimuth + result.octantal.phase) * radians),
      ),
    },
    { label: "Bias", values: groundCheckAzimuths.map(() => result.bias) },
  ];
}

function transmitterLabel(id: DvorTransmitterId): string {
  return id === "tx1" ? "Tx 1" : "Tx 2";
}

function monitorLabel(id: DvorMonitorId): string {
  return id === "mon1" ? "Monitor 1" : "Monitor 2";
}

export function groundCheckResultText(
  id: DvorTransmitterId,
  run: DvorGroundCheckRunState,
): string {
  const result = run.result;
  if (!result) return "";
  const lines = [
    `DVOR 1150A Ground Check — ${transmitterLabel(id)} (simulator model)`,
    `Source: ${monitorLabel(run.source)}`,
    `Completed: ${run.completedAt ?? "—"}`,
    "",
    "Azimuth (deg), Station Error (deg)",
    ...groundCheckAzimuths.map(
      (azimuth, index) => `${azimuth.toFixed(2)}, ${(result.stationErrors[index] ?? 0).toFixed(2)}`,
    ),
    "",
    `Error Spread: ${result.errorSpread.toFixed(2)} deg`,
    `Duantal Error: amplitude ${result.quadrantal.amplitude.toFixed(3)}, phase ${result.quadrantal.phase.toFixed(1)} deg`,
    `Quadrantal Error: amplitude ${result.quadrantal.amplitude.toFixed(3)}, phase ${result.quadrantal.phase.toFixed(1)} deg`,
    `Octantal Error: amplitude ${result.octantal.amplitude.toFixed(3)}, phase ${result.octantal.phase.toFixed(1)} deg`,
    `Bias: ${result.bias.toFixed(3)} deg`,
    "",
    "Simulated result from the training model. No signal was measured and no NOTAM was issued.",
  ];
  return lines.join("\n");
}

export function groundCheckResultCsv(
  id: DvorTransmitterId,
  run: DvorGroundCheckRunState,
): string {
  const result = run.result;
  if (!result) return "";
  const lines = [
    "azimuth_deg,station_error_deg",
    ...groundCheckAzimuths.map(
      (azimuth, index) => `${azimuth},${(result.stationErrors[index] ?? 0).toFixed(3)}`,
    ),
    `error_spread_deg,${result.errorSpread.toFixed(3)}`,
    `quadrantal_amplitude_deg,${result.quadrantal.amplitude.toFixed(3)}`,
    `quadrantal_phase_deg,${result.quadrantal.phase.toFixed(1)}`,
    `octantal_amplitude_deg,${result.octantal.amplitude.toFixed(3)}`,
    `octantal_phase_deg,${result.octantal.phase.toFixed(1)}`,
    `bias_deg,${result.bias.toFixed(3)}`,
    `transmitter,${transmitterLabel(id)}`,
    `source,${monitorLabel(run.source)}`,
    `completed_at,${run.completedAt ?? ""}`,
  ];
  return lines.join("\n");
}
