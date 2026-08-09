"use client";

import { useCallback, useMemo, useState } from "react";
import { useStore } from "zustand";
import {
  MopiensConnectionDialog,
  MopiensLoginDialog,
  MopiensPmdtShell,
  type MopiensConnectionDetail,
  type MopiensConnectionProfileOption,
  type MopiensOutputFilter,
  type MopiensStatusItem,
  type MopiensTabDefinition,
  type MopiensVisualTone,
} from "@/modules/operations/mopiens-pmdt";
import type {
  Dme320Command,
  Dme320CommandResult,
  Dme320ControlOrigin,
  Dme320LogCategory,
  Dme320SimulationState,
  Dme320TransponderId,
} from "./domain/types";
import { createDme320Store, type Dme320StoreApi } from "./store/dme320-store";
import { Dme320ControlDialogs } from "./ui/control-dialogs";
import { Dme320LmiView } from "./ui/lmi-view";
import {
  buildDme320Menus,
  buildDme320Navigation,
  buildDme320Toolbar,
  DME320_SCREEN_LABELS,
  DME320_SECTION_DEFAULTS,
  isDme320ScreenId,
  type Dme320DialogId,
  type Dme320ScreenId,
  type Dme320ViewMode,
} from "./ui/navigation";
import { Dme320ScreenHost } from "./ui/screen-host";
import styles from "./dme320.module.css";

const trainingStartMs = Date.UTC(2026, 7, 10, 1, 0, 0);

interface Dme320ConnectionProfile {
  id: string;
  name: string;
  description: string;
  transport: "ethernet" | "rs232" | "modem" | "usb" | "demo";
  origin: Dme320ControlOrigin;
  endpoint: string;
  timeoutMs: number;
}

const connectionProfiles: readonly Dme320ConnectionProfile[] = [
  {
    id: "lab-dme-local",
    name: "LAB-DME Local Ethernet",
    description: "Local PMDT maintenance network",
    transport: "ethernet",
    origin: "local",
    endpoint: "172.16.1.51:38317",
    timeoutMs: 5_000,
  },
  {
    id: "lab-dme-rs232",
    name: "LAB-DME Local RS-232",
    description: "Local SCU serial maintenance port",
    transport: "rs232",
    origin: "local",
    endpoint: "COM3 / 115200 8N1",
    timeoutMs: 8_000,
  },
  {
    id: "lab-dme-remote",
    name: "LAB-DME Remote Ethernet",
    description: "Remote control and maintenance network",
    transport: "ethernet",
    origin: "remote",
    endpoint: "10.20.1.51:38317",
    timeoutMs: 10_000,
  },
  {
    id: "mfg-dme-demo",
    name: "MFG-DME Demonstration",
    description: "Offline MOPIENS 320 DME demonstration",
    transport: "demo",
    origin: "local",
    endpoint: "320 DME dual equipment",
    timeoutMs: 1_000,
  },
];

const connectionOptions: MopiensConnectionProfileOption[] = connectionProfiles.map(
  (profile) => ({ id: profile.id, label: profile.name }),
);

const mainScreenIds = new Set<Dme320ScreenId>([
  "home",
  "equipment",
  "transponder",
  "monitor-executive",
  "monitor-standby",
  "monitor-self-test",
  "power",
  "environment",
]);

function sectionForScreen(screenId: Dme320ScreenId): string {
  if (mainScreenIds.has(screenId)) return "main";
  if (screenId.startsWith("setup-")) return "setup";
  if (screenId.startsWith("maintenance-")) return "maintenance";
  return "history";
}

function controlAvailable(simulation: Dme320SimulationState): boolean {
  if (simulation.session.level < 2) return false;
  return simulation.session.origin === "remote"
    ? simulation.keylock === "REM"
    : simulation.keylock !== "REM";
}

function transponderTone(
  simulation: Dme320SimulationState,
  transponderId: Dme320TransponderId,
): MopiensVisualTone {
  const transmitter = simulation.transmitters[transponderId];
  if (transmitter.shutdown || transmitter.interlocked) return "alarm";
  if (!transmitter.present || transmitter.dcPower === "off") return "inactive";
  return transmitter.rfEnabled ? "normal" : "warning";
}

