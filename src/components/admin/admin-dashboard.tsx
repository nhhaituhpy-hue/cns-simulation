"use client";

import { AdsbAdminDashboard } from "@/modules/devices/adsb";
import { Dme1119aAdminDashboard } from "@/modules/devices/dme-1119a";
import { Dvor1150aAdminDashboard } from "@/modules/devices/dvor-1150a";
import type { LegacyCnsModuleId } from "@/modules/core/types";

export type CnsModule = LegacyCnsModuleId;

export function AdminDashboard({ activeModule = "vor" }: { activeModule?: CnsModule }) {
  return (
    <div className="w-full max-w-none px-4 py-3 sm:px-6 lg:px-8 lg:py-4 xl:px-10 2xl:px-12">
      {activeModule === "vor" ? <Dvor1150aAdminDashboard /> : null}
      {activeModule === "dme" ? <Dme1119aAdminDashboard /> : null}
      {activeModule === "ads-b" ? <AdsbAdminDashboard /> : null}
    </div>
  );
}
