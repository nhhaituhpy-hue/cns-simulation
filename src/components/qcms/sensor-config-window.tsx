"use client";

import Link from "next/link";
import { ArrowClockwise, Broadcast, X } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import type { SensorDataProfile, SensorState } from "@/lib/types";

type SensorConfigWindowProps = {
  scenarioId: string;
  sensor: SensorState;
  now: number;
  onClose: () => void;
};

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"overflow-hidden rounded border border-[#b8c4ce] bg-white " + className}>
      <h3 className="border-b border-[#b8c4ce] bg-[#dce5eb] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#263746]">
        {title}
      </h3>
      <div className="p-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number | undefined;
  valueClassName: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(8rem,1fr)_minmax(7rem,1.2fr)] gap-3 border-b border-[#e2e8f0] py-1.5 last:border-b-0">
      <dt className="text-xs text-[#64748b]">{label}</dt>
      <dd className={"break-words text-right font-mono text-xs font-semibold " + valueClassName}>
        {value === undefined || value === "" ? "--" : value}
      </dd>
    </div>
  );
}

function boolLabel(value: boolean | undefined): string | undefined {
  return value === undefined ? undefined : value ? "ON" : "OFF";
}

function profileValue<T>(
  profile: SensorDataProfile | undefined,
  getter: (data: SensorDataProfile) => T,
): T | undefined {
  return profile ? getter(profile) : undefined;
}

