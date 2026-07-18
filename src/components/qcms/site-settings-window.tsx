"use client";

import { Prohibit } from "@phosphor-icons/react/dist/csr/Prohibit";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useEffect, type ReactNode } from "react";
import type { SensorState, SiteState } from "@/lib/types";

type SiteSettingsWindowProps = {
  site: SiteState;
  siteNumber?: number;
  onClose: () => void;
};

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-[#e2e8f0] py-1.5 last:border-b-0">
      <dt className="text-xs text-[#64748b]">{label}</dt>
      <dd className="break-words font-mono text-xs font-semibold text-[#172033]">
        {children}
      </dd>
    </div>
  );
}

function coordinateLabel(value: string | undefined, axis: "lat" | "lon") {
  if (!value) return "--";
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric)) return value;
  const direction =
    axis === "lat" ? (numeric >= 0 ? "N" : "S") : numeric >= 0 ? "E" : "W";
  return Math.abs(numeric).toFixed(4) + "\u00b0" + direction;
}

function SensorSettings({
  label,
  sensor,
}: {
  label: "A" | "B";
  sensor: SensorState | null;
}) {
  const user = sensor?.dataProfile?.snmpUsers[0];

  return (
    <section className="overflow-hidden rounded border border-[#b8c4ce] bg-white">
      <h3 className="border-b border-[#b8c4ce] bg-[#dce5eb] px-3 py-2 text-sm font-bold text-[#263746]">
        Sensor {label}
      </h3>
      <div className="p-3">
        {sensor ? (
          <>
            <dl>
              <Setting label="IP Address">{sensor.ipAddress}</Setting>
              <Setting label="SNMP Mode">
                {sensor.status === "grey" ? "Inactive" : "Active"}
              </Setting>
              <Setting label="SNMP User">{user?.name ?? "--"}</Setting>
              <Setting label="SNMP Type">{user?.authType ?? "--"}</Setting>
            </dl>
            <button type="button" disabled title="Disabled in monitoring mode" className="mt-3 inline-flex min-h-9 cursor-not-allowed items-center gap-2 rounded border border-[#cbd5e1] bg-[#f1f5f9] px-3 text-xs font-bold text-[#94a3b8]">
              <Prohibit aria-hidden size={15} />
              REMOVE SENSOR
            </button>
          </>
        ) : (
          <p className="py-4 text-center text-sm font-medium text-[#64748b]">
            Not configured
          </p>
        )}
      </div>
    </section>
  );
}

export function SiteSettingsWindow({
  site,
  siteNumber = 1,
  onClose,
}: SiteSettingsWindowProps) {
  const positionProfile =
    site.sensorA?.dataProfile ?? site.sensorB?.dataProfile;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#172033]/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="site-settings-title" className="w-full max-w-2xl overflow-hidden rounded-lg border border-[#40566b] bg-[#edf2f5] shadow-[0_20px_60px_rgb(15_23_42/0.35)]">
        <header className="flex items-center justify-between gap-4 border-b border-[#172033] bg-[#263746] px-4 py-3 text-white">
          <div>
            <p className="text-xs text-[#cbd5e1]">QCMS Monitoring Mode</p>
            <h2 id="site-settings-title" className="text-lg font-bold">
              Site Settings: {site.name}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Site Settings" className="inline-flex size-10 items-center justify-center rounded hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X aria-hidden size={19} />
          </button>
        </header>

        <div className="p-4">
          <section className="rounded border border-[#b8c4ce] bg-white p-3">
            <dl>
              <Setting label="Site Number">{siteNumber}</Setting>
              <Setting label="Latitude">
                {coordinateLabel(positionProfile?.gps.latitude, "lat")}
              </Setting>
              <Setting label="Longitude">
                {coordinateLabel(positionProfile?.gps.longitude, "lon")}
              </Setting>
            </dl>
          </section>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SensorSettings label="A" sensor={site.sensorA} />
            <SensorSettings label="B" sensor={site.sensorB} />
          </div>

          <footer className="mt-4 flex justify-end border-t border-[#b8c4ce] pt-4">
            <button type="button" onClick={onClose} className="min-h-10 rounded bg-[#2563eb] px-5 text-sm font-bold text-white hover:bg-[#1d4ed8]">
              CLOSE
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}
