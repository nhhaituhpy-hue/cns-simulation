import { cloneDefaultDmePmdtData } from "@/lib/dme-pmdt-defaults";
import { recomputeDmeDerivedData } from "@/lib/dme1119a/derived-data";
import type { DmePmdtData } from "@/lib/dme-types";
import { hasSameJsonShape } from "./shape";
import {
  SIMULATOR_CONFIG_SCHEMA_VERSION,
  type Dme1119aPersistedConfig,
  type SimulatorConfigAdapter,
} from "./types";

export type { Dme1119aPersistedConfig } from "./types";

export function extractDme1119aConfig(data: DmePmdtData): Dme1119aPersistedConfig {
  return {
    alarmLimits: structuredClone(data.alarmLimits),
    delayControl: structuredClone(data.delayControl),
    monitorCalibrationData: structuredClone(data.monitorCalibrationData),
    monitorConfigGeneral: structuredClone(data.monitorConfigGeneral),
    monitorSystemSettings: structuredClone(data.monitorSystemSettings),
    monitorTimers: structuredClone(data.monitorTimers),
    monitorTransmitterStatus: structuredClone(data.monitorTransmitterStatus),
    rmsConfigGeneral: structuredClone(data.rmsConfigGeneral),
    rmsConfigStation: structuredClone(data.rmsConfigStation),
    txConfigNominal: structuredClone(data.txConfigNominal),
    txOffsets: structuredClone(data.txOffsets),
  };
}
export function getDefaultDme1119aConfig(): Dme1119aPersistedConfig {
  return extractDme1119aConfig(cloneDefaultDmePmdtData());
}

export function parseDme1119aConfig(value: unknown): Dme1119aPersistedConfig | null {
  if (!hasSameJsonShape(value, getDefaultDme1119aConfig())) return null;
  return structuredClone(value as Dme1119aPersistedConfig);
}

/**
 * Rebuilds a clean runtime state from the persisted configuration subset.
 * Logs, alarms, connections, session credentials and derived readings are
 * intentionally recreated from the simulator defaults.
 */
export function hydrateDme1119aData(
  persistedConfig: Dme1119aPersistedConfig,
): DmePmdtData {
  const data = cloneDefaultDmePmdtData();
  data.alarmLimits = structuredClone(persistedConfig.alarmLimits);
  data.delayControl = structuredClone(persistedConfig.delayControl);
  data.monitorCalibrationData = structuredClone(persistedConfig.monitorCalibrationData);
  data.monitorConfigGeneral = structuredClone(persistedConfig.monitorConfigGeneral);
  data.monitorSystemSettings = structuredClone(persistedConfig.monitorSystemSettings);
  data.monitorTimers = structuredClone(persistedConfig.monitorTimers);
  data.monitorTransmitterStatus = structuredClone(persistedConfig.monitorTransmitterStatus);
  data.rmsConfigGeneral = structuredClone(persistedConfig.rmsConfigGeneral);
  data.rmsConfigStation = structuredClone(persistedConfig.rmsConfigStation);
  data.txConfigNominal = structuredClone(persistedConfig.txConfigNominal);
  data.txOffsets = structuredClone(persistedConfig.txOffsets);

  data.connected = true;
  data.alert = false;
  data.manualAlertOverride = false;
  data.local = false;
  data.rmsStatus.localControlMode = false;
  data.rmsStatus.logonLevel = 0;

  return recomputeDmeDerivedData(data);
}

export const dme1119aConfigAdapter: SimulatorConfigAdapter<Dme1119aPersistedConfig> = {
  simulatorId: "dme-1119a",
  schemaVersion: SIMULATOR_CONFIG_SCHEMA_VERSION,
  getDefaultConfig: getDefaultDme1119aConfig,
  extractConfig: (value) => extractDme1119aConfig(value as DmePmdtData),
  parseConfig: parseDme1119aConfig,
};
