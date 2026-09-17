import type { SimulatorModuleDefinition } from "@/modules/core/types";

export const ADSB_MODULE = {
  id: "ads-b",
  category: "device",
  status: "available",
  name: "ADS-B",
  shortName: "ADS-B",
  description: "Mô phỏng giám sát ADS-B qua QCMS và terminal bảo trì.",
  routes: {
    admin: "/admin/ads-b",
    student: "/student/ads-b",
    simulator: "/simulator/ads-b",
    authoring: "/authoring/ads-b",
    review: "/student/ads-b",
  },
  legacyId: "ads-b",
} as const satisfies SimulatorModuleDefinition<"ads-b">;
