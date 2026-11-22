import type {
  DmeAlarmLogEntry,
  DmeDualValueRow,
  DmeFaultHistorySnapshot,
  DmeIndicatorColor,
  DmeMaintenanceLogEntry,
  DmeOperationalSummaryState,
  DmeParameterStatus,
  DmePmdtData,
} from "@/lib/dme-types";

/**
 * Runtime log engine for the DME 1119A PMDT (Stage 1 of the fidelity audit:
 * G01/G02/G10). The real RMS keeps the 100 most recent entries per log,
 * newest first, overwriting FIFO (manual §3.6.7.3). Entries are produced by
 * diffing two consecutive derived states, so every store action that
 * replaces `data` is covered without instrumenting each action.
 */
export const DME_RMS_LOG_LIMIT = 100;

/** Manual §3.6.9.3: Fault History keeps the last 3 faults per monitor/path. */
export const DME_FAULT_HISTORY_PER_GROUP = 3;

export type DmeMonitorPath = "integral" | "standby";
export type DmeLastGoodRows = Partial<Record<`${DmeMonitorPath}:${1 | 2}`, DmeDualValueRow[]>>;

type RowStatus = DmeIndicatorColor | DmeParameterStatus;

/** 0 = normal, 1 = pre-alarm/warning, 2 = alarm. Colours and statuses share one scale. */
export function dmeRowSeverity(status: RowStatus): 0 | 1 | 2 {
  if (status === "alarm" || status === "red") return 2;
  if (status === "warning" || status === "yellow") return 1;
  return 0;
}

function rowsForPath(data: DmePmdtData, path: DmeMonitorPath): DmeDualValueRow[] {
  return path === "integral" ? data.integralData : data.standbyData;
}

function statusOf(row: DmeDualValueRow, monitor: 1 | 2): RowStatus {
  return monitor === 1 ? row.mon1Status : row.mon2Status;
}

function valueOf(row: DmeDualValueRow, monitor: 1 | 2): string {
  return monitor === 1 ? row.mon1Value : row.mon2Value;
}

/**
 * Refresh the last-good row cache: whenever a monitor has no parameter in
 * alarm on a path, the current rows are that monitor's last good values.
 */
export function updateDmeLastGoodRows(cache: DmeLastGoodRows, data: DmePmdtData): void {
  for (const path of ["integral", "standby"] as const) {
    const rows = rowsForPath(data, path);
    for (const monitor of [1, 2] as const) {
      const hasAlarm = rows.some((row) => dmeRowSeverity(statusOf(row, monitor)) === 2);
      if (!hasAlarm) cache[`${path}:${monitor}`] = structuredClone(rows);
    }
  }
}

function alarmStateFor(
  data: DmePmdtData,
  row: DmeDualValueRow,
  monitor: 1 | 2,
  severity: 1 | 2,
): DmeAlarmLogEntry["state"] {
  if (severity === 1) return "Pre-Alarm";
  const classification = data.monitorConfigGeneral.find((item) => item.parameter === row.label);
  const limit = data.alarmLimits.find((item) => item.parameter === row.label);
  const numeric = Number.parseFloat(valueOf(row, monitor));
  const isLow = limit !== undefined && Number.isFinite(numeric) && numeric < limit.nominal;
  // The log's state vocabulary only carries a named Primary state for the
  // low side; every other alarm is recorded with the generic "Alarm" state.
  if (classification?.primary && isLow) return "Primary Alarm Low";
  return "Alarm";
}

export interface DmeRuntimeTransitions {
  alarmEntries: DmeAlarmLogEntry[];
  maintenanceEntries: DmeMaintenanceLogEntry[];
  snapshots: Array<Omit<DmeFaultHistorySnapshot, "id">>;
}

function lcuSnapshot(data: DmePmdtData): DmeFaultHistorySnapshot["lcu"] {
  return {
    votingLogic: data.rmsConfigGeneral.votingLogic,
    monitor1Enabled: data.monitorTransmitterStatus.enabledMonitors.monitor1,
    monitor2Enabled: data.monitorTransmitterStatus.enabledMonitors.monitor2,
    integral: structuredClone(data.monitors.integral),
    standby: structuredClone(data.monitors.standby),
    mainSelect: data.monitorTransmitterStatus.mainSelect,
    antennaSelect: data.monitorTransmitterStatus.antennaSelect,
    transmitterOn: { ...data.monitorTransmitterStatus.transmitterOn },
  };
}

