import type { SimulatorModuleId } from "./types";

export const SIMULATOR_ICON_IMAGES: Record<SimulatorModuleId, string> = {
  "dvor-1150": "/images/simulator-icons/dvor-1150.png",
  "dvor-1150a": "/images/simulator-icons/dvor-1150.png",
  "dme-1119a": "/images/simulator-icons/dme-1119a.png",
  "dvor-220": "/images/simulator-icons/dvor-220.png",
  "dme-320": "/images/simulator-icons/dme-1119a.png",
  "ads-b": "/images/simulator-icons/ads-b.png",
  vhf: "/images/simulator-icons/vhf.png",
  vsat: "/images/simulator-icons/vsat.png",
};

export function getSimulatorIconImage(moduleId: SimulatorModuleId) {
  return SIMULATOR_ICON_IMAGES[moduleId];
}
