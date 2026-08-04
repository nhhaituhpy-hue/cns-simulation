import type { SimulatorModuleDefinition } from "@/modules/core/types";

export const VHF_SOFTWARE_MODULE = {
  id: "vhf",
  category: "operations-software",
  status: "planned",
  name: "Phần mềm khai thác VHF",
  shortName: "VHF",
  description: "Khung mô phỏng phần mềm vận hành và bảo dưỡng hệ thống VHF.",
  routes: {
    admin: "/admin/software/vhf",
    student: "/student/software/vhf",
    simulator: "/simulator/software/vhf",
    authoring: "/authoring/vhf",
    review: "/review/vhf",
  },
} as const satisfies SimulatorModuleDefinition<"vhf">;
