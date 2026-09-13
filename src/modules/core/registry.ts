import { ADSB_MODULE } from "@/modules/devices/adsb/manifest";
import { DME_1119A_MODULE } from "@/modules/devices/dme-1119a/manifest";
import { DVOR_1150_MODULE } from "@/modules/devices/dvor-1150/manifest";
import { DVOR_1150A_MODULE } from "@/modules/devices/dvor-1150a/manifest";
import { DME_320_SOFTWARE_MODULE } from "@/modules/operations/dme-320/manifest";
import { DVOR_220_SOFTWARE_MODULE } from "@/modules/operations/dvor-220/manifest";
import { VHF_SOFTWARE_MODULE } from "@/modules/operations/vhf/manifest";
import { VSAT_SOFTWARE_MODULE } from "@/modules/operations/vsat/manifest";
import type {
  DeviceSimulatorModuleId,
  LegacyCnsModuleId,
  OperationsSoftwareModuleId,
  SimulatorModuleDefinition,
  SimulatorModuleId,
} from "./types";

export const DEVICE_SIMULATOR_MODULES = [
  DVOR_1150_MODULE,
  DVOR_1150A_MODULE,
  DME_1119A_MODULE,
  ADSB_MODULE,
] as const;

export const OPERATIONS_SOFTWARE_MODULES = [
  DVOR_220_SOFTWARE_MODULE,
  DME_320_SOFTWARE_MODULE,
  VHF_SOFTWARE_MODULE,
  VSAT_SOFTWARE_MODULE,
] as const;

export const SIMULATOR_MODULES = [
  DVOR_1150_MODULE,
  DVOR_1150A_MODULE,
  DME_1119A_MODULE,
  DVOR_220_SOFTWARE_MODULE,
  DME_320_SOFTWARE_MODULE,
  ADSB_MODULE,
  VHF_SOFTWARE_MODULE,
  VSAT_SOFTWARE_MODULE,
] as const;

/** Keep Simulator, Kịch bản and Ôn tập in the same module order. */
export const TRAINING_MODULES = SIMULATOR_MODULES;

const modulesById = new Map<SimulatorModuleId, SimulatorModuleDefinition>(
  SIMULATOR_MODULES.map((module) => [module.id, module] as const),
);

const devicesByLegacyId = new Map<LegacyCnsModuleId, (typeof DEVICE_SIMULATOR_MODULES)[number]>(
  DEVICE_SIMULATOR_MODULES.flatMap((module) =>
    "legacyId" in module ? [[module.legacyId, module] as const] : [],
  ),
);

export function getSimulatorModule(moduleId: string): SimulatorModuleDefinition | undefined {
  return modulesById.get(moduleId as SimulatorModuleId);
}

export function getDeviceSimulatorModule(
  moduleId: DeviceSimulatorModuleId,
): (typeof DEVICE_SIMULATOR_MODULES)[number] {
  const foundModule = modulesById.get(moduleId);
  if (!foundModule || foundModule.category !== "device") {
    throw new Error(`Unknown device simulator module: ${moduleId}`);
  }
  return foundModule as (typeof DEVICE_SIMULATOR_MODULES)[number];
}

export function getDeviceModuleByLegacyId(
  legacyId: LegacyCnsModuleId,
): (typeof DEVICE_SIMULATOR_MODULES)[number] {
  const foundModule = devicesByLegacyId.get(legacyId);
  if (!foundModule) throw new Error(`Unknown legacy CNS module: ${legacyId}`);
  return foundModule;
}


export function isOperationsSoftwareModuleId(
  moduleId: string,
): moduleId is OperationsSoftwareModuleId {
  return OPERATIONS_SOFTWARE_MODULES.some((module) => module.id === moduleId);
}

export function getOperationsSoftwareModule(moduleId: string) {
  return OPERATIONS_SOFTWARE_MODULES.find((module) => module.id === moduleId);
}
