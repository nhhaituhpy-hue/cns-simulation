"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GeneralSettingsDialog } from "@/components/qcms/general-settings-dialog";
import { LogWindow } from "@/components/qcms/log-window";
import { QcmsToolbar, type QcmsPanel } from "@/components/qcms/qcms-toolbar";
import { ReplayDialog } from "@/components/qcms/replay-dialog";
import { SiteMonitor } from "@/components/qcms/site-monitor";
import { TerminalWindow } from "@/components/terminal/terminal-window";
import { secondaryButtonClassName, textareaClassName } from "@/components/exams/shared";
import { HardwareDiagnosisWorkspace } from "@/components/hardware/hardware-diagnosis-workspace";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import type { CandidateScenarioExamItem } from "@/lib/scenario-exams/types";
import { buildTerminalSessionCacheKey, fingerprintTerminalBaseline } from "@/lib/terminal-session-cache";
import type { Scenario } from "@/lib/types";
import { AdsbBlockDiagram } from "@/modules/devices/adsb/adsb-block-diagram";
import { useRecordingStore } from "@/stores/recording-store";
import { createTerminalStore } from "@/stores/terminal-store";
import { useScenarioExamResultReader } from "./scenario-exam-snapshot-context";
import { candidateResultStorageKey } from "@/lib/scenario-exams/browser-results";

