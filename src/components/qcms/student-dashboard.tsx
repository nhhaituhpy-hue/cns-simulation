"use client";

import { AdsbStudentDashboard } from "@/modules/devices/adsb";
import { Dme1119aStudentDashboard } from "@/modules/devices/dme-1119a";
import { Dvor1150aStudentDashboard } from "@/modules/devices/dvor-1150a";
import type { LegacyCnsModuleId } from "@/modules/core/types";

export type StudentCnsModule = LegacyCnsModuleId;

export function StudentDashboard({ activeModule = "vor" }: { activeModule?: StudentCnsModule }) {
  return (
    <div className="w-full max-w-none px-4 py-3 sm:px-6 lg:px-8 lg:py-4 xl:px-10 2xl:px-12">
      {activeModule === "vor" ? <Dvor1150aStudentDashboard /> : null}
      {activeModule === "dme" ? <Dme1119aStudentDashboard /> : null}
      {activeModule === "ads-b" ? <AdsbStudentDashboard /> : null}
    </div>
  );
}
