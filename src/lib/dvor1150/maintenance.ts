import { DVOR1150_MONITOR_IDS, DVOR1150_MONITOR_PARAMETERS, DVOR1150_TRANSMITTER_IDS, type Dvor1150CertificationRow, type Dvor1150Config, type Dvor1150GroundCheckData, type Dvor1150GroundCheckRow, type Dvor1150LogEntry, type Dvor1150MonitorId, type Dvor1150Snapshot, type Dvor1150TestGeneratorSettings } from "./types";

export function analyzeGroundCheck(rows: Dvor1150GroundCheckRow[]): Dvor1150GroundCheckData {
  const harmonic = (order: number) => {
    let cosine = 0;
    let sine = 0;
    for (const { azimuth, stationError } of rows) {
      const angle = order * azimuth * Math.PI / 180;
      cosine += stationError * Math.cos(angle);
      sine += stationError * Math.sin(angle);
    }
    const amplitude = 2 * Math.hypot(cosine, sine) / rows.length;
    return amplitude < 1e-10 ? { amplitude: 0, phase: 0 } : {
      amplitude, phase: (Math.atan2(-sine, cosine) * 180 / Math.PI + 360) % 360,
    };
  };
  const values = rows.map((row) => row.stationError);
  return {
    rows, duantal: harmonic(1), quadrantal: harmonic(2), octantal: harmonic(4),
    bias: values.reduce((sum, value) => sum + value, 0) / rows.length,
    errorSpread: Math.max(...values) - Math.min(...values),
  };
}

export function certifyMonitor(config: Dvor1150Config, id: Dvor1150MonitorId): Dvor1150CertificationRow[] {
  const cal = config.monitor.calibration[id].testGenerator;
  const tests = [
    { parameter: "azimuth", limits: config.monitor.azimuthAlarmLimits[id], measure: (v: number) => v + cal.azimuthAngleOffset, tolerance: 0.2, unit: "°" },
    { parameter: "hz30Modulation", limits: config.monitor.alarmLimits.hz30Modulation, measure: (v: number) => v * cal.hz30ModulationScale / 100, tolerance: 1, unit: "%" },
    { parameter: "hz9960Modulation", limits: config.monitor.alarmLimits.hz9960Modulation, measure: (v: number) => v * cal.hz9960ModulationScale / 100, tolerance: 1, unit: "%" },
    { parameter: "deviation", limits: config.monitor.alarmLimits.deviation, measure: (v: number) => v * cal.hz9960DeviationScale / 100, tolerance: 0.2, unit: "Ratio" },
  ] as const;
  return tests.map(({ parameter, limits, measure, tolerance, unit }) => ({
    parameter, lowLimit: limits.alarmLow, highLimit: limits.alarmHigh,
    lowData: measure(limits.alarmLow), highData: measure(limits.alarmHigh),
    unit, tolerance,
  }));
}

type TimedResult<T> = { timestamp: string; values: T };
type Job =
  | { kind: "monitor"; target: Dvor1150MonitorId; values: Dvor1150TestGeneratorSettings }
  | { kind: "certification"; target: Dvor1150MonitorId; values: Dvor1150CertificationRow[] }
  | { kind: "ground"; target: string; values: Dvor1150GroundCheckData };

export type MaintenanceJob = Job & { finishesAt: number };
export type MaintenanceState = ReturnType<typeof idleMaintenance>;

export function idleMaintenance() {
  return {
    job: null as MaintenanceJob | null,
    monitor: {} as Partial<Record<Dvor1150MonitorId, TimedResult<Dvor1150TestGeneratorSettings>>>,
    certification: {} as Partial<Record<Dvor1150MonitorId, TimedResult<Dvor1150CertificationRow[]>>>,
    ground: null as TimedResult<Dvor1150GroundCheckData> | null,
  };
}

export function completeMaintenance(state: MaintenanceState, clock: number, snapshot: Dvor1150Snapshot): MaintenanceState {
  const { job } = state;
  if (!job) return state;
  if (job.kind === "ground" && snapshot.activeTransmitter !== job.target) return { ...state, job: null };
  if (clock < job.finishesAt) return state;
  const timestamp = snapshot.data.timestamp;
  if (job.kind === "ground") return { ...state, job: null, ground: { timestamp, values: job.values } };
  if (job.kind === "monitor") return { ...state, job: null, monitor: { ...state.monitor, [job.target]: { timestamp, values: job.values } } };
  return { ...state, job: null, certification: { ...state.certification, [job.target]: { timestamp, values: job.values } } };
}

