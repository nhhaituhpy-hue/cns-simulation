"use client";

import { useEffect, useState } from "react";
import { PracticeWorkspace } from "@/components/scenario/practice-workspace";
import { GeneralSettingsDialog } from "@/components/qcms/general-settings-dialog";
import { LogWindow } from "@/components/qcms/log-window";
import { QcmsToolbar, type QcmsPanel } from "@/components/qcms/qcms-toolbar";
import { ReplayDialog } from "@/components/qcms/replay-dialog";
import { SiteMonitor } from "@/components/qcms/site-monitor";
import { TerminalWindow } from "@/components/terminal/terminal-window";
import { HardwareDiagnosisWorkspace } from "@/components/hardware/hardware-diagnosis-workspace";
import { parseAdsbScenarioDefinition } from "@/modules/devices/adsb/scenario-parameters";
import { buildTerminalSessionCacheKey, fingerprintTerminalBaseline } from "@/lib/terminal-session-cache";
import type { Scenario, SensorState } from "@/lib/types";
import { useScenarioStore } from "@/stores/scenario-store";
import { useRecordingStore, type RecordingStoreState } from "@/stores/recording-store";
import { useTerminalStore } from "@/stores/terminal-store";

type PublishedPractice = {
  id: string; moduleId: "ads-b"; scenarioId: string; membershipId: string;
  revision: number; name: string; description: string; difficulty?: string;
  definition: unknown;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


/** Read only the authorized published snapshot, never the mutable source catalog. */
export function AdsbPracticeWorkspace({ scenarioId }: { scenarioId: string }) {
  const owner = useScenarioStore((state) => state.sessionIdentity);
  const access = useScenarioStore((state) => state.sessionScope);
  const scope = JSON.stringify([owner, access, scenarioId]);
  return <ScopedPracticeLoader key={scope} owner={owner} access={access} scenarioId={scenarioId} scope={scope} />;
}

function ScopedPracticeLoader({ owner, access, scenarioId, scope }: { owner: string | null; access: string | null; scenarioId: string; scope: string }) {
  const [loaded, setLoaded] = useState<{ scope: string; row?: PublishedPractice; error?: string } | null>(null);
  useEffect(() => {
    if (!owner || !UUID.test(scenarioId)) return;
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && useScenarioStore.getState().sessionIdentity === owner && useScenarioStore.getState().sessionScope === access;
    void (async () => {
      try {
        const response = await fetch(`/api/practice-scenarios?moduleId=ads-b&id=${encodeURIComponent(scenarioId)}`, { signal: controller.signal, cache: "no-store" });
        const row = await response.json() as PublishedPractice;
        if (!current()) return;
        if (!response.ok || row.id !== scenarioId || row.moduleId !== "ads-b" || !row.membershipId || !Number.isInteger(row.revision) || !parseAdsbScenarioDefinition(row.definition)) throw new Error("Không thể mở kịch bản ADS-B đã công bố.");
        setLoaded({ scope, row });
      } catch {
        if (current()) setLoaded({ scope, error: "Không thể mở kịch bản ADS-B đã công bố." });
      }
    })();
    return () => controller.abort();
  }, [owner, access, scenarioId, scope]);
  if (!owner) return <p role="status">Vui lòng đăng nhập để ôn tập.</p>;
  if (!UUID.test(scenarioId)) return <p role="alert">Đường dẫn kịch bản không hợp lệ.</p>;
  if (!loaded || loaded.scope !== scope) return <p role="status">Đang tải bài ôn tập ADS-B…</p>;
  if (!loaded.row) return <p role="alert">{loaded.error}</p>;
  return <NativePractice key={`${scope}:${loaded.row.membershipId}:${loaded.row.revision}`} owner={owner} access={access} row={loaded.row} />;
}

function readRun(key: string) {
  try { const saved = sessionStorage.getItem(key); if (saved) return saved; } catch { /* Optional cache. */ }
  const run = crypto.randomUUID();
  try { sessionStorage.setItem(key, run); } catch { /* Optional cache. */ }
  return run;
}

function NativePractice({ owner, access, row }: { owner: string; access: string | null; row: PublishedPractice }) {
  const definition = parseAdsbScenarioDefinition(row.definition)!;
  const [scenario] = useState<Scenario>(() => ({ ...definition, title: row.name, description: row.description, difficulty: { basic: "easy", intermediate: "medium", advanced: "hard" }[definition.difficulty] as Scenario["difficulty"], createdAt: `practice:${row.revision}` }));
  const runStorageKey = `cns:adsb-practice-run:${JSON.stringify([owner, access, row.id, row.membershipId, row.revision])}`;
  const [run, setRun] = useState(() => readRun(runStorageKey));
  const sessionKey = `practice:${owner}:${row.membershipId}:${row.revision}:${run}`;
  const sensor = scenario.sites.flatMap((site) => [site.sensorA, site.sensorB]).find((entry) => entry?.id === scenario.targetSensorId)!;
  const cacheKey = buildTerminalSessionCacheKey({ ownerId: `${owner}:${row.membershipId}`, sessionKey, sensorId: sensor.id, baselineRevision: `${row.revision}:${fingerprintTerminalBaseline(sensor.dataProfile)}` });
  const recording = useRecordingStore();
  const terminal = useTerminalStore();
  const [view, setView] = useState<"qcms" | "terminal">("qcms");
  const [panel, setPanel] = useState<QcmsPanel>("sites");
  const [groundStationsOpen, setGroundStationsOpen] = useState(true);
  const [hardwareOpen, setHardwareOpen] = useState(false);
  const validIdentity = () => useScenarioStore.getState().sessionIdentity === owner && useScenarioStore.getState().sessionScope === access;
  useEffect(() => {
    if (!validIdentity()) return;
    const journalKey = `${cacheKey}:journal`;
    if (useRecordingStore.getState().sessionKey !== sessionKey) {
      useRecordingStore.getState().beginAttempt(scenario.id, sessionKey);
      try {
        const saved = JSON.parse(sessionStorage.getItem(journalKey) ?? "null") as RecordingStoreState | null;
        if (saved?.scenarioId === scenario.id && saved.sessionKey === sessionKey && Array.isArray(saved.allActions) && Array.isArray(saved.selectedActions)) {
          useRecordingStore.setState({ phase: saved.phase, isRecording: saved.isRecording, authenticatedCorrectly: saved.authenticatedCorrectly, qcmsMonitoringOpened: saved.qcmsMonitoringOpened, allActions: saved.allActions, selectedActions: saved.selectedActions, diagnosedComponentIds: saved.diagnosedComponentIds ?? [], inspectedComponentIds: saved.inspectedComponentIds ?? [] });
        }
      } catch { /* A broken optional cache never restores another run. */ }
    }
    useTerminalStore.getState().initialize({ targetLoginUser: scenario.targetLoginUser, targetIpAddress: sensor.ipAddress, header: { sensorName: sensor.name }, sensorDataProfile: sensor.dataProfile, sensorMonitoring: sensor.monitoring, persistenceKey: cacheKey });
    const unsubscribe = useRecordingStore.subscribe((state) => {
      if (!validIdentity() || state.sessionKey !== sessionKey) return;
      const { scenarioId, phase, isRecording, authenticatedCorrectly, qcmsMonitoringOpened, allActions, selectedActions, diagnosedComponentIds, inspectedComponentIds } = state;
      try { sessionStorage.setItem(journalKey, JSON.stringify({ scenarioId, sessionKey, phase, isRecording, authenticatedCorrectly, qcmsMonitoringOpened, allActions, selectedActions, diagnosedComponentIds, inspectedComponentIds })); } catch { /* Optional browser cache. */ }
    });
    return () => {
      unsubscribe();
      if (!validIdentity()) {
        useRecordingStore.getState().resetAttempt();
        useTerminalStore.setState({ authPhase: "not-initialized", isLoggedIn: false, output: [], outputLines: [] });
      }
    };
  // Only the native run/baseline changes initialization, never store updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, sessionKey, scenario, owner, access]);
  const ready = recording.sessionKey === sessionKey;
  const hardwareAvailable = Boolean(scenario.hardwareFault) && ready && recording.phase === "hardware";
  function showSites() { setPanel("sites"); setGroundStationsOpen(true); }
  function openMaintenance(selectedSensor: SensorState) {
    const state = useRecordingStore.getState();
    if (!validIdentity() || state.sessionKey !== sessionKey || selectedSensor.id !== scenario.targetSensorId) return;
    if (state.phase === "qcms") state.startTerminal();
    setView("terminal");
  }
  function getPayload() {
    const state = useRecordingStore.getState();
    if (!validIdentity() || state.sessionKey !== sessionKey) return null;
    return { allActions: state.allActions, selectedActions: state.selectedActions, authenticatedCorrectly: state.authenticatedCorrectly, qcmsMonitoringOpened: state.qcmsMonitoringOpened, phase: state.phase, terminal: useTerminalStore.getState().getPersistentState(), scenarioHardwareSelection: state.diagnosedComponentIds, scenarioHardwareInspected: state.inspectedComponentIds };
  }
  function restart() {
    if (!validIdentity()) return false;
    useTerminalStore.getState().clearPersistedSession();
    useRecordingStore.getState().resetAttempt();
    try { sessionStorage.removeItem(`${cacheKey}:journal`); } catch { /* Optional browser cache. */ }
    const next = crypto.randomUUID();
    try { sessionStorage.setItem(runStorageKey, next); } catch { /* Optional cache. */ }
    setRun(next); setHardwareOpen(false); setView("qcms"); showSites();
  }
  return <PracticeWorkspace moduleId="ads-b" scenario={ready ? { id: row.id, membershipId: row.membershipId, name: row.name, description: row.description, difficulty: row.difficulty } : null} attemptKey={sessionKey} getPayload={getPayload} onRestart={restart} hardware={{ available: hardwareAvailable, reason: scenario.hardwareFault ? "Hoàn tất Terminal trước khi xác định phần cứng." : "Kịch bản không yêu cầu xử lý phần cứng.", onOpen: () => { if (hardwareAvailable && validIdentity()) setHardwareOpen(true); } }}>
    <div className="min-w-0 max-w-full space-y-3 overflow-x-auto">
      <nav aria-label="Các màn hình ADS-B" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={view === "qcms"} onClick={() => setView("qcms")}>QCMS</button>
        <button type="button" disabled={!ready} aria-pressed={view === "terminal"} onClick={() => openMaintenance(sensor)}>Terminal</button>
      </nav>
      <div hidden={view !== "qcms"} className="max-w-full overflow-x-auto border-2 border-[#202a64] bg-[#8e9192]">
        <div className="min-w-[920px]">
          <QcmsToolbar activePanel={panel} onSelect={(next) => { setPanel(next); if (next === "sites") setGroundStationsOpen(true); }} onExit={() => { window.location.assign("/review/ads-b"); }} />
          {panel === "sites" ? <SiteMonitor scenario={scenario} groundStationsOpen={groundStationsOpen} onCloseGroundStations={() => setGroundStationsOpen(false)} onMonitoringOpened={() => { if (validIdentity() && useRecordingStore.getState().sessionKey === sessionKey) useRecordingStore.getState().markQcmsMonitoringOpened(); }} onMaintenance={openMaintenance} /> : panel === "log" ? <LogWindow scenario={scenario} onClose={showSites} /> : panel === "replay" ? <ReplayDialog onClose={showSites} /> : <GeneralSettingsDialog onClose={showSites} />}
        </div>
      </div>
      {view === "terminal" && ready ? <>
        <TerminalWindow ipAddress={sensor.ipAddress} output={terminal.output} pendingPrompt={terminal.pendingPrompt} pendingSensitive={terminal.pendingSensitive} isExited={terminal.isExited} onSubmit={(input) => { if (validIdentity() && useRecordingStore.getState().sessionKey === sessionKey) useTerminalStore.getState().processInput(input); }} />
        <section aria-label="Nhật ký thao tác" className="min-w-0 space-y-2 break-words text-sm">
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={recording.toggleRecording}>{recording.isRecording ? "Tạm dừng ghi" : "Tiếp tục ghi"}</button>
            <button type="button" onClick={recording.selectAll}>Chọn tất cả thao tác</button>
            <button type="button" onClick={recording.clearSelection}>Bỏ chọn thao tác</button>
          </div>
          <ol>{recording.allActions.map((action) => <li key={action.step}><label className="flex items-start gap-2"><input type="checkbox" checked={recording.selectedActions.some((selected) => selected.step === action.step)} onChange={() => recording.toggleSelectAction(action.step)} /><span>{action.step}. {action.menuTitle}: {action.input} — {action.resultLabel}</span></label></li>)}</ol>
          {scenario.hardwareFault ? <button type="button" disabled={!recording.authenticatedCorrectly || !recording.selectedActions.length || recording.phase !== "terminal"} onClick={() => { recording.completeTerminal(); setView("qcms"); }}>Hoàn tất Terminal và tiếp tục</button> : null}
        </section>
      </> : null}
      {hardwareOpen && hardwareAvailable && scenario.hardwareFault ? <HardwareDiagnosisWorkspace hardwareFault={scenario.hardwareFault} submitLabel="Lưu lựa chọn phần cứng" onClose={() => setHardwareOpen(false)} onSubmit={(diagnosis) => { if (!validIdentity() || useRecordingStore.getState().sessionKey !== sessionKey) return; useRecordingStore.setState({ diagnosedComponentIds: diagnosis.componentIds, inspectedComponentIds: diagnosis.inspectedComponents }); setHardwareOpen(false); }} /> : null}
    </div>
  </PracticeWorkspace>;
}
