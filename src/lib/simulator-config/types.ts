import type { DmePmdtData } from "@/lib/dme-types";
import type { Dvor1150aConfig } from "@/lib/dvor1150a/config-types";
import type { Dvor1150Config } from "@/lib/dvor1150/types";
import type { Dme320Config } from "@/modules/operations/dme-320/domain/types";
import type { Dvor220Configuration } from "@/modules/operations/dvor-220/domain/types";
import type { TerminalEnginePersistentState } from "@/lib/terminal-engine";

export const SIMULATOR_CONFIG_SCHEMA_VERSION = 1 as const;

export type SupportedSimulatorConfigId =
  | "dvor-1150a"
  | "dme-1119a"
  | "dvor-1150"
  | "dvor-220"
  | "dme-320"
  | "ads-b";

export type SimulatorConfigAction = "apply" | "restore" | "backup" | "flash-save";

export type Dvor1150aPersistedConfig = Dvor1150aConfig;

export type Dvor1150PersistedConfig = Dvor1150Config;
export type Dvor220PersistedConfig = Dvor220Configuration;
export type Dme320PersistedConfig = Dme320Config;
export type AdsbPersistedConfig = TerminalEnginePersistentState;

export type Dme1119aPersistedConfig = {
  alarmLimits: DmePmdtData["alarmLimits"];
  delayControl: DmePmdtData["delayControl"];
  monitorCalibrationData: DmePmdtData["monitorCalibrationData"];
  monitorConfigGeneral: DmePmdtData["monitorConfigGeneral"];
  monitorSystemSettings: DmePmdtData["monitorSystemSettings"];
  monitorTimers: DmePmdtData["monitorTimers"];
  monitorTransmitterStatus: DmePmdtData["monitorTransmitterStatus"];
  rmsConfigGeneral: DmePmdtData["rmsConfigGeneral"];
  rmsConfigStation: DmePmdtData["rmsConfigStation"];
  txConfigNominal: DmePmdtData["txConfigNominal"];
  txOffsets: DmePmdtData["txOffsets"];
};

export interface SimulatorConfigRecord {
  id: string;
  user_id: string;
  simulator_id: SupportedSimulatorConfigId;
  schema_version: number;
  initial_config: unknown;
  applied_config: unknown;
  backup_config: unknown;
  preferences: Record<string, unknown>;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface SimulatorConfigResponse {
  simulatorId: SupportedSimulatorConfigId;
  schemaVersion: number;
  initialConfig: unknown;
  appliedConfig: unknown;
  backupConfig: unknown;
  preferences: Record<string, unknown>;
  revision: number;
  persisted: boolean;
}

export interface SimulatorConfigApplyResponse extends SimulatorConfigResponse {
  action: SimulatorConfigAction;
}

export interface SimulatorConfigAdapter<TConfig> {
  simulatorId: SupportedSimulatorConfigId;
  schemaVersion: typeof SIMULATOR_CONFIG_SCHEMA_VERSION;
  getDefaultConfig(): TConfig;
  extractConfig(value: unknown): TConfig;
  parseConfig(value: unknown): TConfig | null;
}
