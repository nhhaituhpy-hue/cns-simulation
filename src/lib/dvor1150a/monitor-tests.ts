import type { Dvor1150aConfig, DvorMonitorId, Dvor1150aSnapshot } from "./config-types";
import { DVOR_MONITOR_IDS } from "./config-types";
import { testGeneratorDvor1150aCalibration } from "./defaults";
import { buildDvor1150aSnapshot, calculateIntegrityTestValues } from "./engine";

export const MONITOR_TEST_STEP_SECONDS = 6;
export const MONITOR_TEST_CYCLE_SECONDS = 120;
export const MONITOR_TEST_INITIAL_WAIT_SECONDS = 180;
const WATCHDOG_SECONDS = 600;
const DEFAULT_FAILURE_LIMIT = 3;

const parameters = ["azimuth", "hz30Modulation", "hz9960Modulation", "deviation", "identModulation"] as const;
type Parameter = typeof parameters[number];
export type MonitorTestCell = { value: number | null; target: number; status: "green" | "yellow" | "red" | "gray" };
export type MonitorTestRow = {
  key: Parameter; label: string; digits: number; unit: string; lowLimit: number; highLimit: number;
  cells: MonitorTestCell[];
};
export type MonitorTestRun = { timestamp: string | null; rows: MonitorTestRow[] };
type GeneratorSample = {
  timestamp: string;
  signature: string;
  values: Dvor1150aSnapshot["testGeneratorResults"][DvorMonitorId];
};
export type DvorMonitorTests = {
  clock: number;
  phase: number;
  generatorElapsed: number;
  setupTimestamp: string;
  inProcess: Record<DvorMonitorId, MonitorTestRun>;
  completed: Record<DvorMonitorId, MonitorTestRun | null>;
  generator: Record<DvorMonitorId, GeneratorSample | null>;
  failures: Record<DvorMonitorId, Record<Parameter, number>>;
  sinceComplete: Record<DvorMonitorId, number>;
  responding: Record<DvorMonitorId, boolean>;
  excluded: DvorMonitorId[];
};

const labels = ["Azimuth", "30 Hz Modulation", "9960 Hz Modulation", "9960 Hz Deviation", "Ident Modulation"];
export function monitorTestRows(config: Dvor1150aConfig, id: DvorMonitorId): MonitorTestRow[] {
  const antenna = config.monitor.antennas[id];
  const nominalAzimuth = antenna.secondAntennaEnabled
    ? (antenna.azimuthAngle + antenna.secondAzimuthAngle) / 2 : antenna.azimuthAngle;
  return parameters.map((key, index) => {
    const band = key === "azimuth" ? {
      nominal: nominalAzimuth,
      alarmLow: nominalAzimuth - config.monitor.azimuthLimits.alarm,
      alarmHigh: nominalAzimuth + config.monitor.azimuthLimits.alarm,
      preAlarmLow: nominalAzimuth - config.monitor.azimuthLimits.preAlarm,
      preAlarmHigh: nominalAzimuth + config.monitor.azimuthLimits.preAlarm,
      unit: "°",
    } : config.monitor.alarmLimits[key];
    const targets = calculateIntegrityTestValues(band);
    return {
      key, label: labels[index], digits: index === 0 || index === 3 ? 2 : 1,
      unit: index === 0 ? "°" : index === 3 ? "Ratio" : "%",
      lowLimit: band.alarmLow, highLimit: band.alarmHigh,
      cells: [targets.lowLimitLowTest, targets.lowLimitHighTest, targets.highLimitLowTest, targets.highLimitHighTest]
        .map(target => ({ target, value: null, status: "gray" })),
    };
  });
}

export function initialDvorMonitorTests(config: Dvor1150aConfig, timestamp: string): DvorMonitorTests {
  const counters = () => Object.fromEntries(parameters.map(key => [key, 0])) as Record<Parameter, number>;
  return {
    clock: Date.parse(timestamp), phase: MONITOR_TEST_CYCLE_SECONDS - MONITOR_TEST_INITIAL_WAIT_SECONDS,
    generatorElapsed: 0, setupTimestamp: timestamp,
    inProcess: { mon1: { timestamp: null, rows: monitorTestRows(config, "mon1") }, mon2: { timestamp: null, rows: monitorTestRows(config, "mon2") } },
    completed: { mon1: null, mon2: null }, generator: { mon1: null, mon2: null },
    failures: { mon1: counters(), mon2: counters() }, sinceComplete: { mon1: 0, mon2: 0 },
    responding: { mon1: true, mon2: true }, excluded: [],
  };
}

export function monitorGeneratorSignature(config: Dvor1150aConfig, id: DvorMonitorId): string {
  return JSON.stringify([config.monitor.testGenerator, config.monitor.testGeneratorCalibration?.[id]]);
}

function sample(row: MonitorTestRow, cellIndex: number, config: Dvor1150aConfig, id: DvorMonitorId): MonitorTestCell {
  const target = row.cells[cellIndex].target;
  const calibration = config.monitor.testGeneratorCalibration?.[id] ?? testGeneratorDvor1150aCalibration;
  const reference = testGeneratorDvor1150aCalibration;
  const scaleKey = `${row.key}Scale` as Exclude<keyof typeof calibration, "azimuthOffset">;
  const value = row.key === "azimuth" ? target + calibration.azimuthOffset - reference.azimuthOffset
    : target * calibration[scaleKey] / reference[scaleKey];
  const outside = value < row.lowLimit || value > row.highLimit;
  const expectAlarm = cellIndex === 0 || cellIndex === 3;
  return { target, value, status: !Number.isFinite(value) ? "red" : outside === expectAlarm ? "green" : expectAlarm ? "red" : "yellow" };
}

