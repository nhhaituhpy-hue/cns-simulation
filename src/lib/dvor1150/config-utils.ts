import {
  DVOR1150_MONITOR_IDS,
  DVOR1150_MONITOR_PARAMETERS,
  DVOR1150_TRANSMITTER_IDS,
  type Dvor1150Config,
  type Dvor1150ConfigValue,
} from "./types";

export type Dvor1150ConfigFieldType = "number" | "text" | "boolean" | "select";

export interface Dvor1150ConfigFieldDefinition {
  id: string;
  label: string;
  section: string;
  type: Dvor1150ConfigFieldType;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  digits?: number;
  options?: readonly string[];
  description?: string;
}

const parameterLabels: Record<string, string> = {
  azimuth: "Azimuth Angle",
  hz30Modulation: "30 Hz Modulation",
  hz9960Modulation: "9960 Hz Modulation",
  deviation: "FM Deviation",
  rfLevel: "RF Level",
};

const numeric = (
  id: string,
  label: string,
  section: string,
  options: Pick<Dvor1150ConfigFieldDefinition, "min" | "max" | "step" | "digits" | "unit" | "description"> = {},
): Dvor1150ConfigFieldDefinition => ({ id, label, section, type: "number", ...options });

const monitorLimitFields = DVOR1150_MONITOR_PARAMETERS.flatMap((parameter) =>
  (["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] as const).map((band) =>
    numeric(
      `monitor.alarmLimits.${parameter}.${band}`,
      `${parameterLabels[parameter]} ${band}`,
      "Monitor Alarm Limits",
      { step: 0.01, digits: parameter === "azimuth" ? 2 : 1 },
    ),
  ),
);

const monitorOffsetFields = DVOR1150_MONITOR_IDS.flatMap((monitor) =>
  DVOR1150_MONITOR_PARAMETERS.map((parameter) =>
    numeric(
      `monitor.offsets.${monitor}.${parameter}`,
      `${monitor.toUpperCase()} ${parameterLabels[parameter]} offset`,
      "Monitor Offsets",
      { step: 0.01, digits: 2 },
    ),
  ),
);

const transmitterFields = DVOR1150_TRANSMITTER_IDS.flatMap((transmitter) => [
  numeric(`transmitters.${transmitter}.nominal.azimuthIndex`, `${transmitter.toUpperCase()} Azimuth Index`, "Transmitter Nominal", { min: -360, max: 360, step: 0.01, digits: 2, unit: "°" }),
  numeric(`transmitters.${transmitter}.nominal.outputPower`, `${transmitter.toUpperCase()} Output Power`, "Transmitter Nominal", { min: 0, max: 250, step: 0.1, digits: 1, unit: "Watts", description: "Common nominal carrier power. The simulator accepts up to 250 W for training scenarios; the manual baseline is approximately 125 W at 100%." }),
  numeric(`transmitters.${transmitter}.nominal.voiceModulation`, `${transmitter.toUpperCase()} Voice Modulation`, "Transmitter Nominal", { min: 0, max: 100, step: 0.1, digits: 1, unit: "%" }),
  numeric(`transmitters.${transmitter}.nominal.identModulation`, `${transmitter.toUpperCase()} Ident Modulation`, "Transmitter Nominal", { min: 0, max: 100, step: 0.1, digits: 1, unit: "%" }),
  numeric(`transmitters.${transmitter}.nominal.referenceModulation`, `${transmitter.toUpperCase()} Reference Modulation`, "Transmitter Nominal", { min: 0, max: 100, step: 0.1, digits: 1, unit: "%" }),
  numeric(`transmitters.${transmitter}.nominal.sboRfLevel`, `${transmitter.toUpperCase()} SBO RF Level`, "Transmitter Nominal", { min: 0, max: 100, step: 0.1, digits: 1, unit: "%" }),
  { id: `transmitters.${transmitter}.nominal.identCode`, label: `${transmitter.toUpperCase()} Ident Code`, section: "Transmitter Nominal", type: "text" as const },
  numeric(`transmitters.${transmitter}.offsets.azimuthAngle`, `${transmitter.toUpperCase()} Azimuth Angle Offset`, "Transmitter Offsets", { min: -360, max: 360, step: 0.01, digits: 2, unit: "°" }),
  numeric(`transmitters.${transmitter}.offsets.outputPowerScale`, `${transmitter.toUpperCase()} Output Power Scale`, "Transmitter Offsets", { min: 0, max: 200, step: 0.1, digits: 1, unit: "%" }),
  numeric(`transmitters.${transmitter}.offsets.voiceModulationScale`, `${transmitter.toUpperCase()} Voice Modulation Scale`, "Transmitter Offsets", { min: 0, max: 200, step: 0.1, digits: 1, unit: "%" }),
  numeric(`transmitters.${transmitter}.offsets.identModulationScale`, `${transmitter.toUpperCase()} Ident Modulation Scale`, "Transmitter Offsets", { min: 0, max: 200, step: 0.1, digits: 1, unit: "%" }),
  numeric(`transmitters.${transmitter}.offsets.referenceModulationScale`, `${transmitter.toUpperCase()} Reference Modulation Scale`, "Transmitter Offsets", { min: 0, max: 200, step: 0.1, digits: 1, unit: "%" }),
  numeric(`transmitters.${transmitter}.offsets.sideband12PhaseOffset`, `${transmitter.toUpperCase()} Sideband 1-2 Phase Offset`, "Transmitter Offsets", { min: -180, max: 180, step: 0.01, digits: 2, unit: "°" }),
  numeric(`transmitters.${transmitter}.offsets.sideband34PhaseOffset`, `${transmitter.toUpperCase()} Sideband 3-4 Phase Offset`, "Transmitter Offsets", { min: -180, max: 180, step: 0.01, digits: 2, unit: "°" }),
  numeric(`transmitters.${transmitter}.offsets.carrierSidebandPhaseOffset`, `${transmitter.toUpperCase()} Carrier-Sideband Phase Offset`, "Transmitter Offsets", { min: -180, max: 180, step: 0.01, digits: 2, unit: "°" }),
  numeric(`transmitters.${transmitter}.offsets.sideband1RfLevelScale`, `${transmitter.toUpperCase()} Sideband 1 RF Scale`, "Transmitter Offsets", { min: 0, max: 200, step: 0.1, digits: 1, unit: "%" }),
  numeric(`transmitters.${transmitter}.offsets.sideband2RfLevelScale`, `${transmitter.toUpperCase()} Sideband 2 RF Scale`, "Transmitter Offsets", { min: 0, max: 200, step: 0.1, digits: 1, unit: "%" }),
  numeric(`transmitters.${transmitter}.offsets.sideband3RfLevelScale`, `${transmitter.toUpperCase()} Sideband 3 RF Scale`, "Transmitter Offsets", { min: 0, max: 200, step: 0.1, digits: 1, unit: "%" }),
  numeric(`transmitters.${transmitter}.offsets.sideband4RfLevelScale`, `${transmitter.toUpperCase()} Sideband 4 RF Scale`, "Transmitter Offsets", { min: 0, max: 200, step: 0.1, digits: 1, unit: "%" }),
]);

export const dvor1150ConfigFieldCatalog: readonly Dvor1150ConfigFieldDefinition[] = [
  { id: "station.stationDescription", label: "Station Description", section: "Station", type: "text" },
  numeric("station.frequencyMHz", "Transmitter Frequency", "Station", { min: 108, max: 118, step: 0.0001, digits: 4, unit: "MHz" }),
  { id: "station.stationType", label: "Station Type", section: "Station", type: "select", options: ["CVOR", "DVOR"] },
  { id: "station.transmitterConfig", label: "Transmitter Configuration", section: "Station", type: "select", options: ["Single Transmitter", "Dual Transmitters"] },
  { id: "station.monitorConfig", label: "Monitor Configuration", section: "Station", type: "select", options: ["Single Monitor", "Dual Monitors"] },
  { id: "rms.rcsuPresent", label: "RCSU Present", section: "RMS General", type: "boolean" },
  { id: "rms.rcsuConnectionType", label: "RCSU Connection Type", section: "RMS General", type: "select", options: ["Hard Wired", "Radio Modem"] },
  { id: "rms.automaticRestartsEnabled", label: "Automatic Restarts Enabled", section: "RMS General", type: "boolean" },
  numeric("rms.firstRestartDelay", "First Restart Delay", "RMS General", { min: 0, max: 9999, step: 1, digits: 0, unit: "seconds" }),
  { id: "rms.smokeAlarmInstalled", label: "Smoke Alarm", section: "RMS General", type: "boolean" },
  { id: "rms.intrusionAlarmInstalled", label: "Intrusion Alarm", section: "RMS General", type: "boolean" },
  { id: "rms.dmePresent", label: "DME Present", section: "RMS General", type: "boolean" },
  { id: "rms.dualDme", label: "Dual DME", section: "RMS General", type: "boolean" },
  { id: "rms.keyingOutputEnabled", label: "Keying Output", section: "RMS General", type: "boolean" },
  { id: "monitor.votingLogic", label: "Monitor Voting Logic", section: "Monitor General", type: "select", options: ["AND", "OR"] },
  numeric("monitor.monitorStartupDelay", "Monitor Startup Delay", "Monitor General", { min: 0, max: 9999, step: 1, digits: 0, unit: "seconds" }),
  numeric("monitor.monitorShutdownDelay", "Monitor Shutdown Delay", "Monitor General", { min: 0, max: 9999, step: 1, digits: 0, unit: "seconds" }),
  { id: "monitor.identMonitoringEnabled", label: "Enable Ident Monitoring", section: "Monitor General", type: "boolean" },
  numeric("monitor.sidebandVswrTolerance", "Sideband VSWR Tolerance", "Monitor General", { min: 0, max: 20, step: 0.01, digits: 2, unit: ": 1" }),
  { id: "monitor.sidebandVswrExecutiveAlarm", label: "VSWR Executive Alarm", section: "Monitor General", type: "boolean" },
  numeric("monitor.numberOfAntennasInAlarm", "Number of Antennas in Alarm", "Monitor General", { min: 1, max: 48, step: 1, digits: 0 }),
  ...monitorLimitFields,
  ...monitorOffsetFields,
  ...transmitterFields,
];

export function getDvor1150ConfigValue(config: Dvor1150Config, fieldId: string): Dvor1150ConfigValue {
  let current: unknown = config;
  for (const part of fieldId.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) return null;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" || typeof current === "number" || typeof current === "boolean" || current === null
    ? current
    : null;
}

export function setDvor1150ConfigValue(
  config: Dvor1150Config,
  fieldId: string,
  value: Dvor1150ConfigValue,
): Dvor1150Config {
  const next = structuredClone(config) as unknown as Record<string, unknown>;
  const parts = fieldId.split(".");
  let cursor = next;
  for (const part of parts.slice(0, -1)) {
    const child = cursor[part];
    if (!child || typeof child !== "object") cursor[part] = {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts.at(-1) ?? fieldId] = value;
  return next as unknown as Dvor1150Config;
}

export function parseDvor1150ConfigInput(
  field: Dvor1150ConfigFieldDefinition,
  rawValue: string | boolean,
): Dvor1150ConfigValue {
  if (field.type === "boolean") return typeof rawValue === "boolean" ? rawValue : rawValue === "true";
  if (field.type === "number") {
    if (typeof rawValue === "string" && rawValue.trim() === "") return null;
    const value = Number(rawValue);
    return Number.isFinite(value) ? value : null;
  }
  return String(rawValue);
}

export function validateDvor1150ConfigField(
  field: Dvor1150ConfigFieldDefinition,
  value: Dvor1150ConfigValue,
): string | null {
  if (field.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Giá trị phải là số hữu hạn.";
    if (field.min !== undefined && value < field.min) return `Giá trị tối thiểu là ${field.min}.`;
    if (field.max !== undefined && value > field.max) return `Giá trị tối đa là ${field.max}.`;
  }
  if (field.type === "boolean" && typeof value !== "boolean") return "Giá trị phải là boolean.";
  if (field.type === "text" && typeof value !== "string") return "Giá trị phải là chuỗi.";
  if (field.type === "select" && (!field.options || !field.options.includes(String(value)))) return "Giá trị lựa chọn không hợp lệ.";
  if (field.id.endsWith("identCode") && typeof value === "string" && !/^[A-Za-z ]{2,4}$/.test(value.trim())) {
    return "Ident code phải có 2 đến 4 ký tự chữ.";
  }
  return null;
}

export interface Dvor1150ConfigPatch {
  fieldId: string;
  value: Dvor1150ConfigValue;
}

export function validateDvor1150Config(config: Dvor1150Config): string[] {
  const errors: string[] = [];
  for (const field of dvor1150ConfigFieldCatalog) {
    const value = getDvor1150ConfigValue(config, field.id);
    const error = validateDvor1150ConfigField(field, value);
    if (error) errors.push(`${field.label}: ${error}`);
  }
  for (const parameter of DVOR1150_MONITOR_PARAMETERS) {
    const band = config.monitor.alarmLimits[parameter];
    if (!(band.alarmLow < band.preAlarmLow && band.preAlarmLow <= band.nominal && band.nominal <= band.preAlarmHigh && band.preAlarmHigh < band.alarmHigh)) {
      errors.push(`${parameterLabels[parameter]} limits không theo thứ tự.`);
    }
  }
  return errors;
}

export function applyDvor1150ConfigPatches(
  config: Dvor1150Config,
  patches: readonly Dvor1150ConfigPatch[],
): { ok: true; config: Dvor1150Config } | { ok: false; error: string } {
  let next = structuredClone(config);
  for (const patch of patches) {
    const field = dvor1150ConfigFieldCatalog.find((item) => item.id === patch.fieldId);
    if (!field) return { ok: false, error: `Không tìm thấy trường cấu hình ${patch.fieldId}.` };
    const error = validateDvor1150ConfigField(field, patch.value);
    if (error) return { ok: false, error: `${field.label}: ${error}` };
    next = setDvor1150ConfigValue(next, patch.fieldId, patch.value);
  }
  const errors = validateDvor1150Config(next);
  return errors.length > 0 ? { ok: false, error: errors[0] } : { ok: true, config: next };
}
