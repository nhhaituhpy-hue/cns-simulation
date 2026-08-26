"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { Dvor220ConfigPersistenceBoundary } from "@/components/simulator/simulator-config-persistence";
import {
  MopiensBeveledButton,
  MopiensConnectionDialog,
  MopiensLoginDialog,
  MopiensPmdtShell,
  type MopiensConnectionDetail,
  type MopiensConnectionProfileOption,
  type MopiensOutputFilter,
  type MopiensStatusItem,
  type MopiensTabDefinition,
} from "@/modules/operations/mopiens-pmdt";
import { getDvor220PermissionDecision } from "./domain/permissions";
import {
  type Dvor220Command,
  type Dvor220CommandResult,
  type Dvor220ConnectionProfile,
} from "./domain/types";
import { createDvor220Store, type Dvor220StoreApi } from "./store/dvor220-store";
import { Dvor220ControlDialogs } from "./ui/control-dialogs";
import { Dvor220LmiView } from "./ui/lmi-view";
import { Dvor220MainScreen, formatDvor220Status, toneForDvor220Status } from "./ui/main-screens";
import { Dvor220MaintenanceScreen } from "./ui/maintenance-screens";
import {
  buildDvor220Menus,
  buildDvor220Navigation,
  buildDvor220Toolbar,
  DVOR220_SCREEN_LABELS,
  DVOR220_SECTION_DEFAULTS,
  isDvor220ScreenId,
  type Dvor220DialogId,
  type Dvor220ScreenId,
  type Dvor220ViewMode,
} from "./ui/navigation";
import { Dvor220SetupScreen } from "./ui/setup-screens";
import styles from "./dvor220.module.css";

const trainingStartMs = Date.UTC(2026, 7, 10, 1, 0, 0);

const connectionProfiles: Dvor220ConnectionProfile[] = [
  {
    id: "lab-vor-local",
    name: "LAB-VOR Local Ethernet",
    description: "Local maintenance network",
    kind: "ethernet",
    location: "local",
    timeoutMs: 5_000,
    ipAddress: "172.16.1.53",
    port: 38_317,
  },
  {
    id: "lab-vor-rs232",
    name: "LAB-VOR Local RS-232",
    description: "Local PMDT serial connection",
    kind: "rs232",
    location: "local",
    timeoutMs: 8_000,
    serialPort: "COM3",
    baudRate: 115_200,
  },
  {
    id: "lab-vor-remote",
    name: "LAB-VOR Remote Ethernet",
    description: "Remote control network",
    kind: "ethernet",
    location: "remote",
    timeoutMs: 10_000,
    ipAddress: "10.20.1.53",
    port: 38_317,
  },
  {
    id: "mfg-dvor-demo",
    name: "MFG-DVOR Demonstration",
    description: "Offline demonstration profile",
    kind: "demo",
    location: "local",
    timeoutMs: 1_000,
  },
];

const connectionOptions: MopiensConnectionProfileOption[] = connectionProfiles.map((profile) => ({
  id: profile.id,
  label: profile.name,
}));

const mainScreenIds = new Set<Dvor220ScreenId>([
  "home", "equipment", "pdc", "cma-sma", "syn",
  "monitor-cha", "monitor-chb1", "monitor-chb2", "monitor-standby",
  "monitor-self-test", "power", "environment",
]);

function sectionForScreen(screenId: Dvor220ScreenId): string {
  if (mainScreenIds.has(screenId)) return "main";
  if (screenId.startsWith("setup-")) return "setup";
  if (screenId.startsWith("maintenance-")) return "maintenance";
  if (screenId.startsWith("flight-")) return "flight";
  return "history";
}

export interface Dvor220SimulatorProps {
  store?: Dvor220StoreApi;
  initialView?: Dvor220ViewMode;
}

type Dvor220SimulatorToolScreen =
  | "maintenance-faults"
  | "maintenance-antenna"
  | "maintenance-thermal"
  | "flight-results"
  | "history-parameter-change";

