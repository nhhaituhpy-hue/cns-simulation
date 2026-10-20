import { parseAdsbScenarioDefinition, type AdsbScenarioDefinition } from "@/modules/devices/adsb/scenario-parameters";
import { TerminalEngine } from "@/lib/terminal-engine";
import { SENSOR_STATUSES, type LoginUser, type SensorState } from "@/lib/types";
import type { ParameterAssignment, ParameterValue, ScenarioParameterAdapter, ScenarioParameterField } from "./parameter-types";
import { AiScenarioError } from "./types";

type Rule = (value: unknown) => boolean;
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text: Rule = (v) => typeof v === "string" && v.length <= 2000 && !/[\x00-\x1f\x7f]/.test(v);
const nonempty: Rule = (v) => text(v) && (v as string).trim().length > 0;
const boolean: Rule = (v) => typeof v === "boolean";
const finite: Rule = (v) => typeof v === "number" && Number.isFinite(v);
const integer: Rule = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const range = (min: number, max: number, whole = false): Rule => (v) => finite(v) && (v as number) >= min && (v as number) <= max && (!whole || Number.isInteger(v));
const enumeration = (options: readonly string[]): Rule => (v) => typeof v === "string" && options.includes(v);
const optional = (rule: Rule): Rule => (v) => v === undefined || rule(v);
const list = (rule: Rule): Rule => (v) => Array.isArray(v) && v.length <= 1000 && v.every(rule);
const shape = (rules: Record<string, Rule>): Rule => (v) => record(v) && Object.keys(v).every((key) => Object.hasOwn(rules, key)) && Object.entries(rules).every(([key, rule]) => rule(v[key]));
const ipv4: Rule = (v) => typeof v === "string" && v.split(".").length === 4 && v.split(".").every((n) => /^\d{1,3}$/.test(n) && Number(n) <= 255 && String(Number(n)) === n);
const mode = enumeration(["OPERATIONAL", "MAINTENANCE"]);
const byte = range(0, 255, true);
const counts = shape({ total: integer, passed: integer, failed: integer });
const monitoring = shape({ lastSnmpResponseAt: nonempty, temperatureC: finite, cpuLoadPercent: range(0, 100), voltages: shape({ v3_3: finite, v5: finite, v12: finite }), receiverConfidencePercent: range(0, 100), crcErrorCount: integer, gpsStatus: enumeration(["synchronized", "unsynchronized", "unavailable"]) });
const profile = shape({
  sensorVersion: nonempty, configVersion: nonempty, sensorName: nonempty, operationMode: optional(mode),
  endToEnd: optional(shape({ alertPower: byte, failurePower: byte, interrogationPeriodMs: integer, replyDelayNs: integer })),
  network: shape({ ip: ipv4, subnet: ipv4, gateway: ipv4, dhcp: boolean, macAddress: nonempty, ntpServer: nonempty, bitRate: nonempty }),
  receiverStats: shape({ shortSquitter: counts, extendedSquitter: counts, totalTargetsDetected: integer, currentTargets: integer }),
  clients: list(shape({ id: integer, name: nonempty, ip: ipv4, port: range(0, 65535, true), protocol: enumeration(["UDP", "TCP"]), messageType: nonempty, enabled: boolean, messagesSent: integer })),
  snmpUsers: list(shape({ name: nonempty, authType: enumeration(["noAuth", "authNoPriv", "authPriv"]) })),
  snmpTraps: list(shape({ ip: ipv4, port: range(0, 65535, true), enabled: boolean })),
  snmpHeartbeatPeriod: integer, snmpAlarmPeriod: integer,
  gps: shape({ enabled: boolean, ntpEnabled: boolean, ntpServer: nonempty, latitude: nonempty, longitude: nonempty, altitude: nonempty, deviation: text }),
  filters: shape({ altitudeEnabled: boolean, altitudeMin: finite, altitudeMax: finite, addressFilterEnabled: boolean, addressFilter: text, positionFilterEnabled: boolean, positionFilterRadius: range(0, Number.MAX_SAFE_INTEGER) }),
  asterix: shape({ sac: byte, sic: byte, cat21Version: nonempty, cat21Enabled: boolean, nonOpEnabled: boolean, mlatEnabled: boolean, rawEnabled: boolean, dataBlockSize: integer, ttl: integer }),
  general: shape({ crcCorrection: boolean, groundTargets: boolean, targetOverloadLimit: integer }),
  syslog: shape({ localDestination: nonempty, remoteEnabled: boolean, remoteServerIp: ipv4 }),
  // Existing training data uses a non-IP monitor identifier/port 888101. Do not reinterpret it as a UDP endpoint.
  siteMonitors: list(shape({ enabled: boolean, ip: nonempty, port: integer, name: nonempty })),
});
function fail(code = "INVALID_PARAMETERS", message = "Unsupported or malformed ADS-B parameters."): never { throw new AiScenarioError(code, message); }
function safeTree(v: unknown, depth = 0): void {
  if (depth > 24) fail();
  if (typeof v === "number" && !Number.isFinite(v)) fail();
  if (v && typeof v === "object") {
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) fail();
    for (const [key, child] of Object.entries(v)) {
      if (["__proto__", "prototype", "constructor"].includes(key) || /password|credential|secret|token|privatekey|authkey|privkey/i.test(key)) fail();
      safeTree(child, depth + 1);
    }
  }
}
function definition(moduleId: string, value: unknown): AdsbScenarioDefinition {
  if (moduleId !== "ads-b") fail();
  safeTree(value);
  if (!record(value) || Object.keys(value).some((key) => !["schemaVersion", "id", "name", "title", "description", "difficulty", "sites", "targetSensorId", "targetLoginUser", "expectedActions", "hardwareFault", "eventLog", "createdAt", "updatedAt", "revision"].includes(key))) fail();
  const parsed = parseAdsbScenarioDefinition(value);
  if (!parsed) fail();
  if (!list(shape({ step: range(1, Number.MAX_SAFE_INTEGER, true), kind: enumeration(["menu-selection", "value-input", "authentication"]), menuId: nonempty, menuTitle: nonempty, input: text, resultLabel: text, timestamp: finite }))(parsed.expectedActions)) fail();
  if (parsed.eventLog && !list(shape({ timestamp: nonempty, type: enumeration(["snmp", "qcms", "selfmon", "error", "line"]), message: text }))(parsed.eventLog)) fail();
  const ids = new Set<string>();
  for (const site of parsed.sites) {
    if (!shape({ id: nonempty, name: nonempty, sensorA: optional((v) => v === null || record(v)), sensorB: optional((v) => v === null || record(v)) })(site)) fail();
    for (const sensor of [site.sensorA, site.sensorB]) {
      if (!sensor) continue;
      if (ids.has(sensor.id) || !shape({ id: nonempty, sensorLabel: enumeration(["A", "B"]), status: enumeration(SENSOR_STATUSES), ipAddress: ipv4, name: nonempty, monitoring: optional(monitoring), dataProfile: optional(profile) })(sensor)) fail();
      ids.add(sensor.id);
      const p = sensor.dataProfile;
      if (p && (p.filters.altitudeMin > p.filters.altitudeMax || (p.endToEnd && p.endToEnd.failurePower >= p.endToEnd.alertPower))) fail();
    }
  }
  return structuredClone(parsed);
}
function target(d: AdsbScenarioDefinition): SensorState {
  return d.sites.flatMap((site) => [site.sensorA, site.sensorB]).find((sensor) => sensor?.id === d.targetSensorId)!;
}
type FieldSpec = Omit<ScenarioParameterField, "value">;
const specs: FieldSpec[] = [];
function add(path: string, type: ScenarioParameterField["type"], recovery = false, extra: Partial<FieldSpec> = {}): void {
  specs.push({ id: `targetSensor.${path}`, label: path, group: path.startsWith("dataProfile") ? "configuration" : "sensor", type, recovery, ...extra });
}
add("status", "enum", false, { options: SENSOR_STATUSES });
add("monitoring.gpsStatus", "enum", false, { options: ["synchronized", "unsynchronized", "unavailable"] });
for (const key of ["temperatureC", "cpuLoadPercent", "receiverConfidencePercent", "crcErrorCount", "voltages.v3_3", "voltages.v5", "voltages.v12"]) add(`monitoring.${key}`, "number");
add("dataProfile.operationMode", "enum", true, { options: ["OPERATIONAL", "MAINTENANCE"] });
add("dataProfile.sensorName", "text", true);
for (const key of ["sac", "sic"]) add(`dataProfile.asterix.${key}`, "number", true, { min: 0, max: 255, step: 1 });
for (const key of ["alertPower", "failurePower"]) add(`dataProfile.endToEnd.${key}`, "number", true, { min: 0, max: 255, step: 1 });
for (const key of ["ip", "subnet", "gateway"]) add(`dataProfile.network.${key}`, "text", true);
for (const key of ["cat21Enabled", "nonOpEnabled", "mlatEnabled", "rawEnabled"]) add(`dataProfile.asterix.${key}`, "boolean");
for (const key of ["enabled", "ntpEnabled"]) add(`dataProfile.gps.${key}`, "boolean");
for (const key of ["altitudeEnabled", "addressFilterEnabled", "positionFilterEnabled"]) add(`dataProfile.filters.${key}`, "boolean");
for (const key of ["altitudeMin", "altitudeMax", "positionFilterRadius"]) add(`dataProfile.filters.${key}`, "number");
for (const key of ["crcCorrection", "groundTargets"]) add(`dataProfile.general.${key}`, "boolean");
add("dataProfile.general.targetOverloadLimit", "number");
function read(sensor: unknown, id: string): unknown {
  let value = sensor;
  for (const key of id.split(".").slice(1)) value = record(value) ? value[key] : undefined;
  return value;
}
function fields(d: AdsbScenarioDefinition): ScenarioParameterField[] {
  const sensor = target(d);
  return specs.flatMap((spec) => { const value = read(sensor, spec.id); return value === undefined ? [] : [{ ...spec, value: value as ParameterValue }]; });
}
function assignments(d: AdsbScenarioDefinition, changes: readonly ParameterAssignment[], recovery = false): void {
  if (!Array.isArray(changes) || changes.length > specs.length) fail(recovery ? "INVALID_RECOVERY" : "INVALID_PARAMETERS");
  const catalog = fields(d); const seen = new Set<string>();
  for (const change of changes) {
    const field = record(change) && catalog.find((f) => f.id === change.fieldId);
    if (!field || Object.keys(change).some((key) => !["fieldId", "value"].includes(key)) || seen.has(field.id) || (recovery && !field.recovery)) fail(recovery ? "INVALID_RECOVERY" : "INVALID_PARAMETERS");
    seen.add(field.id);
    const v = change.value;
    if ((field.type === "number" && (!finite(v) || (field.min !== undefined && (v as number) < field.min) || (field.max !== undefined && (v as number) > field.max) || (field.step === 1 && !Number.isInteger(v)))) || (field.type === "boolean" && !boolean(v)) || (field.type === "enum" && !field.options?.includes(v as string)) || (field.type === "text" && !nonempty(v))) fail(recovery ? "INVALID_RECOVERY" : "INVALID_PARAMETERS");
    const path = field.id.split(".").slice(1); let dest = target(d) as unknown as Record<string, unknown>;
    for (const key of path.slice(0, -1)) dest = dest[key] as Record<string, unknown>;
    dest[path.at(-1)!] = v;
  }
  try { definition("ads-b", d); } catch { fail(recovery ? "INVALID_RECOVERY" : "INVALID_PARAMETERS"); }
}
export const adsbParameterAdapter: ScenarioParameterAdapter = {
  fields(moduleId, value) { return fields(definition(moduleId, value)); },
  apply(moduleId, value, changes) { const d = definition(moduleId, value); assignments(d, changes); return d; },
  verify(moduleId, value, recovery) {
    const d = definition(moduleId, value);
    const intended = structuredClone(d);
    assignments(intended, recovery, true);
    if (!recovery.length || recovery.some((entry) => Object.is(read(target(d), entry.fieldId), entry.value))) fail("INVALID_RECOVERY", "Recovery must change each requested configuration target.");
    const sensor = target(d);
    let engine = new TerminalEngine({ targetLoginUser: d.targetLoginUser, sensorDataProfile: sensor.dataProfile, sensorMonitoring: sensor.monitoring });
    if (d.expectedActions.length > 1000) fail("INVALID_RECOVERY");
    for (const [index, action] of d.expectedActions.entries()) {
      if (action.step !== index + 1 || action.kind === "authentication") fail("INVALID_RECOVERY", "Only an existing native terminal action scaffold can be replayed.");
      if (engine.getState().exited) {
        // Native cross-login seeds encode a new root only after an explicit exit.
        const role: LoginUser | null = action.menuId === "sa.root" ? "sysadmin" : action.menuId === "ma.root" ? "maintenance" : null;
        if (!role) fail("INVALID_RECOVERY", "Invalid native login transition.");
        const persistent = engine.getPersistentState();
        engine = new TerminalEngine({ targetLoginUser: role, sensorDataProfile: sensor.dataProfile, sensorMonitoring: sensor.monitoring });
        engine.restorePersistentState(persistent);
      }
      if (engine.getState().pendingInteraction === "input") fail("INVALID_RECOVERY", "Unvalidated generic terminal input arguments are not supported.");
      const selected = !engine.getState().pendingInteraction && engine.getCurrentMenu().items.find((item) => String(item.number) === action.input);
      if (selected && selected.action.type === "workflow" && !["sa.operation-mode", "sa.manual-network", "sa.confirm-network", "sa.sensor-name", "ma.sac", "ma.sic", "sa.e2e-thresholds"].includes(selected.action.workflowId)) fail("INVALID_RECOVERY", "Unsupported native workflow arguments.");
      if (engine.getState().pendingSensitive) fail("INVALID_RECOVERY", "Credential actions are not supported.");
      const result = engine.processInput(action.input);
      const native = result.recordableAction;
      if (!result.accepted || !native || native.kind !== action.kind || native.menuId !== action.menuId || native.menuTitle !== action.menuTitle || native.input !== action.input || native.resultLabel !== action.resultLabel || engine.getState().pendingSensitive) fail("INVALID_RECOVERY", "ADS-B action was not accepted with the intended native menu and role.");
    }
    const pending = engine.getState().pendingInteraction;
    if (pending && pending !== "display") fail("INVALID_RECOVERY", "ADS-B native action sequence is incomplete.");
    const state = engine.getPersistentState();
    if (state.runtime.pendingNetwork) fail("INVALID_RECOVERY", "Network configuration remains unconfirmed.");
    const replayed = { ...sensor, dataProfile: state.sensorDataProfile };
    const recovered = recovery.map((entry) => ({ id: entry.fieldId, passed: Object.is(read(replayed, entry.fieldId), entry.value), detail: `${entry.fieldId}: requested ${JSON.stringify(entry.value)}; native persistent value ${JSON.stringify(read(replayed, entry.fieldId))}.` }));
    if (recovered.some((check) => !check.passed)) fail("INVALID_RECOVERY", "Native actions did not produce the requested ADS-B configuration values.");
    return {
      mode: "native-action-replay",
      initial: recovery.map((entry) => ({ id: entry.fieldId, passed: true, detail: `${entry.fieldId}: validated initial native value ${JSON.stringify(read(sensor, entry.fieldId))}.` })),
      recovered,
      recoveryVerified: true,
      notes: ["Verified configuration targets and accepted native terminal actions only; ADS-B command acceptance does not prove sensor status, GPS synchronization, physical repair or operational normality.", "Sensor status and monitoring are initial observations only, not terminal-recoverable fields. Generic toggles may update terminal settings without updating the sensor profile."],
    };
  },
};
