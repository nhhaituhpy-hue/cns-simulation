"use client";

import { PmdtToolbar } from "../pmdt-toolbar";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

type DiagnosticsView = "diagnostics-power-up" | "diagnostics-fault-isolation";

const powerUpColumns = ["RMS", "Monitor 1", "Monitor 2", "RTC 1", "RTC 2"] as const;
const powerUpRows = ["CPU Functional Test", "RAM Check", "PROM Check", "EEPROM Check"] as const;
const faultIsolationRows = [
  "Logon / RMM",
  "Power Supplies",
  "Monitor",
  "Rx/Tx Controller",
  "Power Amplifiers",
  "Transponder",
  "Control",
] as const;

function DiagnosticMark({ good }: { good: boolean }) {
  return <span className={`pmdt-diagnostics-mark ${good ? "pmdt-diagnostics-mark--good" : "pmdt-diagnostics-mark--fault"}`}>{good ? "G" : "R"}</span>;
}

function PowerUpResults() {
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);
  const connected = useDmePmdtStore((state) => state.data.connected);
  const scenario = useDmePmdtStore((state) => state.scenario);
  const diagnosticState = useDmePmdtStore((state) => state.scenarioDiagnosticState);
  const failedSubsystem = scenario.definition?.diagnosis?.diagnosticSubsystem ?? null;
  const columnHealthy = (column: (typeof powerUpColumns)[number]) => {
    if (!diagnosticState.completed || !failedSubsystem) return connected;
    if (failedSubsystem === "Monitor") return !column.startsWith("Monitor");
    if (failedSubsystem === "Receiver / Transmitter Controller") return !column.startsWith("RTC");
    if (failedSubsystem === "RMS / Control") return column !== "RMS";
    return connected;
  };
  return (
    <div className="pmdt-diagnostics-power-up">
      <time className="pmdt-monitor-date">{timestamp}</time>
      {diagnosticState.completed && diagnosticState.result ? <p className="pmdt-diagnostics-result-summary" role="status"><strong>{diagnosticState.subsystem}:</strong> {diagnosticState.result}</p> : null}
      <table className="pmdt-diagnostics-power-table">
        <thead><tr><th scope="col" />{powerUpColumns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>
          {powerUpRows.map((row) => (
            <tr key={row}>
              <th scope="row">{row}</th>
              {powerUpColumns.map((column) => <td key={column}><DiagnosticMark good={columnHealthy(column)} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FaultIsolation() {
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const diagnosticsRunning = useDmePmdtStore((state) => state.diagnosticsRunning);
  const runDiagnostics = useDmePmdtStore((state) => state.runDiagnostics);
  const cancelDiagnostics = useDmePmdtStore((state) => state.cancelDiagnostics);
  const scenario = useDmePmdtStore((state) => state.scenario);
  const diagnosticState = useDmePmdtStore((state) => state.scenarioDiagnosticState);
  const diagnosis = scenario.definition?.diagnosis;
  const faultRow = diagnosis?.diagnosticSubsystem === "Power Supplies"
    ? "Power Supplies"
    : diagnosis?.diagnosticSubsystem === "Monitor"
      ? "Monitor"
      : diagnosis?.diagnosticSubsystem === "Receiver / Transmitter Controller"
        ? "Rx/Tx Controller"
        : diagnosis?.diagnosticSubsystem === "Power Amplifier"
          ? "Power Amplifiers"
          : diagnosis?.diagnosticSubsystem === "RMS / Control"
            ? "Control"
            : diagnosis?.diagnosticSubsystem === "RF Distribution"
              ? "Transponder"
              : null;
  const canFull = securityLevel >= 3 && !loginDialogOpen && local;
  const canOnAir = securityLevel >= 2 && !loginDialogOpen;
  return (
    <div className="pmdt-diagnostics-fault-isolation dme-pmdt-diagnostics-fault-isolation">
      <table className="pmdt-diagnostics-fault-table">
        <thead><tr><th scope="col">Sub System</th><th scope="col">Progress</th><th scope="col">Results</th></tr></thead>
        <tbody>
          {faultIsolationRows.map((row) => (
            <tr key={row}><th scope="row">{row}</th><td><span className={`pmdt-diagnostics-progress ${diagnosticState.completed ? "pmdt-diagnostics-progress--complete" : ""}`} /></td><td>{diagnosticState.completed ? <DiagnosticMark good={row !== faultRow} /> : null}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="pmdt-diagnostics-fault-results">
        <span>Fault Isolation Results</span>
        <div className="pmdt-diagnostics-results-box" role="status">{diagnosticState.completed ? diagnosticState.result ?? "NO FAULT FOUND" : "Run a diagnostic to populate the result."}</div>
      </div>
      {diagnosis?.diagnosticRun === "full" ? <p className="pmdt-diagnostics-notam-warning">Full Diagnostics changes the radiated signal. Issue a NOTAM before running this test.</p> : null}
      <div className="pmdt-diagnostics-fault-actions">
        <button type="button" disabled={!canFull || diagnosticsRunning} onClick={() => runDiagnostics("full")}>Run Full<br />Diagnostics</button>
        <button type="button" disabled={!diagnosticsRunning} onClick={cancelDiagnostics}>Cancel</button>
        <button type="button" disabled={!canOnAir || diagnosticsRunning} onClick={() => runDiagnostics("on-air")}>Run On Air<br />Diagnostics</button>
      </div>
      <div className="dme-pmdt-periodic-results">
        <span>Periodic Fault Isolation Results</span>
        <output>No Fault Found</output>
      </div>
    </div>
  );
}

export function DiagnosticsWorkspace() {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const openView = useDmePmdtStore((state) => state.openView);
  const view = activeView === "diagnostics-fault-isolation" ? activeView : "diagnostics-power-up";

  function select(nextView: DiagnosticsView, label: string) {
    openView("diagnostics", nextView, ["Diagnostics", label], label);
  }

  return (
    <section className="pmdt-diagnostics dme-screen flex min-h-full flex-col" aria-label="Diagnostics Data and Commands">
      <PmdtToolbar title="Diagnostics Data and Commands" />
      <div className="pmdt-diagnostics-tabs" role="tablist" aria-label="Diagnostics tabs">
        <button type="button" role="tab" aria-selected={view === "diagnostics-power-up"} onClick={() => select("diagnostics-power-up", "Power Up Results")}>Power Up Results</button>
        <button type="button" role="tab" aria-selected={view === "diagnostics-fault-isolation"} onClick={() => select("diagnostics-fault-isolation", "Fault Isolation")}>Fault Isolation</button>
      </div>
      <div className="pmdt-diagnostics-content">{view === "diagnostics-fault-isolation" ? <FaultIsolation /> : <PowerUpResults />}</div>
    </section>
  );
}
