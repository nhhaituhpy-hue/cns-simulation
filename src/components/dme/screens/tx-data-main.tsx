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

const paColumns = [
  ["vswr", "VSWR"],
  ["longPulseFault", "Long Pulse Fault"],
  ["powerSupply", "Power Supply"],
  ["outputPower", "Output Power"],
  ["rmsTemperature", "RMS Temperature"],
  ["userEnabled", "User Enabled"],
  ["rmsRtcEnabled", "RMS-RTC Enabled"],
] as const;

export function TxDataMain() {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);
  return (
    <div className="grid gap-4 p-4">
      <PmdtPanel title="Power Amplifiers">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[54rem] text-center text-[10px]">
            <thead className="text-[#94a3b8]"><tr><th className="px-2 py-2 text-left">Power Amplifier</th>{paColumns.map(([, label]) => <th key={label} className="px-2 py-2">{label}</th>)}<th className="px-2 py-2">Control</th></tr></thead>
            <tbody>
              {data.paStatus.map((row, index) => (
                <tr key={row.name} className="border-t border-[#263247]">
                  <th scope="row" className="px-2 py-2 text-left font-medium text-[#cbd5e1]">{row.name}</th>
                  {paColumns.map(([key, label]) => {
                    const fieldId = `paStatus.${index}.${key}`;
                    const color = resolveDmeStatus(row[key], fieldId, overrides);
                    return (
                      <td key={key} {...dmeFieldMetadata(fieldId, `${row.name} ${label}`, color, color)} className="px-2 py-2">
                        <DmeIndicator color={color} />
                      </td>
                    );
                  })}
                  <td className="p-1"><DmeValueCell fieldId={`paStatus.${index}.control`} label={`${row.name} Control`} value={row.control} status="gray" className="w-full" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PmdtPanel>
      <PmdtPanel title="Status" className="max-w-xl">
        <table className="w-full text-[11px]">
          <thead className="text-[#94a3b8]"><tr><th className="px-2 py-2 text-left">Condition</th><th className="px-2 py-2">Tx 1</th><th className="px-2 py-2">Tx 2</th></tr></thead>
          <tbody>
            {(["commFault", "maintenanceAlert"] as const).map((key) => (
              <tr key={key} className="border-t border-[#263247]">
                <th scope="row" className="px-2 py-2 text-left font-medium">{key === "commFault" ? "Comm Fault" : "Maintenance Alert"}</th>
                {(["tx1", "tx2"] as const).map((tx) => (
                  <td key={tx} className="p-1 text-center"><DmeValueCell fieldId={`txStatus.${key}.${tx}`} label={`${key} ${tx}`} value={data.txStatus[key][tx]} status={data.txStatus[key][tx] ? "alarm" : "normal"} className="w-full" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </PmdtPanel>
    </div>
  );
}
