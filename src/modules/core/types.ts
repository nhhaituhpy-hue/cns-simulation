export type SimulatorModuleCategory = "device" | "operations-software";
export type SimulatorModuleStatus = "available" | "planned";

export type DeviceSimulatorModuleId =
  | "dvor-1150a"
  | "dvor-1150"
  | "dme-1119a"
  | "ads-b";

export type OperationsSoftwareModuleId =
  | "dvor-1150"
  | "dvor-220"
  | "dme-320"
  | "vhf"
  | "vsat";

export type SimulatorModuleId =
  | DeviceSimulatorModuleId
  | OperationsSoftwareModuleId;

/**
 * Route identifiers retained while the existing URLs and persisted data are
 * migrated to model-specific names.
 */
export type LegacyCnsModuleId = "vor" | "dme" | "ads-b";

export interface SimulatorModuleRoutes {
  admin: string;
  student: string;
  simulator: string;
  authoring: string;
  review: string;
}

export interface SimulatorModuleDefinition<
  TId extends SimulatorModuleId = SimulatorModuleId,
> {
  id: TId;
  category: SimulatorModuleCategory;
  /** Availability of the standalone simulator workspace. */
  status: SimulatorModuleStatus;
  /**
   * Authoring and review can lag behind a standalone simulator. When omitted,
   * the training workspaces inherit `status` for backward compatibility.
   */
  trainingStatus?: SimulatorModuleStatus;
  /** Review can be released independently while scenario authoring remains planned. */
  reviewStatus?: SimulatorModuleStatus;
  name: string;
  shortName: string;
  description: string;
  routes: SimulatorModuleRoutes;
  legacyId?: LegacyCnsModuleId;
}