/**
 * Diff two consecutive derived states and produce the log entries and fault
 * snapshots the transition represents. `lastGoodRows` supplies the pre-alarm
 * column for fault snapshots (manual §3.6.9.3).
 */
export function deriveDmeRuntimeTransitions(
  previous: DmePmdtData,
  next: DmePmdtData,
  lastGoodRows: DmeLastGoodRows,
): DmeRuntimeTransitions {
  const alarmEntries: DmeAlarmLogEntry[] = [];
  const maintenanceEntries: DmeMaintenanceLogEntry[] = [];
  const snapshots: DmeRuntimeTransitions["snapshots"] = [];
  const timeTag = next.timestamp;

  for (const path of ["integral", "standby"] as const) {
    const pathLabel = path === "integral" ? "Integral" : "Standby";
    const previousRows = new Map(rowsForPath(previous, path).map((row) => [row.label, row]));
    for (const monitor of [1, 2] as const) {
      const newlyAlarmed: string[] = [];
      for (const row of rowsForPath(next, path)) {
        const previousRow = previousRows.get(row.label);
        const before = previousRow ? dmeRowSeverity(statusOf(previousRow, monitor)) : 0;
        const after = dmeRowSeverity(statusOf(row, monitor));
        if (after === before) continue;
        const alarm = `${pathLabel} ${row.label}`;
        const type = `Monitor ${monitor}`;
        if (after > before) {
          alarmEntries.push({ timeTag, type, alarm, state: alarmStateFor(next, row, monitor, after as 1 | 2) });
          if (after === 2) newlyAlarmed.push(row.label);
        } else if (after === 0) {
          alarmEntries.push({ timeTag, type, alarm, state: "Normal" });
        } else {
          // Alarm degrading to pre-alarm is still a state change worth logging.
          alarmEntries.push({ timeTag, type, alarm, state: "Pre-Alarm" });
        }
      }
      if (newlyAlarmed.length > 0) {
        snapshots.push({
          monitor,
          path,
          timeTag,
          parameters: newlyAlarmed,
          preAlarmRows: structuredClone(lastGoodRows[`${path}:${monitor}`] ?? rowsForPath(previous, path)),
          alarmRows: structuredClone(rowsForPath(next, path)),
          lcu: lcuSnapshot(next),
        });
      }
    }
  }

  // Facility / maintenance transitions (manual §3.6.7.3.3).
  const maintenance = (type: string, alert: string, active: boolean) => {
    maintenanceEntries.push({ timeTag, type, alert, state: active ? "Alert" : "Normal" });
  };
  if (previous.rmsStatus.acFailure !== next.rmsStatus.acFailure) {
    maintenance("General", "AC Failure", next.rmsStatus.acFailure);
  }
  if (previous.rmsStatus.onBattery !== next.rmsStatus.onBattery) {
    maintenance("General", "On Battery", next.rmsStatus.onBattery);
  }
  const previousTemperatures = new Map(previous.rmsTemperatureData.map((row) => [row.parameter, row]));
  for (const row of next.rmsTemperatureData) {
    const wasAlert = (() => {
      const before = previousTemperatures.get(row.parameter);
      return Boolean(before && typeof before.high === "number" && before.value >= before.high);
    })();
    const isAlert = typeof row.high === "number" && row.value >= row.high;
    if (wasAlert !== isAlert) maintenance("RMS Data", row.parameter, isAlert);
  }
  for (const tx of ["tx1", "tx2"] as const) {
    const label = tx === "tx1" ? "RTC 1" : "RTC 2";
    if (previous.rtcStatus.commFault[tx] !== next.rtcStatus.commFault[tx]) {
      maintenance("Transmitter Data", `${label} Comm Fault`, next.rtcStatus.commFault[tx]);
    }
    if (previous.txStatus.maintenanceAlert[tx] !== next.txStatus.maintenanceAlert[tx]) {
      maintenance("Transmitter Data", `${label} Maintenance Alert`, next.txStatus.maintenanceAlert[tx]);
    }
  }
  for (const bcps of ["bcps1", "bcps2"] as const) {
    if (previous.bcpsCommFaults[bcps] !== next.bcpsCommFaults[bcps]) {
      maintenance("RMS Data", `BCPS ${bcps === "bcps1" ? "1" : "2"} Comm Fault`, next.bcpsCommFaults[bcps]);
    }
  }
  // Automatic protection transfer / shutdown: the antenna relay moved (or
  // both transmitters dropped) while a monitor alarm was present.
  const hadMonitorAlarm = previous.monitors.integral.priAlarm || previous.monitors.integral.secAlarm
    || previous.monitors.standby.priAlarm || previous.monitors.standby.secAlarm;
  const antennaMoved = previous.monitorTransmitterStatus.antennaSelect !== next.monitorTransmitterStatus.antennaSelect;
  const bothDropped = (previous.monitorTransmitterStatus.transmitterOn.tx1 || previous.monitorTransmitterStatus.transmitterOn.tx2)
    && !next.monitorTransmitterStatus.transmitterOn.tx1 && !next.monitorTransmitterStatus.transmitterOn.tx2;
  if (hadMonitorAlarm && bothDropped) {
    maintenanceEntries.push({ timeTag, type: "General", alert: "Automatic Monitor Shutdown", state: "Alert" });
  } else if (hadMonitorAlarm && antennaMoved) {
    maintenanceEntries.push({ timeTag, type: "General", alert: `Automatic Transfer to TX${next.monitorTransmitterStatus.antennaSelect}`, state: "Alert" });
  }

  return { alarmEntries, maintenanceEntries, snapshots };
}