function transponderStatus(
  simulation: Dme320SimulationState,
  transponderId: Dme320TransponderId,
): string {
  const transmitter = simulation.transmitters[transponderId];
  if (!transmitter.present) return "Unplugged";
  if (transmitter.shutdown) return `Shutdown, ${transmitter.route}`;
  if (transmitter.interlocked) return `Interlocked, ${transmitter.route}`;
  const output = transmitter.dcPower === "off"
    ? "Power Off"
    : transmitter.rfEnabled
      ? "RF On"
      : "RF Off";
  return `${output}, ${transmitter.route}`;
}

function logMatchesFilter(category: Dme320LogCategory, filterId: string): boolean {
  if (filterId === "all") return true;
  if (filterId === "alarm") return category === "alarm";
  if (filterId === "event") return category === "event";
  return ["control", "authentication", "configuration", "maintenance"].includes(
    category,
  );
}

export interface Dme320SimulatorProps {
  store?: Dme320StoreApi;
  initialView?: Dme320ViewMode;
}

export function Dme320Simulator({
  store: providedStore,
  initialView = "pmdt",
}: Dme320SimulatorProps = {}) {
  const [store] = useState<Dme320StoreApi>(
    () => providedStore ?? createDme320Store({
      initialNowMs: trainingStartMs,
      clock: { now: () => Date.now() },
    }),
  );
  const storeState = useStore(store);
  const simulation = storeState.simulation;
  const [viewMode, setViewMode] = useState<Dme320ViewMode>(initialView);
  const [activeSectionId, setActiveSectionId] = useState("main");
  const [activeScreenId, setActiveScreenId] = useState<Dme320ScreenId>("home");
  const [openTabs, setOpenTabs] = useState<Dme320ScreenId[]>(["home"]);
  const [activeDialog, setActiveDialog] = useState<Dme320DialogId | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionOpen, setConnectionOpen] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(connectionProfiles[0].id);
  const [loginOpen, setLoginOpen] = useState(false);
  const [guestSession, setGuestSession] = useState(false);
  const [userName, setUserName] = useState("Administrator");
  const [password, setPassword] = useState("1234");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [outputFilter, setOutputFilter] = useState("all");
  const [hiddenBeforeSequence, setHiddenBeforeSequence] = useState(0);

  const dispatch = useCallback(
    (command: Dme320Command): Dme320CommandResult => {
      const result = store.getState().dispatch(command);
      setCommandError(result.accepted ? null : result.message);
      return result;
    },
    [store],
  );

  const advanceBy = useCallback(
    (elapsedMs: number): Dme320CommandResult => {
      const result = store.getState().advanceBy(elapsedMs);
      setCommandError(result.accepted ? null : result.message);
      return result;
    },
    [store],
  );

  const syncClock = useCallback((): Dme320CommandResult => {
    const result = store.getState().syncToClock();
    setCommandError(result.accepted ? null : result.message);
    return result;
  }, [store]);

  const selectedProfile = connectionProfiles.find(
    (profile) => profile.id === selectedProfileId,
  ) ?? connectionProfiles[0];
  const sessionActive = guestSession || simulation.session.userId !== null;
  const hasControl = controlAvailable(simulation);
  const bothMonitorsBypassed = Object.values(simulation.monitors).every(
    (monitor) => monitor.mode === "bypass",
  );

  const navigationSections = useMemo(
    () => buildDme320Navigation(simulation.session.userId),
    [simulation.session.userId],
  );
  const menus = useMemo(
    () => buildDme320Menus({
      connected,
      authenticated: sessionActive,
      controlAvailable: hasControl,
      draftDirty: simulation.config.draftDirty,
      flashDirty: simulation.config.flashDirty,
      bypassed: bothMonitorsBypassed,
      viewMode,
      keylock: simulation.keylock,
    }),
    [
      bothMonitorsBypassed,
      connected,
      hasControl,
      sessionActive,
      simulation.config.draftDirty,
      simulation.config.flashDirty,
      simulation.keylock,
      viewMode,
    ],
  );
  const toolbarActions = useMemo(
    () => buildDme320Toolbar({
      connected,
      authenticated: sessionActive,
      controlAvailable: hasControl,
      bypassed: bothMonitorsBypassed,
      flashDirty: simulation.config.flashDirty,
    }),
    [
      bothMonitorsBypassed,
      connected,
      hasControl,
      sessionActive,
      simulation.config.flashDirty,
    ],
  );

  const tabs: MopiensTabDefinition[] = openTabs.map((screenId) => ({
    id: screenId,
    label: DME320_SCREEN_LABELS[screenId],
    closeLabel: screenId === "home"
      ? undefined
      : `Close ${DME320_SCREEN_LABELS[screenId]}`,
  }));

  const connectionDetails: MopiensConnectionDetail[] = [
    { id: "transport", label: "Connection", value: selectedProfile.transport.toUpperCase() },
    { id: "description", label: "Description", value: selectedProfile.description },
    { id: "location", label: "Control Location", value: selectedProfile.origin.toUpperCase() },
    { id: "endpoint", label: "Endpoint", value: selectedProfile.endpoint },
    { id: "timeout", label: "Connection Timeout", value: `${selectedProfile.timeoutMs} ms` },
  ];

  const navigate = useCallback((screenId: Dme320ScreenId) => {
    setActiveScreenId(screenId);
    setActiveSectionId(sectionForScreen(screenId));
    setOpenTabs((current) => current.includes(screenId) ? current : [...current, screenId]);
  }, []);

  function connect() {
    setDialogError(null);
    setConnected(true);
    setConnectionOpen(false);
    if (userName === "Administrator") setPassword("1234");
    setLoginOpen(true);
  }

  function disconnect() {
    dispatch({ type: "logout" });
    setGuestSession(false);
    setConnected(false);
    setLoginOpen(false);
    setConnectionOpen(true);
    setPassword("1234");
    setActiveSectionId("main");
    setActiveScreenId("home");
  }

  function login() {
    setDialogError(null);
    const guest = userName.trim().toLowerCase() === "guest";
    const result = guest
      ? dispatch({ type: "login-as-guest", origin: selectedProfile.origin })
      : dispatch({
          type: "login",
          userId: userName,
          password,
          origin: selectedProfile.origin,
        });
    if (!result.accepted) {
      setDialogError(result.message);
      return;
    }
    setGuestSession(guest);
    setLoginOpen(false);
    setPassword("");
    navigate("home");
  }

  function logout() {
    dispatch({ type: "logout" });
    setGuestSession(false);
    setLoginOpen(true);
    setPassword("1234");
    setActiveSectionId("main");
    setActiveScreenId("home");
  }

  function handleCommand(commandId: string) {
    if (isDme320ScreenId(commandId)) {
      navigate(commandId);
      return;
    }
    if (commandId === "connect") setConnectionOpen(true);
    else if (commandId === "disconnect") disconnect();
    else if (commandId === "login") setLoginOpen(true);
    else if (commandId === "login-guest") {
      setUserName("Guest");
      setPassword("");
      setLoginOpen(true);
    } else if (commandId === "logout") logout();
    else if (commandId === "profile-save") dispatch({ type: "save-running-to-flash" });
    else if (commandId === "apply-draft") dispatch({ type: "apply-draft" });
    else if (commandId === "restore-draft") dispatch({ type: "restore-draft" });
    else if (commandId === "reboot") dispatch({ type: "reboot" });
    else if (commandId === "view-pmdt") setViewMode("pmdt");
    else if (commandId === "view-lmi") setViewMode("lmi");
    else if (commandId === "keylock-local") dispatch({ type: "set-keylock", mode: "LOCAL" });
    else if (commandId === "keylock-rem" || commandId === "keylock-remote") dispatch({ type: "set-keylock", mode: "REM" });
    else if (commandId === "keylock-maint") dispatch({ type: "set-keylock", mode: "MAINT" });
    else if (["bypass", "main-control", "main", "changeover", "reset", "power-control", "power-dialog"].includes(commandId)) {
      const dialogMap: Record<string, Dme320DialogId> = {
        bypass: "bypass",
        "main-control": "main",
        main: "main",
        changeover: "changeover",
        reset: "reset",
        "power-control": "power",
        "power-dialog": "power",
      };
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
    const defaultScreen = DME320_SECTION_DEFAULTS[sectionId];
    if (defaultScreen) navigate(defaultScreen);
  }

  function handleNavigationItem(itemId: string) {
    if (itemId === "logout") logout();
    else if (isDme320ScreenId(itemId)) navigate(itemId);
  }

  function closeTab(tabId: string) {
    if (tabId === "home" || !isDme320ScreenId(tabId)) return;
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

  const visibleLogs = simulation.logs
    .filter(
      (row) => row.sequence >= hiddenBeforeSequence && logMatchesFilter(row.category, outputFilter),
    )
    .slice(-100)
    .reverse();
  const logCount = (filterId: string) => simulation.logs.filter(
    (row) => row.sequence >= hiddenBeforeSequence && logMatchesFilter(row.category, filterId),
  ).length;
  const outputFilters: MopiensOutputFilter[] = [
    { id: "all", label: "All", count: logCount("all") },
    { id: "alarm", label: "Alarm", tone: "alarm", count: logCount("alarm") },
    { id: "control", label: "Control", tone: "info", count: logCount("control") },
    { id: "event", label: "Event", count: logCount("event") },
  ];
  const executiveAlarm = Object.values(simulation.monitors).some(
    (monitor) => monitor.channels.executive.overallStatus === "alarm",
  );
  const statusItems: MopiensStatusItem[] = [
    { id: "txd", label: "TxD", value: connected ? "Ready" : "Idle", tone: connected ? "normal" : "inactive" },
    { id: "rxd", label: "RxD", value: connected ? "Ready" : "Idle", tone: connected ? "normal" : "inactive" },
    { id: "tx1", label: "TXP1", value: transponderStatus(simulation, "tx1"), tone: transponderTone(simulation, "tx1") },
    { id: "tx2", label: "TXP2", value: transponderStatus(simulation, "tx2"), tone: transponderTone(simulation, "tx2") },
    {
      id: "monitor",
      label: "EXEC MON",
      value: `${bothMonitorsBypassed ? "Bypassed" : "Auto"}, ${executiveAlarm ? "Alarm" : "Normal"}`,
      tone: executiveAlarm ? "alarm" : bothMonitorsBypassed ? "warning" : "normal",
    },
    {
      id: "clock",
      label: "Time",
      value: new Date(simulation.nowMs).toLocaleString("en-GB", { hour12: false }),
      grow: true,
    },
  ];

  return (
    <div className={styles.simulatorRoot} data-view-mode={viewMode}>
      {viewMode === "pmdt" ? (
        <MopiensPmdtShell
          ariaLabel="MOPIENS 320 DME PMDT"
          title={`${simulation.config.running.station.stationName} - PMDT (Portable Maintenance Data Terminal)`}
          brandLabel="MOPIENS 320 DME"
          connection={{
            label: connected ? selectedProfile.name : "Disconnected",
            tone: connected ? "normal" : "inactive",
          }}
          user={{
            name: simulation.session.userId ?? (guestSession ? "Guest" : "No user"),
            mode: simulation.keylock,
            securityLevel: simulation.session.level,
            tone: sessionActive ? "normal" : "inactive",
          }}
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
                  <thead>
                    <tr><th>Time</th><th>Detail</th><th>Type</th><th>User ID</th></tr>
                  </thead>
                  <tbody>
                    {visibleLogs.map((row) => (
                      <tr key={row.sequence} data-category={row.category}>
                        <td>{new Date(row.timestampMs).toLocaleTimeString("en-GB", { hour12: false })}</td>
                        <td>{row.message}</td>
                        <td>{row.category.toUpperCase()}</td>
                        <td>{row.userId}</td>
                      </tr>
                    ))}
                  </tbody>
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
          onTabChange={(tabId) => { if (isDme320ScreenId(tabId)) navigate(tabId); }}
          onTabClose={closeTab}
          onOutputFilterChange={setOutputFilter}
          onOutputClear={() => setHiddenBeforeSequence(
            Math.max(0, ...simulation.logs.map((row) => row.sequence)) + 1,
          )}
        >
          <Dme320ScreenHost
            screenId={activeScreenId}
            simulation={simulation}
            dispatch={dispatch}
            advanceBy={advanceBy}
            syncClock={syncClock}
            navigate={navigate}
            openDialog={setActiveDialog}
          />
        </MopiensPmdtShell>
      ) : (
        <Dme320LmiView
          simulation={simulation}
          dispatch={dispatch}
          advanceBy={advanceBy}
          onShowPmdt={() => setViewMode("pmdt")}
        />
      )}

      <MopiensConnectionDialog
        open={connectionOpen}
        title="Connection List"
        brandLabel="MOPIENS"
        profiles={connectionOptions}
        selectedProfileId={selectedProfileId}
        details={connectionDetails}
        error={connectionOpen ? dialogError : null}
        onProfileChange={(profileId) => {
          setSelectedProfileId(profileId);
          setDialogError(null);
        }}
        onConnect={connect}
        onClose={() => {
          setConnectionOpen(false);
          setDialogError(null);
        }}
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
        onClose={() => {
          setLoginOpen(false);
          setDialogError(null);
        }}
      />
      <Dme320ControlDialogs
        activeDialog={activeDialog}
        simulation={simulation}
        dispatch={dispatch}
        onClose={() => setActiveDialog(null)}
      />
    </div>
  );
}
