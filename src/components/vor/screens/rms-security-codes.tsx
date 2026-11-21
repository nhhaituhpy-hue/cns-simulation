"use client";

import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function RmsSecurityCodes() {
  const revision = useVorPmdtStore(state => state.securityRevision);
  const level = useVorPmdtStore(state => state.securityLevel);
  const local = useVorPmdtStore(state => state.config.simulation.local);
  const connected = useVorPmdtStore(state => state.config.simulation.connected);
  const scenario = useVorPmdtStore(state => state.scenario.active);
  const error = useVorPmdtStore(state => state.securityError);
  const rows = useVorPmdtStore(state => state.getSecurityRows)();
  const stage = useVorPmdtStore(state => state.stageSecurityField);
  const timestamp = useVorPmdtStore(state => state.data.timestamp);
  if (level !== 4) return null;
  const disabled = !local || !connected || scenario;
  return <div className="pmdt-rms-config-security p-3 text-[11px]">
    <time className="pmdt-monitor-date">{timestamp}</time>
    <table className="mt-3 w-[460px] table-fixed border-separate border-spacing-1">
      <thead><tr><th className="w-[195px]">User ID</th><th className="w-[195px]">Password</th><th>Level</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={`${revision}-${index}`}>
        <td><input className="pmdt-classic-control w-full" aria-label={`User ID row ${index + 1}`} defaultValue={row.userId} maxLength={32} autoComplete="off" disabled={disabled} onChange={event => stage(index, "userId", event.currentTarget.value)} /></td>
        <td><input className="pmdt-classic-control w-full" aria-label={`Password row ${index + 1}`} type="password" maxLength={32} autoComplete="new-password" disabled={disabled} onChange={event => stage(index, "password", event.currentTarget.value)} /></td>
        <td>{index === 0 ? <input className="pmdt-classic-control w-full" aria-label="Level row 1" value="4" disabled readOnly />
          : <select className="pmdt-classic-control w-full" aria-label={`Level row ${index + 1}`} defaultValue={row.userId ? row.securityLevel : ""} disabled={disabled} onChange={event => stage(index, "securityLevel", Number(event.currentTarget.value))}>
            <option value="" disabled />{[1, 2, 3, 4].map(value => <option key={value} value={value}>{value}</option>)}
          </select>}</td>
      </tr>)}</tbody>
    </table>
    {error && <p role="alert">{error}</p>}
  </div>;
}
