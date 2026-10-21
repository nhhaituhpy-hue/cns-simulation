import type { JsonValue, ValueSchema } from "../types";
import { DVOR220_MONITOR_IDS, DVOR220_MONITOR_CHANNEL_IDS, DVOR220_MONITOR_PARAMETERS, DVOR220_TRANSMITTER_IDS, DVOR220_TRANSMITTER_UNIT_IDS } from "@/modules/operations/dvor-220/domain/types";
import { DME320_MONITOR_PARAMETERS, type Dme320FaultKind } from "@/modules/operations/dme-320/domain/types";
import { DME320_FAULT_CATALOG } from "@/modules/operations/dme-320/domain/faults";
import { dme320ScenarioFaultTargets, createDefaultDme320ScenarioDefinition } from "@/modules/operations/dme-320/domain/scenario";
import { assertSafeJson, validateFieldValue } from "./helpers";
import { dvorUnits, type MopiensModule } from "./mopiens-schema";
const help = "Đầu vào native của simulator. Chọn loại và mục tiêu hợp lệ; không tự tạo lỗi ngoài engine.";
const text = (label: string): ValueSchema => ({ type: "text", label, help, required: true, maxLength: 200 });
const num = (label: string, unit?: string): ValueSchema => ({ type: "number", label, help, required: true, ...(unit ? {unit} : {}) });
const bool = (label: string): ValueSchema => ({ type: "boolean", label, help, required: true });
const select = (label: string, values: readonly string[]): ValueSchema => ({ type: "select", label, help, required: true, options: values.map(value => ({value, label: value})) });
const object = (label: string, properties: Record<string, ValueSchema>): ValueSchema => ({ type: "object", label, help, required: true, properties });
const antennaNumber: ValueSchema = { ...num("Antenna"), min: 1, max: 48, step: 1 };
const vswr: ValueSchema = { ...num("VSWR", ":1"), min: 1, max: 10 };
function variant(kind: string, properties: Record<string, ValueSchema>, initial: Record<string, JsonValue>, label = kind) {
  return { value: kind, label, schema: object(label, { id: text("Fault ID"), kind: { ...select("Fault kind", [kind]), readOnly: true }, ...properties }), initial: { id: `fault-${kind}`, kind, ...initial } };
}
export function mopiensListSchema(moduleId: MopiensModule, path: string): ValueSchema | undefined {
  if (path === "runtime.antennaVswr") return { type: "array", label: "Antenna VSWR", help, maxItems: 48, item: { ...object("Antenna", { antenna: antennaNumber, usbVswr: { ...vswr, label: "USB VSWR" }, lsbVswr: { ...vswr, label: "LSB VSWR" } }), initial: { antenna: 1, usbVswr: 1.15, lsbVswr: 1.15 } } };
  if (path === "runtime.measurementOverrides") {
    const dme = createDefaultDme320ScenarioDefinition();
    const parameters = moduleId === "dvor-220" ? DVOR220_MONITOR_PARAMETERS : DME320_MONITOR_PARAMETERS;
    return { type: "array", label: "Forced Monitor overrides", help: "Ép số đo có ưu tiên hơn engine. Chỉnh PMDT không đảm bảo sửa được đến khi xóa override.", discriminator: "parameter", maxItems: moduleId === "dvor-220" ? 72 : 48,
      variants: parameters.map(parameter => {
        const unit = moduleId === "dvor-220" ? dvorUnits[parameter] : dme.configuration.monitor.limits[parameter as typeof DME320_MONITOR_PARAMETERS[number]].unit;
        const valueSchema: ValueSchema = parameter === "identCode" ? { ...text("IDENT"), required: false, nullable: true, maxLength: 4 } : { ...num("Forced value", unit), nullable: moduleId === "dme-320" };
        const properties = { monitorId: select("Monitor", DVOR220_MONITOR_IDS), [moduleId === "dvor-220" ? "channelId" : "channel"]: select("Channel", moduleId === "dvor-220" ? DVOR220_MONITOR_CHANNEL_IDS : ["executive", "standby"]), parameter: { ...select("Parameter", [parameter]), readOnly: true }, value: valueSchema, ...(moduleId === "dme-320" ? {valid: { ...bool("Reading valid"), required: false }} : {}) };
        return {value: parameter, label: parameter, schema: object(parameter, properties), initial: {monitorId: "mon1", [moduleId === "dvor-220" ? "channelId" : "channel"]: moduleId === "dvor-220" ? "cha" : "executive", parameter, value: parameter === "identCode" ? "MOP" : 0, ...(moduleId === "dme-320" ? {valid: true} : {})}};
      }) };
  }
  if (path !== "runtime.faults") return undefined;
  if (moduleId === "dme-320") return { type: "array", label: "Typed Faults", help, maxItems: 100, discriminator: "kind", variants: (Object.keys(DME320_FAULT_CATALOG) as Dme320FaultKind[]).map(kind => {
    const targets = dme320ScenarioFaultTargets(kind);
    const v = variant(kind, { target: select("Target", targets) }, { target: targets[0] }, `${DME320_FAULT_CATALOG[kind].component}: ${kind}`);
    v.schema.help = DME320_FAULT_CATALOG[kind].symptoms.join(" · ");
    return v;
  }) };
  const conditions = ["warning", "alarm", "fault", "unplugged"];
  const environment = variant("environment", { sensor: select("Sensor", ["smoke", "intrusion", "temperature"]), value: bool("Sensor state") }, {sensor: "smoke", value: true});
  environment.schema.discriminator = "sensor";
  environment.schema.variants = ["smoke", "intrusion", "temperature"].map(sensor => ({ value: sensor, label: sensor, schema: object(`Environment / ${sensor}`, {id: text("Fault ID"), kind: { ...select("Fault kind", ["environment"]), readOnly: true }, sensor: {...select("Sensor", [sensor]), readOnly: true}, value: sensor === "temperature" ? num("Temperature", "°C") : bool("Sensor state")}), initial: {id: `fault-environment-${sensor}`, kind: "environment", sensor, value: sensor === "temperature" ? 50 : true} }));
  return { type: "array", label: "Typed Faults", help, discriminator: "kind", maxItems: 100, variants: [
    variant("transmitter-unit", {transmitterId: select("Transmitter", DVOR220_TRANSMITTER_IDS), unit: select("Unit", DVOR220_TRANSMITTER_UNIT_IDS), condition: select("Condition", conditions)}, {transmitterId: "tx1", unit: "cma", condition: "alarm"}),
    variant("monitor-hardware", {monitorId: select("Monitor", DVOR220_MONITOR_IDS), condition: select("Condition", ["fault", "unplugged"])}, {monitorId: "mon1", condition: "fault"}),
    variant("monitor-parameter", {monitorId: select("Monitor", DVOR220_MONITOR_IDS), channelId: select("Channel", DVOR220_MONITOR_CHANNEL_IDS), parameter: select("Parameter", DVOR220_MONITOR_PARAMETERS), value: num("Monitor value")}, {monitorId: "mon1", channelId: "cha", parameter: "rfLevel", value: -5}),
    variant("pdc", {condition: select("Condition", conditions)}, {condition: "alarm"}),
    variant("antenna-vswr", {antenna: antennaNumber, usbVswr: {...vswr, label: "USB VSWR", required: false}, lsbVswr: {...vswr, label: "LSB VSWR", required: false}}, {antenna: 1, usbVswr: 3, lsbVswr: 3}),
    variant("communication", {endpoint: select("Endpoint", ["rcu", "lmi", "csp"]), condition: select("Condition", ["fault"])}, {endpoint: "rcu", condition: "fault"}), environment,
  ] };
}
/** Nested native discriminated objects (environment sensor) remain typed. */
export function validateMopiensValue(schema: ValueSchema, value: JsonValue, path: string): string[] {
  try { assertSafeJson(value); } catch { return [`${path}: dữ liệu JSON không an toàn.`]; }
  if (schema.type === "array" && Array.isArray(value)) {
    const errors = value.length > (schema.maxItems ?? 200) ? [`${path}: quá nhiều mục.`] : [];
    value.forEach((item, index) => {
      const kind = item && typeof item === "object" && !Array.isArray(item) ? item[schema.discriminator ?? "kind"] : undefined;
      const child = schema.variants ? schema.variants.find(v => v.value === kind)?.schema : schema.item;
      errors.push(...(child ? validateMopiensValue(child, item, `${path} ${index + 1}`) : [`${path}: loại không được hỗ trợ.`]));
    });
    return errors;
  }
  if (schema.type === "object" && schema.variants) {
    const kind = value && typeof value === "object" && !Array.isArray(value) ? value[schema.discriminator ?? "kind"] : undefined;
    const child = schema.variants.find(v => v.value === kind)?.schema;
    return child ? validateMopiensValue(child, value, path) : [`${path}: loại không được hỗ trợ.`];
  }
  return validateFieldValue(schema, value, path);
}