export function Dvor220Simulator({ store: providedStore, initialView = "pmdt" }: Dvor220SimulatorProps = {}) {
  const [store] = useState<Dvor220StoreApi>(() => providedStore ?? createDvor220Store({ initialNowMs: trainingStartMs }));
  const storeState = useStore(store);
  const { device, snapshot } = storeState;
  const [viewMode, setViewMode] = useState<Dvor220ViewMode>(initialView);
  const [activeSectionId, setActiveSectionId] = useState("main");
  const [activeScreenId, setActiveScreenId] = useState<Dvor220ScreenId>("home");
  const [openTabs, setOpenTabs] = useState<Dvor220ScreenId[]>(["home"]);
  const [activeDialog, setActiveDialog] = useState<Dvor220DialogId | null>(null);
  const [connectionOpen, setConnectionOpen] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(connectionProfiles[0].id);
  const [loginOpen, setLoginOpen] = useState(false);
  const [userName, setUserName] = useState("Administrator");
  const [password, setPassword] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [outputFilter, setOutputFilter] = useState("all");
  const [hiddenBeforeLogId, setHiddenBeforeLogId] = useState(0);
  const [simulatorToolsOpen, setSimulatorToolsOpen] = useState(false);
  const [activeSimulatorTool, setActiveSimulatorTool] = useState<Dvor220SimulatorToolScreen | null>(null);

  useEffect(() => {
    if (providedStore) return;
    let previousTick = performance.now();
    const timer = window.setInterval(() => {
      const currentTick = performance.now();
      store.getState().advanceTime(currentTick - previousTick);
      previousTick = currentTick;
    }, 100);
    return () => window.clearInterval(timer);
  }, [providedStore, store]);

  const dispatch = useCallback((command: Dvor220Command): Dvor220CommandResult => {
    const result = store.getState().dispatch(command);
    setCommandError(result.ok ? null : result.error ?? "Command rejected.");
    return result;
  }, [store]);

  const advanceTime = useCallback((elapsedMs: number) => {
    store.getState().advanceTime(elapsedMs);
    setCommandError(null);
  }, [store]);

  const syncClock = useCallback(() => {
    try {
      store.getState().syncClock();
      setCommandError(null);
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : "Clock synchronization failed.");
    }
  }, [store]);

  const authenticated = device.session.username !== null;
  const writeAllowed = device.session.level >= 2;
  const readAllowed = getDvor220PermissionDecision(device, "read").allowed;
  const profileSaveAvailable = device.configuration.flashDirty && !device.scenario.active;
  const standbyMonitorEnabled = device.configuration.running.optionalUnits.standbyMonitor
    && device.configuration.running.monitor.channels.standby.type !== "disabled";
  const navigationSections = useMemo(
    () => buildDvor220Navigation({
      userName: device.session.username,
      standbyMonitorEnabled,
    }),
    [device.session.username, standbyMonitorEnabled],
  );
  const menus = useMemo(() => buildDvor220Menus({
    connected: device.connection.connected,
    authenticated,
    writeAllowed,
    controlAvailable: snapshot.controlAvailable,
    draftDirty: device.configuration.draftDirty,
    flashDirty: profileSaveAvailable,
    bypassed: snapshot.effectiveMonitorBypass,
    viewMode,
  }), [authenticated, device.configuration.draftDirty, device.connection.connected, profileSaveAvailable, snapshot.controlAvailable, snapshot.effectiveMonitorBypass, viewMode, writeAllowed]);
  const toolbarActions = useMemo(() => buildDvor220Toolbar({
    connected: device.connection.connected,
    authenticated,
    writeAllowed,
    controlAvailable: snapshot.controlAvailable,
    bypassed: snapshot.effectiveMonitorBypass,
    flashDirty: profileSaveAvailable,
  }), [authenticated, device.connection.connected, profileSaveAvailable, snapshot.controlAvailable, snapshot.effectiveMonitorBypass, writeAllowed]);

  const tabs: MopiensTabDefinition[] = openTabs.map((screenId) => ({
    id: screenId,
    label: DVOR220_SCREEN_LABELS[screenId],
    closeLabel: screenId === "home" ? undefined : `Close ${DVOR220_SCREEN_LABELS[screenId]}`,
  }));

  const selectedProfile = connectionProfiles.find((profile) => profile.id === selectedProfileId) ?? connectionProfiles[0];
  const connectionDetails: MopiensConnectionDetail[] = [
    { id: "connection", label: "Connection", value: selectedProfile.kind.toUpperCase() },
    { id: "description", label: "Description", value: selectedProfile.description },
    { id: "location", label: "Control Location", value: selectedProfile.location.toUpperCase() },
    { id: "address", label: "Endpoint", value: selectedProfile.ipAddress ? `${selectedProfile.ipAddress}:${selectedProfile.port}` : selectedProfile.serialPort ?? "Demonstration" },
    { id: "login", label: "Auto Login", value: "Disabled" },
  ];

  const navigate = useCallback((screenId: Dvor220ScreenId) => {
    setActiveScreenId(screenId);
    setActiveSectionId(sectionForScreen(screenId));
    setOpenTabs((current) => current.includes(screenId) ? current : [...current, screenId]);
  }, []);

  function logout() {
    dispatch({ type: "logout" });
    setLoginOpen(true);
    setPassword("");
    setActiveSectionId("main");
    setActiveScreenId("home");
  }

  function connect() {
    setDialogError(null);
    if (store.getState().device.connection.connected) dispatch({ type: "disconnect" });
    const result = dispatch({ type: "connect", profile: selectedProfile });
    if (!result.ok) {
      setDialogError(result.error ?? "Connection failed.");
      return;
    }
    setConnectionOpen(false);
    setLoginOpen(true);
  }

  function login() {
    setDialogError(null);
    const guestLogin = userName.trim().toLocaleLowerCase() === "guest" && password.length === 0;
    const result = guestLogin
      ? dispatch({ type: "login-guest" })
      : dispatch({ type: "login", username: userName, password });
    if (!result.ok) {
      setDialogError(result.error ?? "Login failed.");
      return;
    }
    setLoginOpen(false);
    setPassword("");
    navigate("home");
  }

  function handleCommand(commandId: string) {
    if (isDvor220ScreenId(commandId)) {
      navigate(commandId);
      return;
    }
    if (commandId === "connect") setConnectionOpen(true);
    else if (commandId === "disconnect") { dispatch({ type: "disconnect" }); setConnectionOpen(true); }
    else if (commandId === "login") setLoginOpen(true);
    else if (commandId === "logout") logout();
    else if (commandId === "profile-save") dispatch({ type: "save-profile" });
    else if (commandId === "apply-draft") dispatch({ type: "apply-draft" });
    else if (commandId === "reset-draft") dispatch({ type: "reset-draft" });
    else if (commandId === "view-pmdt") setViewMode("pmdt");
    else if (commandId === "view-lmi") setViewMode("lmi");
    else if (commandId === "simulation-parameters") setActiveDialog("simulation-parameters");
    else if (["bypass", "main-control", "changeover", "reset", "power-control"].includes(commandId)) {
      const dialogMap: Record<string, Dvor220DialogId> = { bypass: "bypass", "main-control": "main", changeover: "changeover", reset: "reset", "power-control": "power" };
      setActiveDialog(dialogMap[commandId]);
    } else if (commandId === "print") window.print();
    else if (commandId === "about") navigate("maintenance-version");
  }

  function handleSectionChange(sectionId: string) {
    if (sectionId === "logout") {
      logout();
      return;
    }
    setActiveSectionId(sectionId);
    const defaultScreen = DVOR220_SECTION_DEFAULTS[sectionId];
    if (defaultScreen) navigate(defaultScreen);
  }

  function handleNavigationItem(itemId: string) {
    if (itemId === "logout") logout();
    else if (isDvor220ScreenId(itemId)) navigate(itemId);
  }

  function closeTab(tabId: string) {
    if (tabId === "home" || !isDvor220ScreenId(tabId)) return;
    setOpenTabs((current) => {
      const next = current.filter((id) => id !== tabId);
      if (activeScreenId === tabId) {
        const nextActive = next[next.length - 1] ?? "home";
        setActiveScreenId(nextActive);
        setActiveSectionId(sectionForScreen(nextActive));
      }
      return next;
    });
  }

  const visibleLogs = device.history.pmdt.filter((row) => row.id >= hiddenBeforeLogId && (outputFilter === "all" || row.category === outputFilter)).slice(-100).reverse();
  const outputFilters: MopiensOutputFilter[] = [
    { id: "all", label: "All", count: device.history.pmdt.filter((row) => row.id >= hiddenBeforeLogId).length },
    { id: "alarm", label: "Alarm", tone: "alarm", count: device.history.pmdt.filter((row) => row.id >= hiddenBeforeLogId && row.category === "alarm").length },
    { id: "control", label: "Control", tone: "info", count: device.history.pmdt.filter((row) => row.id >= hiddenBeforeLogId && row.category === "control").length },
    { id: "event", label: "Event", count: device.history.pmdt.filter((row) => row.id >= hiddenBeforeLogId && row.category === "event").length },
  ];
  const statusItems: MopiensStatusItem[] = [
    { id: "txd", label: "TxD", value: device.connection.txActive ? "Active" : "Idle", tone: device.connection.txActive ? "normal" : "inactive" },
    { id: "rxd", label: "RxD", value: device.connection.rxActive ? "Active" : "Idle", tone: device.connection.rxActive ? "normal" : "inactive" },
    { id: "tx1", label: "TX1", value: `${formatDvor220Status(snapshot.transmitters.tx1.status)}, ${snapshot.transmitters.tx1.path}, ${snapshot.transmitters.tx1.designation}`, tone: toneForDvor220Status(snapshot.transmitters.tx1.status) },
    { id: "tx2", label: "TX2", value: `${formatDvor220Status(snapshot.transmitters.tx2.status)}, ${snapshot.transmitters.tx2.path}, ${snapshot.transmitters.tx2.designation}`, tone: toneForDvor220Status(snapshot.transmitters.tx2.status) },
    { id: "monitor", label: "MON", value: `${snapshot.effectiveMonitorBypass ? "Bypassed" : "Auto"}, ${snapshot.executiveAlarm ? "Alarm" : "Normal"}`, tone: snapshot.executiveAlarm ? "alarm" : snapshot.effectiveMonitorBypass ? "warning" : "normal" },
    { id: "clock", label: "Time", value: new Date(device.nowMs).toLocaleString("en-GB", { hour12: false }), grow: true },
  ];

  const requestedScreen = activeScreenId.startsWith("setup-") ? (
    <Dvor220SetupScreen screenId={activeScreenId} device={device} snapshot={snapshot} dispatch={dispatch} />
  ) : activeScreenId.startsWith("maintenance-") || activeScreenId.startsWith("flight-") || activeScreenId.startsWith("history-") ? (
    <Dvor220MaintenanceScreen screenId={activeScreenId} device={device} snapshot={snapshot} dispatch={dispatch} advanceTime={advanceTime} syncClock={syncClock} navigate={navigate} />
  ) : (
    <Dvor220MainScreen screenId={activeScreenId} device={device} snapshot={snapshot} openDialog={setActiveDialog} navigate={navigate} />
  );
  const screen = readAllowed ? requestedScreen : (
    <section className={styles.lockedScreen} aria-label="PMDT session required">
      <h2>PMDT Session Required</h2>
      <p>Connect to the DVOR equipment and log in before reading equipment status or configuration.</p>
      <div className={styles.actionRow}>
        <MopiensBeveledButton tone="primary" onClick={() => setConnectionOpen(true)}>Open Connection List</MopiensBeveledButton>
        <MopiensBeveledButton disabled={!device.connection.connected} onClick={() => setLoginOpen(true)}>Open Login</MopiensBeveledButton>
      </div>
    </section>
  );

  const simulatorToolScreen = activeSimulatorTool ? (
    <Dvor220MaintenanceScreen
      screenId={activeSimulatorTool}
      device={device}
      snapshot={snapshot}
      dispatch={dispatch}
      advanceTime={advanceTime}
      syncClock={syncClock}
      navigate={navigate}
    />
  ) : null;

  return (
    <div className={styles.simulatorRoot} data-view-mode={viewMode}>
      <Dvor220ConfigPersistenceBoundary store={store} />
      <section className={styles.simulatorTools} aria-label="Simulator Tools">
        <button
          type="button"
          className={styles.simulatorToolsToggle}
          aria-expanded={simulatorToolsOpen}
          aria-controls="dvor220-simulator-tools"
          onClick={() => setSimulatorToolsOpen((open) => !open)}
        >
          Simulator Tools
        </button>
        {simulatorToolsOpen ? (
          <div id="dvor220-simulator-tools" className={styles.simulatorToolsActions}>
            <button type="button" onClick={() => setActiveDialog("simulation-parameters")}>Scenario Parameters</button>
            <button type="button" onClick={() => setActiveSimulatorTool("maintenance-faults")}>Fault Injection</button>
            <button type="button" onClick={() => setActiveSimulatorTool("maintenance-antenna")}>Antenna / VSWR Test</button>
            <button type="button" onClick={() => setActiveSimulatorTool("maintenance-thermal")}>Thermal Test</button>
            <button type="button" onClick={() => setActiveSimulatorTool("flight-results")}>Flight Results</button>
            <button type="button" onClick={() => setActiveSimulatorTool("history-parameter-change")}>Config Audit</button>
          </div>
        ) : null}
        {device.scenario.active ? (
          <span className={styles.scenarioActiveBadge} role="status">
            Scenario Active · {device.scenario.definition?.name}
          </span>
        ) : null}
      </section>
      {simulatorToolScreen ? (
        <aside className={styles.simulatorToolPanel} aria-label={`${DVOR220_SCREEN_LABELS[activeSimulatorTool!]} simulator tool`}>
          <div className={styles.simulatorToolPanelHeader}>
            <strong>Simulator Tools / {DVOR220_SCREEN_LABELS[activeSimulatorTool!]}</strong>
            <button type="button" onClick={() => setActiveSimulatorTool(null)}>Close</button>
          </div>
          {simulatorToolScreen}
        </aside>
      ) : null}
      {viewMode === "pmdt" ? (
        <MopiensPmdtShell
          ariaLabel="MOPIENS 220 DVOR PMDT"
          title={`${device.configuration.running.station.stationName} - PMDT (Portable Maintenance Data Terminal)`}
          brandLabel="MOPIENS 220 DVOR"
          connection={{ label: device.connection.connected ? selectedProfile.name : "Disconnected", tone: device.connection.connected ? "normal" : "inactive" }}
          user={{ name: device.session.username ?? "No user", mode: device.keylock, securityLevel: device.session.level, tone: authenticated ? "normal" : "inactive" }}
          menus={menus}
          toolbarActions={toolbarActions}
          navigationTitle="Menu"
          navigationSections={navigationSections}
          activeNavigationSectionId={activeSectionId}
          activeNavigationItemId={activeScreenId}
          tabs={tabs}
          activeTabId={activeScreenId}
          output={(
            <div className={styles.outputLog}>
              {commandError ? <p role="alert" className={styles.commandError}>{commandError}</p> : null}
              {visibleLogs.length ? (
                <table>
                  <thead><tr><th>Time</th><th>Detail</th><th>Type</th><th>User ID</th></tr></thead>
                  <tbody>{visibleLogs.map((row) => <tr key={row.id} data-category={row.category}><td>{new Date(row.timestampMs).toLocaleTimeString("en-GB", { hour12: false })}</td><td>{row.message}</td><td>{row.category.toUpperCase()}</td><td>{row.userId}</td></tr>)}</tbody>
                </table>
              ) : commandError ? null : <p className={styles.emptyOutput}>No matching PMDT events.</p>}
            </div>
          )}
          outputTitle="Event"
          outputFilters={outputFilters}
          activeOutputFilterId={outputFilter}
          outputEmptyLabel="No PMDT events"
          statusItems={statusItems}
          onMenuCommand={handleCommand}
          onToolbarAction={handleCommand}
          onNavigationSectionChange={handleSectionChange}
          onNavigationItemSelect={handleNavigationItem}
          onTabChange={(tabId) => { if (isDvor220ScreenId(tabId)) navigate(tabId); }}
          onTabClose={closeTab}
          onOutputFilterChange={setOutputFilter}
          onOutputClear={() => setHiddenBeforeLogId(device.history.nextId)}
        >
          {screen}
        </MopiensPmdtShell>
      ) : (
        <Dvor220LmiView device={device} snapshot={snapshot} dispatch={dispatch} advanceTime={advanceTime} onShowPmdt={() => setViewMode("pmdt")} />
      )}

      <MopiensConnectionDialog
        open={connectionOpen}
        title="Connection List"
        brandLabel="MOPIENS"
        profiles={connectionOptions}
        selectedProfileId={selectedProfileId}
        details={connectionDetails}
        error={connectionOpen ? dialogError : null}
        onProfileChange={(profileId) => { setSelectedProfileId(profileId); setDialogError(null); }}
        onConnect={connect}
        onClose={() => { setConnectionOpen(false); setDialogError(null); }}
      />
      <MopiensLoginDialog
        open={loginOpen}
        brandLabel="MOPIENS"
        userName={userName}
        password={password}
        error={loginOpen ? dialogError : null}
        onUserNameChange={setUserName}
        onPasswordChange={setPassword}
        onLogin={login}
        onClose={() => { setLoginOpen(false); setDialogError(null); }}
      />
      <Dvor220ControlDialogs activeDialog={activeDialog} device={device} snapshot={snapshot} dispatch={dispatch} onClose={() => setActiveDialog(null)} />
    </div>
  );
}
