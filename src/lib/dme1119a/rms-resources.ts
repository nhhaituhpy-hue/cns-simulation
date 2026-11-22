/**
 * RMS Status resource model (Stage 4 G19). The RMS Status screen used to
 * hard-code processor/memory utilization, the user-session count and the
 * flash-busy flag. These pure derivations tie every number to live
 * simulator state instead: utilization grows with real activity (running
 * diagnostics, special tests and self-calibrations, accumulated log
 * volume, stored configurations), sessions come from the actual
 * logon/connection state, and flash-busy is true only inside the write
 * window after a real save/backup/load/restore/apply operation.
 */

export interface DmeRmsResourceActivity {
  alarmLogEntries: number;
  maintenanceLogEntries: number;
  faultSnapshotsByMonitor: { monitor1: number; monitor2: number };
  diagnosticsActive: boolean;
  specialTestTargets: readonly (1 | 2)[];
  selfCalibrationMonitors: readonly (1 | 2)[];
  hasSavedConfiguration: boolean;
  hasBackupConfiguration: boolean;
  configDirty: boolean;
  onBattery: boolean;
}

export interface DmeRmsUtilization {
  ram: number | null;
  flash: number | null;
  nvram: number | null;
}

export type DmeRmsResourceKey = "rms" | "monitor1" | "monitor2" | "rtc1" | "rtc2" | "bcps1" | "bcps2" | "lcu";

const clampPercent = (value: number): number => Math.max(0, Math.min(99, Math.round(value)));

export function deriveDmeRmsResourceUtilization(
  activity: DmeRmsResourceActivity,
): Record<DmeRmsResourceKey, DmeRmsUtilization> {
  const logVolume = activity.alarmLogEntries + activity.maintenanceLogEntries;
  const monitor = (monitorNumber: 1 | 2): DmeRmsUtilization => ({
    ram: clampPercent(
      1
      + (activity.selfCalibrationMonitors.includes(monitorNumber) ? 22 : 0)
      + (activity.specialTestTargets.includes(monitorNumber) ? 6 : 0),
    ),
    flash: clampPercent(27 + Math.min(6, activity.faultSnapshotsByMonitor[monitorNumber === 1 ? "monitor1" : "monitor2"] * 2)),
    nvram: 1,
  });
  const rtc = (): DmeRmsUtilization => ({
    ram: clampPercent(1 + (activity.diagnosticsActive ? 8 : 0)),
    flash: clampPercent(20 + Math.min(5, Math.floor(logVolume / 20))),
    nvram: 1,
  });
  const bcps = (): DmeRmsUtilization => ({
    ram: clampPercent(62 + (activity.onBattery ? 12 : 0) + Math.min(10, Math.floor(logVolume / 10))),
    flash: clampPercent(48 + (activity.hasSavedConfiguration ? 4 : 0) + Math.min(6, Math.floor(logVolume / 8))),
    nvram: activity.configDirty ? 2 : 0,
  });
  return {
    rms: {
      ram: clampPercent(
        5
        + Math.min(30, logVolume)
        + (activity.diagnosticsActive ? 18 : 0)
        + (activity.specialTestTargets.length > 0 ? 9 : 0)
        + activity.selfCalibrationMonitors.length * 4,
      ),
      flash: clampPercent(
        46
        + (activity.hasSavedConfiguration ? 6 : 0)
        + (activity.hasBackupConfiguration ? 5 : 0)
        + Math.min(10, (activity.faultSnapshotsByMonitor.monitor1 + activity.faultSnapshotsByMonitor.monitor2) * 2)
        + Math.min(8, Math.floor(logVolume / 10)),
      ),
      nvram: clampPercent(21 + (activity.configDirty ? 9 : 0) + (activity.hasBackupConfiguration ? 4 : 0)),
    },
    monitor1: monitor(1),
    monitor2: monitor(2),
    rtc1: rtc(),
    rtc2: rtc(),
    bcps1: bcps(),
    bcps2: bcps(),
    // The LCU reports no resource utilization on the real RMS Status
    // screen; the cells stay blank rather than invented.
    lcu: { ram: null, flash: null, nvram: null },
  };
}

/**
 * User Sessions: the local PMDT session while a user is logged on, plus
 * the RCSU remote session while its connection is enabled.
 */
export function deriveDmeUserSessions(input: {
  connected: boolean;
  logonLevel: number;
  rcsuConnectionEnabled: boolean;
}): number {
  if (!input.connected) return 0;
  return (input.logonLevel > 0 ? 1 : 0) + (input.rcsuConnectionEnabled ? 1 : 0);
}

/** How long the Trend Data Flash Busy flag stays lit after a flash write. */
export const DME_FLASH_WRITE_BUSY_MS = 4000;

export function dmeFlashWriteBusy(nowMs: number, lastFlashWriteAtMs: number | null): boolean {
  if (lastFlashWriteAtMs === null) return false;
  const elapsed = nowMs - lastFlashWriteAtMs;
  return elapsed >= 0 && elapsed < DME_FLASH_WRITE_BUSY_MS;
}
