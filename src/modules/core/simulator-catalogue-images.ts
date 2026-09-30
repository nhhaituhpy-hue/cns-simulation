import type { StaticImageData } from "next/image";
import adsBCatalogueImage from "../../../public/images/simulator-cataloge/ads-b-catalogue.png";
import dme1119aCatalogueImage from "../../../public/images/simulator-cataloge/DME1119A.png";
import dme320CatalogueImage from "../../../public/images/simulator-cataloge/DME320.png";
import dvor1150CatalogueImage from "../../../public/images/simulator-cataloge/DVOR1150.png";
import dvor1150aCatalogueImage from "../../../public/images/simulator-cataloge/DVOR1150A.png";
import dvor220CatalogueImage from "../../../public/images/simulator-cataloge/DVOR220.png";
import type { SimulatorModuleId } from "./types";

export type SimulatorCatalogueImage = string | StaticImageData;

/**
 * Keep the catalogue visuals shared between the landing page and the simulator
 * catalogue so the same module never drifts to a different image.
 */
export const SIMULATOR_CATALOGUE_IMAGES: Record<
  SimulatorModuleId,
  SimulatorCatalogueImage
> = {
  "dvor-1150": dvor1150CatalogueImage,
  "dvor-1150a": dvor1150aCatalogueImage,
  "dme-1119a": dme1119aCatalogueImage,
  "dvor-220": dvor220CatalogueImage,
  "dme-320": dme320CatalogueImage,
  "ads-b": adsBCatalogueImage,
  vhf: "/images/simulator-icons/vhf.png",
  vsat: "/images/simulator-icons/vsat.png",
};

export function getSimulatorCatalogueImage(
  moduleId: SimulatorModuleId,
): SimulatorCatalogueImage {
  return SIMULATOR_CATALOGUE_IMAGES[moduleId];
}