/** QCMS and terminal share one assigned item; neither hydrates the source catalog. */
export function CandidateAdsbRuntime({ item }: { item: CandidateScenarioExamItem }) {
  const router = useRouter();
  const [view, setView] = useState<"qcms" | "terminal" | "hardware">("qcms");
  const [panel, setPanel] = useState<QcmsPanel>("sites");
  const [groundStationsOpen, setGroundStationsOpen] = useState(true);
  const [terminalStore] = useState(() => createTerminalStore());
  const [hardwareOpen, setHardwareOpen] = useState(false);
  const [hardware, setHardware] = useState<{ selected: string[]; inspected: string[]; reasoning: string }>(() => {
    try {
      const cached = window.localStorage.getItem(candidateResultStorageKey(item.sessionId, item.id));
      const payload = cached ? JSON.parse(cached).payload : null;
      return { selected: Array.isArray(payload?.scenarioHardwareSelection) ? payload.scenarioHardwareSelection : [],
        inspected: Array.isArray(payload?.scenarioHardwareInspected) ? payload.scenarioHardwareInspected : [], reasoning: typeof payload?.scenarioHardwareReasoning === "string" ? payload.scenarioHardwareReasoning : "" };
    } catch { return { selected: [], inspected: [], reasoning: "" }; }
  });
  const terminal = terminalStore();
  const sessionKey = `scenario-exam:${item.sessionId}:${item.id}`;
  const scenario = useMemo<Scenario | null>(() => {
    const definition = parseScenarioParameters("ads-b", item.definition);
    if (!definition) return null;
    return {
      ...definition,
      title: definition.name,
      difficulty: { basic: "easy", intermediate: "medium", advanced: "hard" }[definition.difficulty] as Scenario["difficulty"],
      createdAt: item.startedAt,
    };
  }, [item.definition, item.startedAt]);
  useScenarioExamResultReader(() => {
    const recording = useRecordingStore.getState();
    if (!scenario || recording.sessionKey !== sessionKey) return null;
    return { allActions: recording.allActions, selectedActions: recording.selectedActions,
      authenticatedCorrectly: recording.authenticatedCorrectly, qcmsMonitoringOpened: recording.qcmsMonitoringOpened,
      phase: recording.phase, terminal: terminalStore.getState().getPersistentState(),
      scenarioHardwareSelection: hardware.selected, scenarioHardwareInspected: hardware.inspected, scenarioHardwareReasoning: hardware.reasoning };
  });

  useEffect(() => {
    if (!scenario) return;
    useRecordingStore.getState().beginAttempt(scenario.id, sessionKey);
    const sensor = scenario.sites.flatMap((site) => [site.sensorA, site.sensorB]).find((entry) => entry?.id === scenario.targetSensorId);
    if (!sensor) return;
    terminalStore.getState().initialize({
      targetLoginUser: scenario.targetLoginUser,
      targetIpAddress: sensor.ipAddress,
      header: { sensorName: sensor.name },
      sensorDataProfile: sensor.dataProfile,
      sensorMonitoring: sensor.monitoring,
      persistenceKey: buildTerminalSessionCacheKey({
        ownerId: item.sessionId,
        sessionKey,
        sensorId: sensor.id,
        baselineRevision: `exam:${item.id}:${item.revision}:${fingerprintTerminalBaseline(sensor.dataProfile)}`,
      }),
    });
  }, [item.id, item.revision, item.sessionId, scenario, sessionKey, terminalStore]);

  if (!scenario) return <p role="alert">Không thể mở kịch bản ADS-B đã cấp.</p>;

  function showSites() {
    setPanel("sites");
    setGroundStationsOpen(true);
  }

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 sm:px-6" aria-label="Làm bài ADS-B">
      <nav aria-label="Các màn hình ADS-B" className="mb-4 flex flex-wrap gap-2">
        {([ ["qcms", "QCMS"], ["terminal", "Terminal"], ["hardware", "Sơ đồ phần cứng"] ] as const).map(([id, label]) => (
          <button key={id} type="button" className={secondaryButtonClassName} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
        ))}
      </nav>
      <div hidden={view !== "qcms"} className="overflow-hidden border-2 border-[#202a64] bg-[#8e9192]">
        <QcmsToolbar activePanel={panel} onSelect={(nextPanel) => { setPanel(nextPanel); if (nextPanel === "sites") setGroundStationsOpen(true); }} onExit={() => router.push("/student/scenario-exams/session")} />
        {panel === "sites" ? <SiteMonitor scenario={scenario} groundStationsOpen={groundStationsOpen} onCloseGroundStations={() => setGroundStationsOpen(false)} onMonitoringOpened={() => useRecordingStore.getState().markQcmsMonitoringOpened()} />
          : panel === "log" ? <LogWindow scenario={scenario} onClose={showSites} />
          : panel === "replay" ? <ReplayDialog onClose={showSites} />
          : <GeneralSettingsDialog onClose={showSites} />}
      </div>
      {view === "terminal" ? <TerminalWindow ipAddress={terminal.connectionIpAddress ?? ""} output={terminal.output} pendingPrompt={terminal.pendingPrompt} pendingSensitive={terminal.pendingSensitive} isExited={terminal.isExited} onSubmit={(input) => terminal.processInput(input)} /> : null}
      {view === "hardware" ? <div className="grid gap-4">
        {scenario.hardwareFault ? <button type="button" className={`${secondaryButtonClassName} w-fit`} onClick={() => setHardwareOpen(true)}>Kiểm tra và chọn khối/card</button> : <p className="text-sm text-[var(--text-secondary)]">Kịch bản không yêu cầu thay phần cứng.</p>}
        <div className="grid gap-3 text-sm text-[var(--text-primary)]"><p>Khối/card đã kiểm tra: {hardware.inspected.join(", ") || "Chưa kiểm tra"}</p><p>Khối/card được chọn: {hardware.selected.join(", ") || "Chưa chọn"}</p><label className="grid gap-2">Lý do xử lý phần cứng<textarea rows={4} value={hardware.reasoning} onChange={(event) => setHardware((current) => ({ ...current, reasoning: event.target.value }))} className={textareaClassName} /></label></div>
        <AdsbBlockDiagram />
      </div> : null}
      {hardwareOpen && scenario.hardwareFault ? <HardwareDiagnosisWorkspace hardwareFault={scenario.hardwareFault} onClose={() => setHardwareOpen(false)} onSubmit={(diagnosis) => { setHardware((current) => ({ ...current, selected: diagnosis.componentIds, inspected: diagnosis.inspectedComponents })); setHardwareOpen(false); }} /> : null}
    </section>
  );
}