type LogCondition = Pick<Dvor1150LogEntry, "user" | "message" | "severity"> & { kind: "alarm" | "maintenance"; state: string };
export type PendingRmsCondition = { row: LogCondition; timeTag: string; since: number; logged: boolean };

export function rmsConditionLogs(config: Dvor1150Config, snapshot: Dvor1150Snapshot, clock: number, pending: Map<string, PendingRmsCondition>) {
  const conditions: LogCondition[] = [];
  for (const id of DVOR1150_MONITOR_IDS) {
    const { parameters, commStatus } = snapshot.monitors[id];
    if (commStatus === "gray" || !snapshot.activeTransmitter) continue;
    for (const parameter of DVOR1150_MONITOR_PARAMETERS) {
      if (parameters[parameter].status === "alarm") {
        conditions.push({ kind: "alarm", user: id === "mon1" ? "Monitor 1" : "Monitor 2", message: parameter,
          severity: "red", state: "Alarm" });
      }
    }
  }
  if (config.monitor.sidebandVswrExecutiveAlarm && snapshot.data.maintenanceAlerts.some((row) => row.label === "Sideband Antenna VSWR" && row.indicator === "red")) {
    conditions.push({ kind: "alarm", user: "Sideband VSWR", message: "Executive Alarm", severity: "red", state: "Alarm" });
  }
  for (const id of DVOR1150_TRANSMITTER_IDS) {
    if (!snapshot.effectiveTransmitters[id].enabled) continue;
    for (const row of [...snapshot.data.adDataByTransmitter[id], snapshot.data.temperatureData[id === "tx1" ? 1 : 2]]) {
      if (!row) continue;
      const direction = row.value < row.preLow ? "Low" : row.value > row.preHigh ? "High" : null;
      if (direction) conditions.push({ kind: "maintenance", user: id.toUpperCase(), message: row.parameter, severity: "yellow", state: `Alert ${direction}` });
    }
  }
  for (const row of snapshot.data.maintenanceAlerts) {
    if (row.indicator === "yellow" && row.label !== "Maintenance Alert") {
      conditions.push({ kind: "maintenance", user: "RMS", message: row.label, severity: "yellow", state: "Alert" });
    }
  }
  const entries: Dvor1150LogEntry[] = [];
  const timeTag = snapshot.data.timestamp;
  const current = new Map(conditions.map((row) => [`${row.kind}/${row.user}/${row.message}`, row]));
  for (const [key, entry] of pending) {
    if (current.get(key)?.state !== entry.row.state) {
      if (entry.logged && !current.has(key)) entries.push({ ...entry.row, severity: "green", state: "Normal", timeTag });
      pending.delete(key);
    }
  }
  for (const [key, row] of current) {
    const entry = pending.get(key) ?? { row, timeTag, since: clock, logged: false };
    if (!entry.logged && clock - entry.since >= config.monitor.monitorShutdownDelay * 500) {
      entries.push({ ...row, timeTag: entry.timeTag });
      entry.logged = true;
    }
    pending.set(key, entry);
  }
  return entries;
}

export function limitRmsLogs(entries: Dvor1150LogEntry[]) {
  const counts = { alarm: 0, maintenance: 0, command: 0 };
  return entries.reduceRight<Dvor1150LogEntry[]>((kept, row) => {
    if (++counts[row.kind ?? "command"] <= 100) kept.push(row);
    return kept;
  }, []).reverse();
}

export function startOperationalSummary(clock: number) {
  return { start: clock, last: clock, elapsed: 0, tx1: { normal: 0, standby: 0 }, tx2: { normal: 0, standby: 0 } };
}

export function updateOperationalSummary(summary: ReturnType<typeof startOperationalSummary>, clock: number, previous: Dvor1150Snapshot) {
  const delta = Math.max(0, clock - summary.last);
  const next = { ...summary, last: clock, elapsed: summary.elapsed + delta };
  for (const id of DVOR1150_TRANSMITTER_IDS) {
    next[id] = {
      normal: summary[id].normal + (previous.activeTransmitter === id ? delta : 0),
      standby: summary[id].standby + (previous.effectiveTransmitters[id].load ? delta : 0),
    };
  }
  return next;
}
