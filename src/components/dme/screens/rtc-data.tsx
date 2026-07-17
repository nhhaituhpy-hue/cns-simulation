"use client";

import {
  resolveDmeStatus,
  useDmePmdtStore,
} from "@/stores/dme-pmdt-store";
import {
  DmeIndicator,
  DmeValueCell,
  PmdtPanel,
  dmeFieldMetadata,
} from "./screen-primitives";

export function RtcData() {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <PmdtPanel title="Maintenance Alerts">
        <table className="w-full text-[10px]">
          <thead className="text-[#94a3b8]"><tr><th className="px-2 py-1 text-left">Alert</th><th className="px-2 py-1">Tx 1</th><th className="px-2 py-1">Tx 2</th></tr></thead>
          <tbody>{data.rtcMaintenanceAlerts.map((row, index) => (
            <tr key={row.label} className="border-t border-[#263247]">
              <th scope="row" className="px-2 py-1.5 text-left font-medium text-[#cbd5e1]">{row.label}</th>
              {(["tx1", "tx2"] as const).map((tx) => {
                const fieldId = `rtcMaintenanceAlerts.${index}.${tx}`;
                const color = resolveDmeStatus(row[tx], fieldId, overrides);
                return <td key={tx} {...dmeFieldMetadata(fieldId, `${row.label} ${tx}`, color, color)} className="text-center"><DmeIndicator color={color} /></td>;
              })}
            </tr>
          ))}</tbody>
        </table>
      </PmdtPanel>

      <div className="grid content-start gap-4">
        <PmdtPanel title="Status">
          <table className="w-full text-[10px]">
            <thead className="text-[#94a3b8]"><tr><th className="px-2 py-1 text-left">Condition</th><th className="px-2 py-1">Tx 1</th><th className="px-2 py-1">Tx 2</th></tr></thead>
            <tbody>
              <tr className="border-t border-[#263247]"><th className="px-2 py-2 text-left">Comm Fault</th>{(["tx1", "tx2"] as const).map((tx) => <td key={tx} className="p-1"><DmeValueCell fieldId={`rtcStatus.commFault.${tx}`} label={`RTC Comm Fault ${tx}`} value={data.rtcStatus.commFault[tx]} status={data.rtcStatus.commFault[tx] ? "alarm" : "normal"} className="w-full" /></td>)}</tr>
              <tr className="border-t border-[#263247]"><th className="px-2 py-2 text-left">Overload</th>{(["tx1", "tx2"] as const).map((tx) => <td key={tx} className="p-1"><DmeValueCell fieldId={`rtcStatus.overload.${tx}`} label={`RTC Overload ${tx}`} value={data.rtcStatus.overload[tx]} status={data.rtcStatus.overload[tx] ? "alarm" : "normal"} className="w-full" /></td>)}</tr>
              <tr className="border-t border-[#263247]"><th className="px-2 py-2 text-left">CPU Shutdown</th>{(["tx1", "tx2"] as const).map((tx) => <td key={tx} className="p-1"><DmeValueCell fieldId={`rtcStatus.cpuShutdown.${tx}`} label={`RTC CPU Shutdown ${tx}`} value={data.rtcStatus.cpuShutdown[tx]} className="w-full" /></td>)}</tr>
            </tbody>
          </table>
        </PmdtPanel>

        <PmdtPanel title="Traffic Load (per second)">
          <table className="w-full text-[10px]"><thead className="text-[#94a3b8]"><tr><th className="px-2 py-1 text-left">Level</th><th className="px-2 py-1">Tx 1</th><th className="px-2 py-1">Tx 2</th></tr></thead><tbody>{data.trafficLoad.map((row, index) => <tr key={row.band} className="border-t border-[#263247]"><th className="px-2 py-1.5 text-left font-medium">{row.band}</th><td className="p-1"><DmeValueCell fieldId={`trafficLoad.${index}.tx1`} label={`${row.band} Tx 1`} value={row.tx1} status="gray" className="w-full" /></td><td className="p-1"><DmeValueCell fieldId={`trafficLoad.${index}.tx2`} label={`${row.band} Tx 2`} value={row.tx2} status="gray" className="w-full" /></td></tr>)}</tbody></table>
        </PmdtPanel>

        <PmdtPanel title="Delay Control Status">
          <table className="w-full text-[10px]"><thead className="text-[#94a3b8]"><tr><th className="px-2 py-1 text-left">RTC</th><th className="px-2 py-1">Low</th><th className="px-2 py-1">Prop Delay</th><th className="px-2 py-1">High</th><th className="px-2 py-1">Fixed</th></tr></thead><tbody>{(["rtc1", "rtc2"] as const).map((rtc) => { const row = data.delayControl[rtc]; return <tr key={rtc} className="border-t border-[#263247]"><th className="px-2 py-2 text-left uppercase">{rtc}</th>{(["low", "propagationDelay", "high", "fixed"] as const).map((key) => <td key={key} className="p-1"><DmeValueCell fieldId={`delayControl.${rtc}.${key}`} label={`${rtc} ${key}`} value={row[key]} status={key === "propagationDelay" || key === "fixed" ? "normal" : "gray"} className="w-full" /></td>)}</tr>; })}</tbody></table>
        </PmdtPanel>
      </div>
    </div>
  );
}
