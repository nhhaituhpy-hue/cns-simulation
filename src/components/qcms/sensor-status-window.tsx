"use client";

import { Pause } from "@phosphor-icons/react/dist/csr/Pause";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { Stop } from "@phosphor-icons/react/dist/csr/Stop";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useEffect, useRef, useState } from "react";
import type { SensorState } from "@/lib/types";

type SensorStatusWindowProps = {
  sensor: SensorState;
  onClose: () => void;
};

export interface Cat23StatusMessage {
  id: string;
  time: string;
  service: "ADS-B" | "GPS" | "SNMP";
  type: "Status" | "Heartbeat";
  reference: number;
  status: string;
}

type StreamMode = "live" | "paused" | "stopped";

function timeLabel(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(11, 19);
}

function adsbStatus(sensor: SensorState): string {
  if (sensor.status === "red") return "OUT OF SERVICE";
  if (sensor.status === "yellow") return "NO SURVEILLANCE DATA";
  if (sensor.status === "orange") return "DEGRADED";
  return sensor.status === "green" ? "OPERATIONAL" : "STATE UNKNOWN";
}

export function generateSensorStatusMessages(
  sensor: SensorState,
  baseTime = Date.now(),
): Cat23StatusMessage[] {
  const gps = sensor.monitoring?.gpsStatus;
  return [
    {
      id: "adsb-" + baseTime,
      time: timeLabel(baseTime),
      service: "ADS-B",
      type: "Status",
      reference: 1,
      status: adsbStatus(sensor),
    },
    {
      id: "gps-" + baseTime,
      time: timeLabel(baseTime),
      service: "GPS",
      type: "Status",
      reference: 1,
      status:
        gps === "synchronized"
          ? "SYNCHRONIZED"
          : gps === "unsynchronized"
            ? "UNSYNCHRONIZED"
            : "UNAVAILABLE",
    },
    {
      id: "snmp-" + baseTime,
      time: timeLabel(baseTime + 1000),
      service: "SNMP",
      type: "Heartbeat",
      reference: 1,
      status: sensor.status === "red" ? "TIMEOUT" : "OK",
    },
  ];
}

function statusColor(status: string): string {
  if (["OPERATIONAL", "SYNCHRONIZED", "OK"].includes(status)) {
    return "text-green-700";
  }
  if (["DEGRADED", "UNSYNCHRONIZED", "NO SURVEILLANCE DATA"].includes(status)) {
    return "text-amber-700";
  }
  return "text-red-700";
}

export function SensorStatusWindow({
  sensor,
  onClose,
}: SensorStatusWindowProps) {
  const [mode, setMode] = useState<StreamMode>("live");
  const [messages, setMessages] = useState<Cat23StatusMessage[]>(() =>
    generateSensorStatusMessages(sensor),
  );
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef(2);

  useEffect(() => {
    if (mode !== "live") return;
    const timer = window.setInterval(() => {
      const generated = generateSensorStatusMessages(sensor, Date.now());
      const next = generated[sequenceRef.current % generated.length];
      sequenceRef.current += 1;
      if (!next) return;
      setMessages((current) => [...current, next].slice(-1000));
    }, 1500);
    return () => window.clearInterval(timer);
  }, [mode, sensor]);

  useEffect(() => {
    if (mode === "live" && tableContainerRef.current) {
      tableContainerRef.current.scrollTop =
        tableContainerRef.current.scrollHeight;
    }
  }, [messages, mode]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#172033]/50 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sensor-status-title"
        className="w-full max-w-5xl overflow-hidden rounded-lg border border-[#40566b] bg-white shadow-[0_20px_60px_rgb(15_23_42/0.35)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#172033] bg-[#263746] px-4 py-3 text-white">
          <div>
            <h2 id="sensor-status-title" className="text-lg font-bold">
              Sensor {sensor.sensorLabel} Status - CAT 23
            </h2>
            <p className="font-mono text-xs text-[#cbd5e1]">
              {sensor.name} | {sensor.ipAddress}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Sensor Status" className="inline-flex size-10 items-center justify-center rounded hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X aria-hidden size={19} />
          </button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#b8c4ce] bg-[#edf2f5] px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#334155]" role="status">
            <span className={"size-2.5 rounded-full " + (mode === "live" ? "bg-green-500" : mode === "paused" ? "bg-amber-500" : "bg-red-500")} />
            {mode === "live" ? "Live mode" : mode === "paused" ? "Paused" : "Stopped"}
            <span className="font-mono font-normal text-[#64748b]">
              {messages.length}/1000
            </span>
          </div>
          <div className="flex gap-2" role="group" aria-label="CAT 23 stream controls">
            <button type="button" onClick={() => setMode("paused")} disabled={mode !== "live"} className="inline-flex min-h-9 items-center gap-1.5 rounded border border-[#94a3b8] bg-white px-3 text-xs font-bold text-[#334155] disabled:opacity-40">
              <Pause aria-hidden size={15} /> PAUSE
            </button>
            <button type="button" onClick={() => setMode("stopped")} disabled={mode === "stopped"} className="inline-flex min-h-9 items-center gap-1.5 rounded border border-[#94a3b8] bg-white px-3 text-xs font-bold text-[#334155] disabled:opacity-40">
              <Stop aria-hidden size={15} /> STOP
            </button>
            <button type="button" onClick={() => setMode("live")} disabled={mode === "live"} className="inline-flex min-h-9 items-center gap-1.5 rounded bg-[#2563eb] px-3 text-xs font-bold text-white disabled:opacity-40">
              <Play aria-hidden size={15} /> PLAY
            </button>
          </div>
        </div>

        <div ref={tableContainerRef} className="max-h-[30rem] min-h-72 overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left font-mono text-xs">
            <thead className="sticky top-0 z-10 bg-[#dce5eb] text-[#334155]">
              <tr>
                {["Time", "Service", "Type", "Reference", "Status"].map((heading) => (
                  <th key={heading} className="border-b border-[#94a3b8] px-4 py-2.5">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id} className="odd:bg-white even:bg-[#f8fafc]">
                  <td className="border-b border-[#e2e8f0] px-4 py-2 tabular-nums text-[#475569]">{message.time}</td>
                  <td className="border-b border-[#e2e8f0] px-4 py-2 font-bold">{message.service}</td>
                  <td className="border-b border-[#e2e8f0] px-4 py-2">{message.type}</td>
                  <td className="border-b border-[#e2e8f0] px-4 py-2 tabular-nums">{message.reference}</td>
                  <td className={"border-b border-[#e2e8f0] px-4 py-2 font-bold " + statusColor(message.status)}>{message.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="flex justify-end border-t border-[#b8c4ce] bg-[#edf2f5] p-3">
          <button type="button" onClick={onClose} className="min-h-10 rounded border border-[#64748b] bg-white px-4 text-sm font-bold text-[#263746] hover:bg-[#f8fafc]">
            CLOSE
          </button>
        </footer>
      </section>
    </div>
  );
}
