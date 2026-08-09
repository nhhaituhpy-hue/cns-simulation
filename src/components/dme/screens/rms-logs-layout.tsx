"use client";

import type { DmeViewId } from "@/lib/dme-types";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import {
  RmsCommandActivity,
  RmsOperationalSummary,
  RmsParameterChange,
} from "./rms-log-extra-views";
import { RmsLogsAlarms } from "./rms-logs-alarms";
import { RmsLogsMaintenance } from "./rms-logs-maintenance";
import { ScreenTabs } from "./screen-primitives";

const tabs: readonly { id: string; label: string; viewId: DmeViewId }[] = [
  { id: "summary", label: "Operational Summary", viewId: "rms-logs-operational-summary" },
  { id: "alarms", label: "Alarms", viewId: "rms-logs-alarms" },
  { id: "maintenance", label: "Maintenance Alerts", viewId: "rms-logs-maintenance" },
  { id: "commands", label: "Command Activity", viewId: "rms-logs-command-activity" },
  { id: "parameters", label: "Parameter Change", viewId: "rms-logs-parameter-change" },
];

export function RmsLogsLayout() {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const openView = useDmePmdtStore((state) => state.openView);
  const alarmLogCount = useDmePmdtStore((state) => state.data.alarmLogs.length);
  const maintenanceLogCount = useDmePmdtStore((state) => state.data.maintenanceLogs.length);
  const refreshLogs = useDmePmdtStore((state) => state.refreshLogs);
  const resetLog = useDmePmdtStore((state) => state.resetLog);
  const isSummary = activeView === "rms-logs-operational-summary";

  return (
    <section className="dme-pmdt-logs-screen flex min-h-full flex-col" aria-label="RMS Logs">
      <PmdtToolbar title="RMS Logs" />
      <ScreenTabs
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          active: tab.viewId === activeView,
          onSelect: () => openView("rms-logs", tab.viewId, ["RMS", "Logs", tab.label], tab.label),
        }))}
      />
      {!isSummary ? (
        <div className="dme-pmdt-log-actions">
          <button type="button" onClick={refreshLogs}>Update</button>
          {activeView === "rms-logs-alarms" ? (
            <span>Available Trend Records: {alarmLogCount},&nbsp; Remaining: {alarmLogCount}</span>
          ) : activeView === "rms-logs-maintenance" ? (
            <span>Available Trend Records: {maintenanceLogCount},&nbsp; Remaining: {maintenanceLogCount}</span>
          ) : <span />}
          <button type="button" disabled={activeView !== "rms-logs-alarms" && activeView !== "rms-logs-maintenance"} onClick={() => {
            if (activeView === "rms-logs-alarms" || activeView === "rms-logs-maintenance") resetLog(activeView === "rms-logs-alarms" ? "alarms" : "maintenance");
          }}>Reset</button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        {activeView === "rms-logs-operational-summary" ? <RmsOperationalSummary /> : null}
        {activeView === "rms-logs-alarms" ? <RmsLogsAlarms /> : null}
        {activeView === "rms-logs-maintenance" ? <RmsLogsMaintenance /> : null}
        {activeView === "rms-logs-command-activity" ? <RmsCommandActivity /> : null}
        {activeView === "rms-logs-parameter-change" ? <RmsParameterChange /> : null}
      </div>
    </section>
  );
}