export function advanceDvorMonitorTests(previous: DvorMonitorTests, config: Dvor1150aConfig, seconds: number): DvorMonitorTests {
  if (!Number.isFinite(seconds) || seconds <= 0) return previous;
  const next = structuredClone(previous);
  const configuredLimit = config.monitor.integrity.maxConsecutiveFailures;
  const failureLimit = Number.isInteger(configuredLimit) && configuredLimit >= 1 && configuredLimit <= 10 ? configuredLimit : DEFAULT_FAILURE_LIMIT;
  let remaining = seconds;
  const installed = (id: DvorMonitorId) => id === "mon1" || config.station.monitorConfig === "Dual Monitors";
  const responding = (id: DvorMonitorId) => installed(id) && config.monitor.antennas[id].enabled && next.responding[id];
  while (remaining > 0) {
    const untilStep = MONITOR_TEST_STEP_SECONDS - ((next.phase % MONITOR_TEST_STEP_SECONDS + MONITOR_TEST_STEP_SECONDS) % MONITOR_TEST_STEP_SECONDS);
    const step = Math.min(remaining, untilStep, MONITOR_TEST_CYCLE_SECONDS - next.generatorElapsed);
    next.clock += step * 1000;
    remaining -= step;
    next.generatorElapsed += step;
    if (next.generatorElapsed >= MONITOR_TEST_CYCLE_SECONDS) {
      const snapshot = buildDvor1150aSnapshot(config);
      for (const id of DVOR_MONITOR_IDS) if (responding(id)) next.generator[id] = {
        timestamp: new Date(next.clock).toISOString(), signature: monitorGeneratorSignature(config, id),
        values: structuredClone(snapshot.testGeneratorResults[id]),
      };
      next.generatorElapsed = 0;
    }
    if (!config.monitor.integrity.enabled) {
      next.phase = MONITOR_TEST_CYCLE_SECONDS - MONITOR_TEST_INITIAL_WAIT_SECONDS;
      next.excluded = [];
      for (const id of DVOR_MONITOR_IDS) {
        next.sinceComplete[id] = 0;
        next.failures[id] = Object.fromEntries(parameters.map(key => [key, 0])) as Record<Parameter, number>;
        next.inProcess[id] = { timestamp: null, rows: monitorTestRows(config, id) };
      }
      continue;
    }
    for (const id of DVOR_MONITOR_IDS) if (installed(id)) next.sinceComplete[id] += step;
    if (next.phase === 0) for (const id of DVOR_MONITOR_IDS) {
      next.inProcess[id] = { timestamp: new Date(next.clock - step * 1000).toISOString(), rows: monitorTestRows(config, id) };
    }
    next.phase += step;
    if (next.phase > 0 && next.phase % MONITOR_TEST_STEP_SECONDS === 0) {
      const index = next.phase / MONITOR_TEST_STEP_SECONDS - 1;
      for (const id of DVOR_MONITOR_IDS) if (responding(id)) {
        const row = next.inProcess[id].rows[Math.floor(index / 4)];
        row.cells[index % 4] = sample(row, index % 4, config, id);
      }
    }
    if (next.phase >= MONITOR_TEST_CYCLE_SECONDS) {
      for (const id of DVOR_MONITOR_IDS) {
        const run = next.inProcess[id];
        if (!installed(id) || run.rows.some(row => row.cells.some(cell => cell.value === null))) continue;
        next.completed[id] = { timestamp: new Date(next.clock).toISOString(), rows: structuredClone(run.rows) };
        next.sinceComplete[id] = 0;
        for (const row of run.rows) next.failures[id][row.key] = row.cells.some(cell => cell.status === "red") ? next.failures[id][row.key] + 1 : 0;
        const failed = Object.values(next.failures[id]).some(count => count >= failureLimit);
        if (failed && !next.excluded.includes(id)) next.excluded.push(id);
        else if (run.rows.every(row => row.cells.every(cell => cell.status === "green"))) next.excluded = next.excluded.filter(item => item !== id);
      }
      next.phase = 0;
      for (const id of DVOR_MONITOR_IDS) next.inProcess[id] = { timestamp: null, rows: monitorTestRows(config, id) };
    }
    for (const id of DVOR_MONITOR_IDS) {
      if (!installed(id)) next.excluded = next.excluded.filter(item => item !== id);
      else if (next.sinceComplete[id] >= WATCHDOG_SECONDS && !next.excluded.includes(id)) next.excluded.push(id);
    }
  }
  return next;
}

export function projectDvorMonitorTests(snapshot: Dvor1150aSnapshot, tests: DvorMonitorTests): Dvor1150aSnapshot {
  const monitorAgenAlerts = snapshot.data.monitorAgenAlerts.map(row => {
    let mon1 = row.mon1, mon2 = row.mon2;
    if (row.label === "Integrity Test Failed" || row.label === "Maintenance Alert") {
      mon1 = tests.excluded.includes("mon1"); mon2 = tests.excluded.includes("mon2");
    } else if (row.label === "RMS Comm Link Failed") {
      mon1 = snapshot.monitors.mon1.enabled && !tests.responding.mon1;
      mon2 = snapshot.monitors.mon2.enabled && !tests.responding.mon2;
    }
    return row.mon1 === mon1 && row.mon2 === mon2 ? row : { ...row, mon1, mon2 };
  });
  const maintenanceAlert = snapshot.data.rmsStatus.maintenanceAlert || tests.excluded.length > 0;
  if (maintenanceAlert === snapshot.data.rmsStatus.maintenanceAlert && monitorAgenAlerts.every((row, index) => row === snapshot.data.monitorAgenAlerts[index])) return snapshot;
  const data = { ...snapshot.data, monitorAgenAlerts, rmsStatus: { ...snapshot.data.rmsStatus, maintenanceAlert } };
  return { ...snapshot, data };
}
