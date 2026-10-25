import type { ReactNode } from "react";
import type { DmeParameterFieldDefinition } from "@/lib/dme1119a/config";

/** Presentation paths only; catalog IDs, roles and native authorization stay unchanged. */
export function dme1119aScenarioGroupPath(field: DmeParameterFieldDefinition): readonly string[] {
  const { id, section } = field;
  const additional = ["Tham số mô phỏng", "Ngoài control native", section];
  if (id.startsWith("rmsConfigStation.")) return ["RMS", "Configuration", "Station"];
  if (id.startsWith("rmsConfigGeneral.")) {
    const key = id.slice("rmsConfigGeneral.".length);
    let group: string;
    if (["monitorIntegrityTestsEnabled", "votingLogic", "transfer"].includes(key)) group = "Monitor/LCU Configuration";
    else if (["automaticRestartsEnabled", "firstRestartDelay", "numberOfAutomaticRestarts"].includes(key)) group = "Automatic Restarts";
    else if (["rcsuPresent", "rcsuConnectionType", "interlockControl"].includes(key)) group = "RCSU Configuration";
    else if (["smokeAlarmInstalled", "intrusionAlarmInstalled", "exitDelay", "entryDelay"].includes(key) || key.startsWith("spareInputs.")) group = "Digital I/O Configuration";
    else if (["rmmConnectionType", "dialInRings", "dialOutOnStatusChange", "dialOutPhoneNumber", "toneDialOut"].includes(key)) group = "RMM Configuration";
    else return additional;
    return ["RMS", "Configuration", "General", group];
  }
  if (id.startsWith("rmsVoltageData.")) return ["RMS", "Configuration", "Power Supply Limits", "Volts"];
  if (id.startsWith("rmsCurrentData.")) return ["RMS", "Configuration", "Power Supply Limits", "Amps"];
  if (id.startsWith("rmsAdData.")) return ["RMS", "Configuration", "A/D Limits", "A/D"];
  if (id.startsWith("rmsTemperatureData.")) return /^rmsTemperatureData\.(0|1|2|4)\./.test(id) ? ["RMS", "Configuration", "A/D Limits", "Temperature"] : additional;
  if (id.startsWith("monitorConfigGeneral.")) return id.startsWith("monitorConfigGeneral.0.") ? additional : ["Monitors", "Configuration", "General", "Executive Alarms"];
  if (id.startsWith("monitorTimers.")) return ["Monitors", "Configuration", "Alarm Limits", "Timers"];
  if (id.startsWith("monitorSystemSettings.")) return ["Monitors", "Configuration", "Alarm Limits", "System-Level Settings"];
  if (id.startsWith("alarmLimits.")) return /^alarmLimits\.[01]\.(alarmLow|preAlarmLow)$/.test(id) ? additional : ["Monitors", "Configuration", "Alarm Limits", "Alarm ranges"];
  if (id.startsWith("txConfigNominal.")) {
    if (/^txConfigNominal\.ident\.(selfKeyOnLoss|shutdownOnLoss|restartWhenSignalResumes)$/.test(id)) return additional;
    const groups: Record<string, string> = { rtcParameters: "RTC Parameters", operation: "Operation", powerAmplifiers: "Power Amplifiers", ident: "Ident" };
    return groups[id.split(".")[1]] ? ["Transmitters", "Configuration", "Nominal", groups[id.split(".")[1]]] : additional;
  }
  const txOffset = /^txOffsets\.\d+\.tx([12])$/.exec(id);
  if (txOffset) return ["Transmitters", "Configuration", "Offsets and Scale Factors", `Transmitter ${txOffset[1]}`];
  const monitorOffset = /^monitorOffsets\.monitor([12])\.\d+\.(integral|standby)$/.exec(id);
  if (monitorOffset) return [`Monitor ${monitorOffset[1]}`, "Offsets and Scale Factors", monitorOffset[2] === "integral" ? "Integral" : "Standby"];
  if (id.startsWith("monitorTransmitterStatus.")) return ["Tham số mô phỏng", "Trạng thái thiết bị", section];
  return additional;
}

type FieldGroup = { path: string[]; fields: DmeParameterFieldDefinition[]; children: Map<string, FieldGroup> };

export function DmeScenarioFieldGroups({ fields, renderField }: {
  fields: readonly DmeParameterFieldDefinition[];
  renderField: (field: DmeParameterFieldDefinition) => ReactNode;
}) {
  const groups = new Map<string, FieldGroup>();
  for (const field of fields) {
    const path = dme1119aScenarioGroupPath(field);
    let children = groups;
    let group: FieldGroup | undefined;
    for (const [index, label] of path.entries()) {
      group = children.get(label);
      if (!group) {
        group = { path: path.slice(0, index + 1), fields: [], children: new Map() };
        children.set(label, group);
      }
      children = group.children;
    }
    group!.fields.push(field);
  }
  function renderGroup(group: FieldGroup): ReactNode {
    return <details key={group.path.join(" → ")} className="pmdt-config-section" aria-label={group.path.join(" → ")}>
      <summary>{group.path.at(-1)}</summary>
      <div className="pmdt-config-section-body">
        {group.fields.map(renderField)}
        {[...group.children.values()].map(renderGroup)}
      </div>
    </details>;
  }
  return <div className="dme1119a-scenario-menu-groups">{[...groups.values()].map(renderGroup)}</div>;
}
