"use client";

import {
  resolveDmeField,
  resolveDmeStatus,
  useDmePmdtStore,
} from "@/stores/dme-pmdt-store";
import {
  DmeIndicator,
  DmeValueCell,
  PmdtPanel,
  dmeFieldMetadata,
} from "./screen-primitives";

function RtcBooleanIndicator({
  fieldId,
  label,
  value,
  activeColor = "red",
  inactiveColor = "gray",
}: {
  fieldId: string;
  label: string;
  value: boolean;
  activeColor?: "green" | "yellow" | "red";
  inactiveColor?: "green" | "gray";
}) {
  const overrides = useDmePmdtStore((state) => state.overrides);
  const resolved = resolveDmeField(value, fieldId, overrides);
  const color = resolveDmeStatus(resolved ? activeColor : inactiveColor, fieldId, overrides);
  return (
    <span {...dmeFieldMetadata(fieldId, label, resolved, color)}>
      <DmeIndicator color={color} />
    </span>
  );
}

export function RtcData() {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);
  return (
    <div className="dme-pmdt-rtc-data grid gap-4 p-4 lg:grid-cols-2">
      <PmdtPanel title="Maintenance Alerts">
        <table className="w-full text-[10px]">
          <thead><tr><th className="text-left" /><th>Tx #1</th><th>Tx #2</th></tr></thead>
          <tbody>{data.rtcMaintenanceAlerts.map((row, index) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {(["tx1", "tx2"] as const).map((tx) => {
                const fieldId = `rtcMaintenanceAlerts.${index}.${tx}`;
                const color = resolveDmeStatus(row[tx], fieldId, overrides);
                return <td key={tx} {...dmeFieldMetadata(fieldId, `${row.label} ${tx}`, color, color)}><DmeIndicator color={color} /></td>;
              })}
            </tr>
          ))}</tbody>
        </table>
      </PmdtPanel>

      <div className="dme-pmdt-rtc-column grid content-start gap-4">
        <PmdtPanel title="Status">
          <table className="w-full text-[10px]">
            <thead><tr><th /><th>Tx #1</th><th>Tx #2</th></tr></thead>
            <tbody>
              <tr><th>Comm Fault</th>{(["tx1", "tx2"] as const).map((tx) => <td key={tx}><RtcBooleanIndicator fieldId={`rtcStatus.commFault.${tx}`} label={`RTC Comm Fault ${tx}`} value={data.rtcStatus.commFault[tx]} /></td>)}</tr>
              <tr><th>Overload</th>{(["tx1", "tx2"] as const).map((tx) => <td key={tx}><RtcBooleanIndicator fieldId={`rtcStatus.overload.${tx}`} label={`RTC Overload ${tx}`} value={data.rtcStatus.overload[tx]} /></td>)}</tr>
              <tr><th>CPU Shutdown</th>{(["tx1", "tx2"] as const).map((tx) => <td key={tx}><DmeValueCell fieldId={`rtcStatus.cpuShutdown.${tx}`} label={`RTC CPU Shutdown ${tx}`} value={data.rtcStatus.cpuShutdown[tx]} status="gray" /></td>)}</tr>
            </tbody>
          </table>
        </PmdtPanel>

        <PmdtPanel title="Traffic Load (per Second)">
          <table className="w-full text-[10px]"><thead><tr><th /><th>Tx #1</th><th>Tx #2</th></tr></thead><tbody>{data.trafficLoad.map((row, index) => <tr key={row.band}><th>{row.band}</th><td><DmeValueCell fieldId={`trafficLoad.${index}.tx1`} label={`${row.band} Tx 1`} value={row.tx1} status="gray" /></td><td><DmeValueCell fieldId={`trafficLoad.${index}.tx2`} label={`${row.band} Tx 2`} value={row.tx2} status="gray" /></td></tr>)}</tbody></table>
        </PmdtPanel>

        <PmdtPanel title="Delay Control Status">
          <table className="w-full text-[10px]"><thead><tr><th /><th>Low</th><th>Prop Delay</th><th>High</th><th /><th>Delay Fixed</th></tr></thead><tbody>{(["rtc1", "rtc2"] as const).map((rtc, rtcIndex) => { const row = data.delayControl[rtc]; return <tr key={rtc}><th>{`RTC #${rtcIndex + 1}`}</th><td><DmeValueCell fieldId={`delayControl.${rtc}.low`} label={`${rtc} low`} value={row.low} status="gray" /></td><td><DmeValueCell fieldId={`delayControl.${rtc}.propagationDelay`} label={`${rtc} propagationDelay`} value={row.propagationDelay} /></td><td><DmeValueCell fieldId={`delayControl.${rtc}.high`} label={`${rtc} high`} value={row.high} status="gray" /></td><td>us</td><td><RtcBooleanIndicator fieldId={`delayControl.${rtc}.fixed`} label={`${rtc} fixed`} value={row.fixed} activeColor="yellow" inactiveColor="green" /></td></tr>; })}</tbody></table>
        </PmdtPanel>
      </div>
    </div>
  );
}
