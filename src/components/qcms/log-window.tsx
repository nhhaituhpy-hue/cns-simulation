"use client";

import { Funnel } from "@phosphor-icons/react/dist/csr/Funnel";
import { ListBullets } from "@phosphor-icons/react/dist/csr/ListBullets";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useMemo, useState } from "react";
import type { QcmsEvent, Scenario, SensorState, SiteState } from "@/lib/types";

type LogWindowProps = {
  scenario: Scenario;
  onClose: () => void;
};

const EVENT_TYPES = ["snmp", "qcms", "selfmon", "error", "line"] as const;
type EventType = (typeof EVENT_TYPES)[number];

const EVENT_STYLES: Record<
  EventType,
  { label: string; text: string; badge: string }
> = {
  snmp: {
    label: "SNMP",
    text: "text-blue-600",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
  },
  qcms: {
    label: "QCMS",
    text: "text-gray-600",
    badge: "border-gray-200 bg-gray-50 text-gray-700",
  },
  selfmon: {
    label: "SELFMON",
    text: "text-green-600",
    badge: "border-green-200 bg-green-50 text-green-700",
  },
  error: {
    label: "ERROR",
    text: "text-red-600",
    badge: "border-red-200 bg-red-50 text-red-700",
  },
  line: {
    label: "LINE",
    text: "text-orange-600",
    badge: "border-orange-200 bg-orange-50 text-orange-700",
  },
};

function timestampAt(baseTime: number, sequence: number): string {
  return new Date(baseTime + sequence * 17_000).toISOString().slice(11, 19);
}

function sensorEvents(
  site: SiteState,
  sensor: SensorState,
): Array<Omit<QcmsEvent, "timestamp">> {
  const source = site.name + " / Sensor " + sensor.sensorLabel;

  switch (sensor.status) {
    case "green":
      return [
        { type: "selfmon", message: source + ": heartbeat OK" },
        { type: "snmp", message: source + ": SNMP response received" },
      ];
    case "red":
      return [
        { type: "error", message: source + ": no SNMP response" },
        { type: "line", message: source + ": surveillance data lost" },
      ];
    case "orange":
      return [
        { type: "snmp", message: source + ": SNMP trap received" },
        { type: "line", message: source + ": temperature warning" },
      ];
    case "yellow":
      return [
        { type: "line", message: source + ": no surveillance data" },
        { type: "snmp", message: source + ": SNMP communication OK" },
      ];
    case "turquoise":
      return [
        { type: "qcms", message: source + ": maintenance mode active" },
      ];
    case "magenta":
      return [
        { type: "selfmon", message: source + ": self-monitoring alarm" },
      ];
    case "grey":
      return [{ type: "qcms", message: source + ": state unavailable" }];
  }
}

export function generateScenarioEvents(scenario: Scenario): QcmsEvent[] {
  const parsedTime = Date.parse(scenario.updatedAt ?? scenario.createdAt);
  const baseTime = Number.isNaN(parsedTime) ? Date.UTC(2026, 0, 1) : parsedTime;
  const events: Array<Omit<QcmsEvent, "timestamp">> = [
    { type: "qcms", message: "QCMS event log initialized" },
  ];

  for (const site of scenario.sites) {
    for (const sensor of [site.sensorA, site.sensorB]) {
      if (sensor) events.push(...sensorEvents(site, sensor));
    }
  }

  return events.map((event, index) => ({
    ...event,
    timestamp: timestampAt(baseTime, index),
  }));
}

export function LogWindow({ scenario, onClose }: LogWindowProps) {
  const [enabledTypes, setEnabledTypes] = useState<Record<EventType, boolean>>(
    () => ({
      snmp: true,
      qcms: true,
      selfmon: true,
      error: true,
      line: true,
    }),
  );
  const events = useMemo(
    () => (scenario.eventLog ?? generateScenarioEvents(scenario)).slice(-1000),
    [scenario],
  );
  const visibleEvents = events.filter((event) => enabledTypes[event.type]);

  function toggleType(type: EventType) {
    setEnabledTypes((current) => ({
      ...current,
      [type]: !current[type],
    }));
  }

  return (
    <section aria-labelledby="qcms-log-title" className="bg-[#edf2f5]">
      <header className="flex items-center justify-between gap-4 border-b border-[#40566b] bg-[#263746] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <ListBullets aria-hidden size={21} />
          <div>
            <h2 id="qcms-log-title" className="text-base font-bold">
              Event Log
            </h2>
            <p className="text-xs text-[#cbd5e1]">
              {visibleEvents.length}/{events.length} events displayed
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-10 items-center gap-2 rounded border border-[#718296] px-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X aria-hidden size={16} />
          CLOSE
        </button>
      </header>

      <div className="border-b border-[#b8c4ce] bg-white px-4 py-3">
        <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <legend className="sr-only">Filter events by type</legend>
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#475569]">
            <Funnel aria-hidden size={15} />
            Filters
          </span>
          {EVENT_TYPES.map((type) => (
            <label
              key={type}
              className={"flex min-h-8 cursor-pointer items-center gap-2 text-xs font-semibold " + EVENT_STYLES[type].text}
            >
              <input
                type="checkbox"
                checked={enabledTypes[type]}
                onChange={() => toggleType(type)}
                className="size-4 accent-[#2563eb]"
              />
              {EVENT_STYLES[type].label}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="max-h-[32rem] min-h-72 overflow-auto bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left font-mono text-xs">
          <thead className="sticky top-0 z-10 bg-[#dce5eb] text-[#334155]">
            <tr>
              <th className="w-28 border-b border-[#94a3b8] px-4 py-2.5">Time</th>
              <th className="w-28 border-b border-[#94a3b8] px-3 py-2.5">Type</th>
              <th className="border-b border-[#94a3b8] px-3 py-2.5">Message</th>
            </tr>
          </thead>
          <tbody>
            {visibleEvents.map((event, index) => {
              const style = EVENT_STYLES[event.type];
              return (
                <tr key={event.timestamp + "-" + event.type + "-" + index} className="odd:bg-white even:bg-[#f8fafc]">
                  <td className="border-b border-[#e2e8f0] px-4 py-2 tabular-nums text-[#475569]">
                    {event.timestamp}
                  </td>
                  <td className="border-b border-[#e2e8f0] px-3 py-2">
                    <span className={"inline-flex rounded border px-1.5 py-0.5 font-sans text-[10px] font-bold " + style.badge}>
                      {style.label}
                    </span>
                  </td>
                  <td className={"border-b border-[#e2e8f0] px-3 py-2 " + style.text}>
                    {event.message}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleEvents.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#64748b]">
            No events match the selected filters.
          </p>
        ) : null}
      </div>
    </section>
  );
}