/** Prepend new entries (newest first) and enforce the FIFO cap (manual §3.6.7.3). */
export function prependDmeLogEntries<T>(existing: readonly T[], entries: readonly T[], limit = DME_RMS_LOG_LIMIT): T[] {
  if (entries.length === 0) return existing as T[];
  return [...entries, ...existing].slice(0, limit);
}

/** Keep only the newest DME_FAULT_HISTORY_PER_GROUP faults per monitor + path. */
export function capDmeFaultHistory(
  snapshots: readonly DmeFaultHistorySnapshot[],
): DmeFaultHistorySnapshot[] {
  const counts = new Map<string, number>();
  return snapshots.filter((snapshot) => {
    const key = `${snapshot.path}:${snapshot.monitor}`;
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return count <= DME_FAULT_HISTORY_PER_GROUP;
  });
}

export function createEmptyDmeOperationalSummary(): DmeOperationalSummaryState {
  const tx = (): DmeOperationalSummaryState["tx1"] => ({
    normalSeconds: 0,
    bypassSeconds: 0,
    offSeconds: 0,
    commFaultSeconds: 0,
    standbySeconds: 0,
  });
  return { startedAt: null, elapsedSeconds: 0, tx1: tx(), tx2: tx() };
}

/**
 * Advance the Operational Summary accumulators by one clock delta, using
 * the transmitter state that held during the interval.
 */
export function accumulateDmeOperationalSummary(
  summary: DmeOperationalSummaryState,
  data: DmePmdtData,
  deltaSeconds: number,
): DmeOperationalSummaryState {
  if (!(deltaSeconds > 0)) return summary;
  const next: DmeOperationalSummaryState = {
    startedAt: summary.startedAt ?? data.timestamp,
    elapsedSeconds: summary.elapsedSeconds + deltaSeconds,
    tx1: { ...summary.tx1 },
    tx2: { ...summary.tx2 },
  };
  const anyBypass = data.monitors.integral.bypass || data.monitors.standby.bypass;
  for (const tx of ["tx1", "tx2"] as const) {
    const bucket = next[tx];
    const txNumber = tx === "tx1" ? 1 : 2;
    if (anyBypass) bucket.bypassSeconds += deltaSeconds;
    if (data.rtcStatus.commFault[tx]) bucket.commFaultSeconds += deltaSeconds;
    if (!data.monitorTransmitterStatus.transmitterOn[tx]) {
      bucket.offSeconds += deltaSeconds;
    } else if (data.monitorTransmitterStatus.antennaSelect === txNumber) {
      if (!data.txStatus.maintenanceAlert[tx]) bucket.normalSeconds += deltaSeconds;
    } else {
      bucket.standbySeconds += deltaSeconds;
    }
  }
  return next;
}

/** Availability = share of elapsed time in normal operation (percent). */
export function dmeOperationalAvailability(summary: DmeOperationalSummaryState, tx: "tx1" | "tx2"): number {
  if (summary.elapsedSeconds <= 0) return 0;
  return (summary[tx].normalSeconds / summary.elapsedSeconds) * 100;
}