export function SensorConfigWindow({
  scenarioId,
  sensor,
  now,
  onClose,
}: SensorConfigWindowProps) {
  const initialUpdate = sensor.monitoring?.lastSnmpResponseAt
    ? Date.parse(sensor.monitoring.lastSnmpResponseAt)
    : now;
  const [lastUpdatedAt, setLastUpdatedAt] = useState(
    Number.isNaN(initialUpdate) ? now : initialUpdate,
  );
  const profile = sensor.dataProfile;
  const valueClassName =
    now - lastUpdatedAt > 120_000 ? "text-red-500" : "text-black";
  const terminalHref =
    "/student/terminal?id=" +
    encodeURIComponent(scenarioId) +
    "&sensorId=" +
    encodeURIComponent(sensor.id);
  const clients = Array.from(
    { length: 20 },
    (_, index) => profile?.clients[index],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#172033]/50 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sensor-config-title"
        className="mx-auto w-full max-w-6xl overflow-hidden rounded-lg border border-[#40566b] bg-[#edf2f5] shadow-[0_20px_60px_rgb(15_23_42/0.35)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#172033] bg-[#263746] px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-xs text-[#cbd5e1]">QCMS Monitoring Mode</p>
            <h2 id="sensor-config-title" className="truncate text-lg font-bold">
              Sensor {sensor.sensorLabel} Configuration
            </h2>
            <p className="truncate font-mono text-xs text-[#cbd5e1]">
              {sensor.name} | {sensor.ipAddress}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Sensor Configuration" className="inline-flex size-10 shrink-0 items-center justify-center rounded hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X aria-hidden size={19} />
          </button>
        </header>

        <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto p-3 sm:p-4">
          <Panel title="Extended Control">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#64748b]">Time of last update</p>
                <p className={"mt-1 font-mono text-sm font-semibold tabular-nums " + valueClassName}>
                  {new Date(lastUpdatedAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <button type="button" onClick={() => setLastUpdatedAt(Date.now())} className="inline-flex min-h-10 items-center gap-2 rounded border border-[#64748b] bg-white px-3 text-xs font-bold text-[#263746] hover:bg-[#e8f2fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]">
                <ArrowClockwise aria-hidden size={17} />
                REFRESH
              </button>
            </div>
          </Panel>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Panel title="General Settings">
              <dl>
                <Field label="CAT21" value={boolLabel(profile?.asterix.cat21Enabled)} valueClassName={valueClassName} />
                <Field label="CRC correction" value={boolLabel(profile?.general.crcCorrection)} valueClassName={valueClassName} />
                <Field label="Ground targets" value={boolLabel(profile?.general.groundTargets)} valueClassName={valueClassName} />
                <Field label="Overload limit" value={profile?.general.targetOverloadLimit} valueClassName={valueClassName} />
              </dl>
            </Panel>
            <Panel title="GPS Position">
              <dl>
                <Field label="Latitude" value={profile?.gps.latitude} valueClassName={valueClassName} />
                <Field label="Longitude" value={profile?.gps.longitude} valueClassName={valueClassName} />
                <Field label="Altitude" value={profile?.gps.altitude} valueClassName={valueClassName} />
              </dl>
            </Panel>
            <Panel title="Target Filter">
              <dl>
                <Field label="Altitude min" value={profileValue(profile, (data) => data.filters.altitudeMin)} valueClassName={valueClassName} />
                <Field label="Altitude max" value={profileValue(profile, (data) => data.filters.altitudeMax)} valueClassName={valueClassName} />
                <Field label="Address filter" value={profile?.filters.addressFilter} valueClassName={valueClassName} />
                <Field label="Position radius" value={profileValue(profile, (data) => data.filters.positionFilterRadius)} valueClassName={valueClassName} />
              </dl>
            </Panel>
            <Panel title="ASTERIX">
              <dl>
                <Field label="SAC" value={profile?.asterix.sac} valueClassName={valueClassName} />
                <Field label="SIC" value={profile?.asterix.sic} valueClassName={valueClassName} />
                <Field label="CAT21 version" value={profile?.asterix.cat21Version} valueClassName={valueClassName} />
                <Field label="Data block size" value={profile?.asterix.dataBlockSize} valueClassName={valueClassName} />
              </dl>
            </Panel>
            <Panel title="SNMP Agent">
              <dl>
                <Field label="Sensor name" value={profile?.sensorName} valueClassName={valueClassName} />
                <Field label="SNMP agent name" value={profile?.sensorName} valueClassName={valueClassName} />
                <Field label="Version" value={profile?.sensorVersion} valueClassName={valueClassName} />
              </dl>
            </Panel>
            <Panel title="NTP Server">
              <dl>
                <Field label="Server IP" value={profile?.network.ntpServer} valueClassName={valueClassName} />
                <Field label="Sync status" value={profile ? (profile.gps.ntpEnabled ? "SYNCHRONIZED" : "DISABLED") : undefined} valueClassName={valueClassName} />
              </dl>
            </Panel>
          </div>

          <Panel title="Surveillance Clients" className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead className="bg-[#eef3f6] text-[#475569]">
                  <tr>
                    {["ID", "Name", "IP address", "Port", "Enabled"].map((heading) => (
                      <th key={heading} className="border-b border-[#b8c4ce] px-2 py-2">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={valueClassName}>
                  {clients.map((client, index) => (
                    <tr key={client?.id ?? "empty-" + index} className="odd:bg-white even:bg-[#f8fafc]">
                      <td className="border-b border-[#e2e8f0] px-2 py-1.5 font-mono">{client?.id ?? index + 1}</td>
                      <td className="border-b border-[#e2e8f0] px-2 py-1.5">{client?.name ?? "--"}</td>
                      <td className="border-b border-[#e2e8f0] px-2 py-1.5 font-mono">{client?.ip ?? "--"}</td>
                      <td className="border-b border-[#e2e8f0] px-2 py-1.5 font-mono">{client?.port ?? "--"}</td>
                      <td className="border-b border-[#e2e8f0] px-2 py-1.5">{boolLabel(client?.enabled) ?? "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <footer className="mt-4 flex flex-col-reverse gap-2 border-t border-[#b8c4ce] pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="min-h-11 rounded border border-[#64748b] bg-white px-4 text-sm font-bold text-[#263746] hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]">
              CLOSE
            </button>
            <Link href={terminalHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-[#2563eb] px-4 text-sm font-bold text-white hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2">
              <Broadcast aria-hidden size={18} />
              OPEN MAINTENANCE APPLICATION
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
