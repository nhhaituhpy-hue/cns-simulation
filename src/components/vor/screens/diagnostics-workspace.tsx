"use client";

import { PmdtToolbar } from "../pmdt-toolbar";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

type DiagnosticsView = "diagnostics-power-up" | "diagnostics-fault-isolation";

const powerUpColumns = ["RMS", "Monitor 1", "Monitor 2", "Audio Gen 1", "Audio Gen 2"] as const;
const powerUpRows = ["CPU Functional Test", "RAM Check", "PROM Check", "EEPROM Check"] as const;
const faultIsolationRows = [
  "Logon / RMM",
  "Power Supplies",
  "Audio Generator",
  "Synthesizer",
  "Distribution",
  "Power Amplifier",
  "Monitor",
  "Control",
] as const;

function DiagnosticMark({ good }: { good: boolean }) {
  return <span className={`pmdt-diagnostics-mark ${good ? "pmdt-diagnostics-mark--good" : "pmdt-diagnostics-mark--fault"}`}>{good ? "G" : "R"}</span>;
}

function PowerUpResults() {
  const timestamp = useVorPmdtStore((state) => state.data.timestamp);
  const healthy = useVorPmdtStore((state) => state.derived.voting.systemHealthy);
  const scenario = useVorPmdtStore((state) => state.scenario);
  const diagnosticState = useVorPmdtStore((state) => state.diagnosticState);
  const failedSubsystem = scenario.definition?.diagnosis?.diagnosticSubsystem ?? null;

  function columnHealthy(column: (typeof powerUpColumns)[number]) {
    if (!diagnosticState.completed || !failedSubsystem) return healthy;
    if (failedSubsystem === "Audio Generator") return !column.startsWith("Audio Gen");
    if (failedSubsystem === "Monitor") return !column.startsWith("Monitor");
    if (failedSubsystem === "Power Supplies") return column !== "RMS";
    return healthy;
  }

  return (
    <div className="pmdt-diagnostics-power-up">
      <time className="pmdt-monitor-date">{timestamp}</time>
      {diagnosticState.completed && diagnosticState.result ? (
        <p className="pmdt-diagnostics-result-summary" role="status">
          <strong>{diagnosticState.subsystem ?? "Diagnostics"}:</strong> {diagnosticState.result}
        </p>
      ) : null}
      <table className="pmdt-diagnostics-power-table">
        <thead>
          <tr>
            <th scope="col" />
            {powerUpColumns.map((column) => <th key={column} scope="col">{column}</th>)}
          </tr>
        </thead>
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
  const scenario = useVorPmdtStore((state) => state.scenario);
  const diagnosticState = useVorPmdtStore((state) => state.diagnosticState);
  const securityLevel = useVorPmdtStore((state) => state.securityLevel);
  const local = useVorPmdtStore((state) => state.config.simulation.local);
  const runDiagnostics = useVorPmdtStore((state) => state.runDiagnostics);
  const cancelDiagnostics = useVorPmdtStore((state) => state.cancelDiagnostics);
  const diagnosis = scenario.definition?.diagnosis;
  const faultRow = diagnosis?.diagnosticSubsystem === "Power Supplies"
    ? "Power Supplies"
    : diagnosis?.diagnosticSubsystem === "Audio Generator"
      ? "Audio Generator"
      : diagnosis?.diagnosticSubsystem === "Synthesizer"
        ? "Synthesizer"
        : diagnosis?.diagnosticSubsystem === "Distribution"
          ? "Distribution"
          : diagnosis?.diagnosticSubsystem === "Monitor"
            ? "Monitor"
            : diagnosis?.diagnosticSubsystem === "Power Amplifier"
              ? "Power Amplifier"
              : null;

  const fullAllowed = securityLevel >= 3 && local && (!diagnosis || diagnosis.diagnosticRun === "full");
  const onAirAllowed = securityLevel >= 3 && local && (!diagnosis || diagnosis.diagnosticRun === "on-air");

  return (
    <div className="pmdt-diagnostics-fault-isolation">
      <table className="pmdt-diagnostics-fault-table">
        <thead>
          <tr><th scope="col">Sub System</th><th scope="col">Progress</th><th scope="col">Results</th></tr>
        </thead>
        <tbody>
          {faultIsolationRows.map((row) => (
            <tr key={row}>
              <th scope="row">{row}</th>
              <td><span className={`pmdt-diagnostics-progress ${diagnosticState.completed ? "pmdt-diagnostics-progress--complete" : ""}`} /></td>
              <td>{diagnosticState.completed ? <DiagnosticMark good={row !== faultRow} /> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pmdt-diagnostics-fault-results">
        <span>Fault Isolation Results</span>
        <div className="pmdt-diagnostics-results-box" role="status">
          {diagnosticState.completed
            ? diagnosticState.result ?? "NO FAULT FOUND"
            : "Run a diagnostic to populate the result."}
        </div>
      </div>
      {diagnosis?.diagnosticRun === "full" ? (
        <p className="pmdt-diagnostics-notam-warning">
          Full Diagnostics changes the radiated signal. Issue a NOTAM before running this test.
        </p>
      ) : null}
      <div className="pmdt-diagnostics-fault-actions">
        <button type="button" disabled={!fullAllowed} onClick={() => runDiagnostics("full")}>Run Full<br />Diagnostics</button>
        <button type="button" disabled={!diagnosticState.run} onClick={cancelDiagnostics}>Cancel</button>
        <button type="button" disabled={!onAirAllowed} onClick={() => runDiagnostics("on-air")}>Run On Air<br />Diagnostics</button>
      </div>
    </div>
  );
}

export function DiagnosticsWorkspace() {
  const activeView = useVorPmdtStore((state) => state.activeView);
  const openView = useVorPmdtStore((state) => state.openView);
  const view = activeView === "diagnostics-fault-isolation" ? activeView : "diagnostics-power-up";

  function select(nextView: DiagnosticsView, label: string) {
    openView("diagnostics", nextView, ["Diagnostics", label], label);
  }

  return (
    <section className="pmdt-diagnostics flex min-h-full flex-col" aria-label="Diagnostics Data and Commands">
      <PmdtToolbar title="Diagnostics Data and Commands" />
      <div className="pmdt-diagnostics-tabs" role="tablist" aria-label="Diagnostics tabs">
        <button type="button" role="tab" aria-selected={view === "diagnostics-power-up"} onClick={() => select("diagnostics-power-up", "Power Up Results")}>Power Up Results</button>
        <button type="button" role="tab" aria-selected={view === "diagnostics-fault-isolation"} onClick={() => select("diagnostics-fault-isolation", "Fault Isolation")}>Fault Isolation</button>
      </div>
      <div className="pmdt-diagnostics-content">
        {view === "diagnostics-fault-isolation" ? <FaultIsolation /> : <PowerUpResults />}
      </div>
    </section>
  );
}
