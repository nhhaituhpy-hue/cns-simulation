import type {
  Dvor1150aConfig,
  DvorConfigValue,
  DvorMonitorId,
  DvorTransmitterId,
} from "./config-types";
import { DVOR_MONITOR_PARAMETERS as dvorMonitorParameters } from "./config-types";

export type DvorConfigFieldType = "number" | "text" | "boolean" | "select";

export interface DvorConfigFieldDefinition {
  id: string;
  label: string;
  section: "Station" | "Transmitter 1" | "Transmitter 2" | "Monitor limits" | "Monitor control" | "Monitor antennas" | "Monitor calibration" | "Monitor raw measurements" | "Monitor routing" | "Simulation";
  type: DvorConfigFieldType;
  unit?: string;
  description: string;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
}

const txFields = (transmitter: DvorTransmitterId): DvorConfigFieldDefinition[] => [
  {
    id: `transmitters.${transmitter}.enabled`,
    label: "Enabled",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "boolean",
    description: "Cho phép transmitter tham gia trạng thái dual transmitter.",
  },
  {
    id: `transmitters.${transmitter}.onAir`,
    label: "On-air",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "boolean",
    description: "Nguồn phát đang được chọn lên anten. Chỉ nên có một Tx on-air.",
  },
  {
    id: `transmitters.${transmitter}.load`,
    label: "Load",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "boolean",
    description: "Đưa transmitter vào tải giả; trạng thái này loại trừ On-air và Off.",
  },
  {
    id: `transmitters.${transmitter}.frequencyErrorPpm`,
    label: "Frequency error",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "ppm",
    min: -100,
    max: 100,
    step: 1,
    description: "Sai số tần số Tx; engine quy đổi sang MHz theo tần số trạm.",
  },
  {
    id: `transmitters.${transmitter}.nominal.azimuthIndex`,
    label: "Azimuth index",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "°",
    min: -360,
    max: 360,
    step: 0.01,
    description: "Chỉ số góc danh định của Audio Generator.",
  },
  {
    id: `transmitters.${transmitter}.nominal.outputPower`,
    label: "Output power",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "W",
    min: 0,
    max: 200,
    step: 0.1,
    description: "Công suất danh định trước khi áp dụng scale.",
  },
  {
    id: `transmitters.${transmitter}.nominal.voiceModulation`,
    label: "Voice modulation",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "%",
    min: 0,
    max: 30,
    step: 0.1,
    description: "Điều chế voice danh định theo 571150A-0002E §9.7.13.2 (0–30%).",
  },
  {
    id: `transmitters.${transmitter}.nominal.identModulation`,
    label: "Ident modulation",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
    step: 0.1,
    description: "Điều chế ident danh định.",
  },
  {
    id: `transmitters.${transmitter}.nominal.referenceModulation`,
    label: "Reference modulation",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
    step: 0.1,
    description: "Điều chế reference 30 Hz danh định.",
  },
  {
    id: `transmitters.${transmitter}.nominal.sboRfLevel`,
    label: "SBO RF level",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
    step: 0.1,
    description: "Mức RF SBO theo phần trăm công suất cực đại của bộ khuếch đại.",
  },
  {
    id: `transmitters.${transmitter}.nominal.mainIdentCode`,
    label: "Main ident code",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "text",
    description: "Mã ident chính từ 2 đến 4 ký tự.",
  },
  {
    id: `transmitters.${transmitter}.nominal.standbyIdentCode`,
    label: "Standby ident code",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "select",
    options: ["Same as Main Ident", "Different Ident"],
    description: "Mã ident standby hoặc Same as Main Ident.",
  },
  {
    id: `transmitters.${transmitter}.nominal.keyerMode`,
    label: "Keyer mode",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "select",
    options: ["disabled", "external"],
    description: "Nguồn keyer input của transmitter.",
  },
  {
    id: `transmitters.${transmitter}.offsets.azimuthAngleOffset`,
    label: "Azimuth angle offset",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "°",
    min: -360,
    max: 360,
    step: 0.01,
    description: "Offset góc cộng vào chỉ số azimuth của Audio Generator.",
  },
  {
    id: `transmitters.${transmitter}.offsets.outputPowerScale`,
    label: "Output power scale",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "%",
    min: 0,
    max: 200,
    step: 0.1,
    description: "Công thức: nominal output power × scale / 100.",
  },
  {
    id: `transmitters.${transmitter}.offsets.voiceModulationScale`,
    label: "Voice modulation scale",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "%",
    min: 0,
    max: 200,
    step: 0.1,
    description: "Scale điều chế voice.",
  },
  {
    id: `transmitters.${transmitter}.offsets.identModulationScale`,
    label: "Ident modulation scale",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "%",
    min: 0,
    max: 200,
    step: 0.1,
    description: "Scale điều chế ident đưa sang monitor.",
  },
  {
    id: `transmitters.${transmitter}.offsets.referenceModulationScale`,
    label: "Reference modulation scale",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "%",
    min: 0,
    max: 200,
    step: 0.1,
    description: "Scale điều chế reference 30 Hz.",
  },
  {
    id: `transmitters.${transmitter}.offsets.carrierPllControl`,
    label: "Carrier PLL control",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "%",
    min: -200,
    max: 200,
    step: 0.1,
    description: "Điều khiển PLL carrier trong mô hình transmitter.",
  },
  {
    id: `transmitters.${transmitter}.offsets.carrierSidebandPhaseOffsetCoarse`,
    label: "Carrier sideband phase coarse",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "°",
    min: -360,
    max: 360,
    step: 0.1,
    description: "Offset pha carrier sideband thô.",
  },
  {
    id: `transmitters.${transmitter}.offsets.carrierSidebandPhaseOffsetFine`,
    label: "Carrier sideband phase fine",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "°",
    min: -360,
    max: 360,
    step: 0.1,
    description: "Offset pha carrier sideband tinh.",
  },
  ...([1, 2, 3, 4] as const).map((sideband) => ({
    id: `transmitters.${transmitter}.offsets.sideband${sideband}PhaseOffset`,
    label: `Sideband ${sideband} phase offset`,
    section: transmitter === "tx1" ? "Transmitter 1" as const : "Transmitter 2" as const,
    type: "number" as const,
    unit: "°",
    min: -360,
    max: 360,
    step: 0.1,
    description: `Offset pha sideband ${sideband}.`,
  })),
  {
    id: `transmitters.${transmitter}.offsets.txSidebandRfLevelScale`,
    label: "Tx sideband RF scale",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: "%",
    min: 0,
    max: 200,
    step: 0.1,
    description: "Scale SBO áp dụng cho tất cả sideband.",
  },
  ...([1, 2, 3, 4] as const).map((sideband) => ({
    id: `transmitters.${transmitter}.offsets.sideband${sideband}RfLevelScale`,
    label: `Sideband ${sideband} RF level scale`,
    section: transmitter === "tx1" ? "Transmitter 1" as const : "Transmitter 2" as const,
    type: "number" as const,
    unit: "%",
    min: 0,
    max: 200,
    step: 0.1,
    description: `Scale RF level của sideband ${sideband}.`,
  })),
  ...([1, 2, 3, 4] as const).map((sideband) => ({
    id: `transmitters.${transmitter}.offsets.sideband${sideband}VswrOffset`,
    label: `Sideband ${sideband} VSWR offset`,
    section: transmitter === "tx1" ? "Transmitter 1" as const : "Transmitter 2" as const,
    type: "number" as const,
    unit: ":1",
    min: -10,
    max: 10,
    step: 0.01,
    description: `Hiệu chỉnh VSWR sideband ${sideband} đo bởi transmitter.`,
  })),
  {
    id: `transmitters.${transmitter}.vswr.carrier`,
    label: "Carrier VSWR",
    section: transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2",
    type: "number",
    unit: ":1",
    min: 1,
    max: 10,
    step: 0.01,
    description: "VSWR carrier trước khi áp dụng fault hoặc hiển thị Tx; giá trị vật lý tối thiểu là 1:1.",
  },
  ...([0, 1, 2, 3] as const).map((sideband) => ({
    id: `transmitters.${transmitter}.vswr.sidebands.${sideband}`,
    label: `Sideband ${sideband + 1} VSWR`,
    section: transmitter === "tx1" ? "Transmitter 1" as const : "Transmitter 2" as const,
    type: "number" as const,
    unit: ":1",
    min: 1,
    max: 10,
    step: 0.01,
    description: `VSWR sideband ${sideband + 1} trước khi áp dụng offset; giá trị vật lý tối thiểu là 1:1.`,
  })),
  ...(["disabled", "carrierVswr", "overtemperature", "frequencyError"] as const).map((fault) => ({
    id: `transmitters.${transmitter}.faults.${fault}`,
    label: fault === "disabled" ? "Forced disabled" : fault,
    section: transmitter === "tx1" ? "Transmitter 1" as const : "Transmitter 2" as const,
    type: "boolean" as const,
    description: "Fault injection phục vụ mô phỏng sự cố và automatic transfer.",
  })),
];

const alarmFields = [
  ["hz30Modulation", "30 Hz modulation", "%"],
  ["hz9960Modulation", "9960 Hz modulation", "%"],
  ["deviation", "9960 Hz deviation", "Ratio"],
  ["rfLevel", "RF level", "dB"],
  ["identModulation", "Ident modulation", "%"],
  ["txPower", "Tx power", "W"],
  ["txFrequencyError", "Tx frequency error", "ppm"],
] as const;

const alarmLimitFields = alarmFields.flatMap(([parameter, label, unit]) =>
  (["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] as const).map((limit) => ({
    id: `monitor.alarmLimits.${parameter}.${limit}`,
    label: `${label} ${limit}`,
    section: "Monitor limits" as const,
    type: "number" as const,
    unit,
    step: parameter === "txFrequencyError" || parameter === "txPower" ? 1 : 0.1,
    description: "Giới hạn dùng để phân loại Normal / Pre-alarm / Alarm.",
  })),
);

const monitorControlFields: DvorConfigFieldDefinition[] = [
  { id: "monitor.azimuthLimits.preAlarm", label: "Azimuth pre-alarm", section: "Monitor control", type: "number", unit: "°", min: 0, max: 180, step: 0.01, description: "Sai lệch góc để tạo pre-alarm." },
  { id: "monitor.azimuthLimits.alarm", label: "Azimuth alarm", section: "Monitor control", type: "number", unit: "°", min: 0, max: 180, step: 0.01, description: "Sai lệch góc để tạo alarm." },
  { id: "monitor.timers.shutdown", label: "Integral shutdown delay", section: "Monitor control", type: "number", unit: "s", min: 0, max: 600, step: 0.1, description: "Delay shutdown sau khi monitor vào alarm." },
  { id: "monitor.timers.continuousIdent", label: "Continuous ident timer", section: "Monitor control", type: "number", unit: "s", min: 0, max: 600, step: 0.1, description: "Timer ident liên tục." },
  { id: "monitor.timers.noIdent", label: "No ident timer", section: "Monitor control", type: "number", unit: "s", min: 0, max: 600, step: 0.1, description: "Timer mất ident." },
  { id: "monitor.votingLogic", label: "Voting logic", section: "Monitor control", type: "select", options: ["AND", "OR"], description: "AND yêu cầu cả monitor; OR yêu cầu ít nhất một monitor khỏe." },
  { id: "monitor.transfer", label: "Transfer rule", section: "Monitor control", type: "select", options: ["on Primary Alarm", "on Any Alarm", "disabled"], description: "Quy tắc yêu cầu chuyển transmitter." },
  { id: "monitor.integrity.enabled", label: "Integrity tests enabled", section: "Monitor control", type: "boolean", description: "Cho phép kiểm tra integrity tự động." },
  { id: "monitor.integrity.maxConsecutiveFailures", label: "Integrity consecutive failures", section: "Monitor control", type: "number", unit: "failures", min: 1, max: 10, step: 1, description: "Số lần integrity fail liên tiếp trước khi monitor bị disable." },
  { id: "monitor.sidebandVswr.numberAntennasInAlarm", label: "Sideband antennas in alarm", section: "Monitor control", type: "number", unit: "antennas", min: 1, max: 48, step: 1, description: "Số anten sideband vượt alarm để đưa VSWR vào alarm." },
  { id: "monitor.sidebandVswr.preAlarm", label: "Sideband VSWR pre-alarm", section: "Monitor control", type: "number", unit: ":1", min: 1, max: 10, step: 0.01, description: "Ngưỡng pre-alarm VSWR." },
  { id: "monitor.sidebandVswr.alarm", label: "Sideband VSWR alarm", section: "Monitor control", type: "number", unit: ":1", min: 1, max: 10, step: 0.01, description: "Ngưỡng alarm VSWR." },
  { id: "monitor.notchTolerance", label: "Notch monitor tolerance", section: "Monitor control", type: "number", unit: "%", min: 0, max: 100, step: 0.1, description: "Sai lệch phần trăm so với notch baseline trước khi tạo alert/alarm." },
];

const antennaFields: DvorConfigFieldDefinition[] = (["mon1", "mon2"] as DvorMonitorId[]).flatMap((monitor) => [
  { id: `monitor.antennas.${monitor}.enabled`, label: `${monitor.toUpperCase()} enabled`, section: "Monitor antennas" as const, type: "boolean" as const, description: "Monitor có được tham gia voting hay không." },
  { id: `monitor.antennas.${monitor}.inputAttenuation`, label: `${monitor.toUpperCase()} input attenuation`, section: "Monitor antennas" as const, type: "number" as const, unit: "dB", min: 0, max: 60, step: 0.1, description: "Suy hao đầu vào để RF monitor gần 0 dB." },
  { id: `monitor.antennas.${monitor}.azimuthAngle`, label: `${monitor.toUpperCase()} azimuth angle`, section: "Monitor antennas" as const, type: "number" as const, unit: "°", min: 0, max: 360, step: 0.01, description: "Góc radial danh định của monitor." },
  { id: `monitor.antennas.${monitor}.secondAntennaEnabled`, label: `${monitor.toUpperCase()} antenna 2`, section: "Monitor antennas" as const, type: "boolean" as const, description: "Bật anten thứ hai cho monitor." },
  { id: `monitor.antennas.${monitor}.secondInputAttenuation`, label: `${monitor.toUpperCase()} antenna 2 attenuation`, section: "Monitor antennas" as const, type: "number" as const, unit: "dB", min: 0, max: 60, step: 0.1, description: "Suy hao đầu vào của anten thứ hai." },
  { id: `monitor.antennas.${monitor}.secondAzimuthAngle`, label: `${monitor.toUpperCase()} antenna 2 angle`, section: "Monitor antennas" as const, type: "number" as const, unit: "°", min: 0, max: 360, step: 0.01, description: "Góc radial của anten thứ hai." },
]);

const calibrationFields: DvorConfigFieldDefinition[] = (["mon1", "mon2"] as DvorMonitorId[]).flatMap((monitor) => [
  { id: `monitor.calibration.${monitor}.azimuthOffset`, label: `${monitor.toUpperCase()} azimuth offset`, section: "Monitor calibration" as const, type: "number" as const, unit: "°", min: -360, max: 360, step: 0.01, description: "Offset góc đo." },
  { id: `monitor.calibration.${monitor}.hz30ModulationScale`, label: `${monitor.toUpperCase()} 30 Hz scale`, section: "Monitor calibration" as const, type: "number" as const, unit: "%", min: 0, max: 200, step: 0.1, description: "Scale hiệu chỉnh 30 Hz." },
  { id: `monitor.calibration.${monitor}.hz9960ModulationScale`, label: `${monitor.toUpperCase()} 9960 Hz scale`, section: "Monitor calibration" as const, type: "number" as const, unit: "%", min: 0, max: 200, step: 0.1, description: "Scale hiệu chỉnh 9960 Hz." },
  { id: `monitor.calibration.${monitor}.deviationScale`, label: `${monitor.toUpperCase()} deviation scale`, section: "Monitor calibration" as const, type: "number" as const, unit: "%", min: 0, max: 200, step: 0.1, description: "Scale hiệu chỉnh deviation." },
  { id: `monitor.calibration.${monitor}.rfLevelOffset`, label: `${monitor.toUpperCase()} RF offset`, section: "Monitor calibration" as const, type: "number" as const, unit: "dB", min: -20, max: 20, step: 0.1, description: "Offset hiệu chỉnh RF level." },
  { id: `monitor.calibration.${monitor}.identModulationScale`, label: `${monitor.toUpperCase()} ident scale`, section: "Monitor calibration" as const, type: "number" as const, unit: "%", min: 0, max: 200, step: 0.1, description: "Scale hiệu chỉnh ident." },
  { id: `monitor.calibration.${monitor}.txPowerScale`, label: `${monitor.toUpperCase()} Tx power scale`, section: "Monitor calibration" as const, type: "number" as const, unit: "%", min: 0, max: 200, step: 0.1, description: "Scale hiệu chỉnh Tx power." },
  { id: `monitor.calibration.${monitor}.txFrequencyErrorOffset`, label: `${monitor.toUpperCase()} Tx frequency offset`, section: "Monitor calibration" as const, type: "number" as const, unit: "ppm", min: -100, max: 100, step: 0.1, description: "Offset hiệu chỉnh sai số tần số." },
  { id: `monitor.calibration.${monitor}.txPowerOffset`, label: `${monitor.toUpperCase()} Tx power offset`, section: "Monitor calibration" as const, type: "number" as const, unit: "W", min: -200, max: 200, step: 0.1, description: "Offset hiệu chỉnh công suất Tx." },
  { id: `monitor.calibration.${monitor}.notchScale`, label: `${monitor.toUpperCase()} notch scale`, section: "Monitor calibration" as const, type: "number" as const, unit: "%", min: 0, max: 200, step: 0.1, description: "Scale hiệu chỉnh notch monitor." },
  { id: `monitor.calibration.${monitor}.oddAntennaReturnLossOffset`, label: `${monitor.toUpperCase()} odd return loss offset`, section: "Monitor calibration" as const, type: "number" as const, unit: "dB", min: -100, max: 100, step: 0.1, description: "Offset anten odd trong calibration." },
  { id: `monitor.calibration.${monitor}.evenAntennaReturnLossOffset`, label: `${monitor.toUpperCase()} even return loss offset`, section: "Monitor calibration" as const, type: "number" as const, unit: "dB", min: -100, max: 100, step: 0.1, description: "Offset anten even trong calibration." },
]);

const rawMeasurementFields: DvorConfigFieldDefinition[] = (["mon1", "mon2"] as DvorMonitorId[]).flatMap((monitor) => [
  { id: `monitor.rawMeasurements.${monitor}.azimuth`, label: `${monitor.toUpperCase()} raw azimuth`, section: "Monitor raw measurements" as const, type: "number" as const, unit: "°", min: -360, max: 360, step: 0.01, description: "Giá trị azimuth thô trước calibration." },
  { id: `monitor.rawMeasurements.${monitor}.hz30Modulation`, label: `${monitor.toUpperCase()} raw 30 Hz`, section: "Monitor raw measurements" as const, type: "number" as const, unit: "%", min: 0, max: 100, step: 0.1, description: "Giá trị điều chế 30 Hz thô." },
  { id: `monitor.rawMeasurements.${monitor}.hz9960Modulation`, label: `${monitor.toUpperCase()} raw 9960 Hz`, section: "Monitor raw measurements" as const, type: "number" as const, unit: "%", min: 0, max: 100, step: 0.1, description: "Giá trị điều chế 9960 Hz thô." },
  { id: `monitor.rawMeasurements.${monitor}.deviation`, label: `${monitor.toUpperCase()} raw deviation`, section: "Monitor raw measurements" as const, type: "number" as const, unit: "Ratio", min: 0, max: 100, step: 0.0001, description: "Deviation 9960 Hz thô." },
  { id: `monitor.rawMeasurements.${monitor}.rfLevel`, label: `${monitor.toUpperCase()} raw RF level`, section: "Monitor raw measurements" as const, type: "number" as const, unit: "dB", min: -100, max: 100, step: 0.1, description: "RF level thô trước offset." },
  { id: `monitor.rawMeasurements.${monitor}.identModulation`, label: `${monitor.toUpperCase()} raw ident`, section: "Monitor raw measurements" as const, type: "number" as const, unit: "%", min: 0, max: 100, step: 0.1, description: "Ident modulation thô." },
  { id: `monitor.rawMeasurements.${monitor}.identStatus`, label: `${monitor.toUpperCase()} ident status`, section: "Monitor raw measurements" as const, type: "select" as const, options: ["Normal", "No Ident", "Continuous Ident"], description: "Trạng thái ident thô." },
  { id: `monitor.rawMeasurements.${monitor}.identCode`, label: `${monitor.toUpperCase()} ident code`, section: "Monitor raw measurements" as const, type: "text" as const, description: "Mã ident đo được bởi monitor." },
  { id: `monitor.rawMeasurements.${monitor}.txFrequencyError`, label: `${monitor.toUpperCase()} raw frequency error`, section: "Monitor raw measurements" as const, type: "number" as const, unit: "ppm", min: -100, max: 100, step: 1, description: "Sai số tần số thô khi không có Tx source." },
  { id: `monitor.rawMeasurements.${monitor}.notchMonitor`, label: `${monitor.toUpperCase()} notch detector scale`, section: "Monitor raw measurements" as const, type: "number" as const, unit: "%", min: 0, max: 200, step: 0.1, description: "Gain detector notch chuẩn hóa; 100% là mức baseline." },
  ...Array.from({ length: 48 }, (_, antenna) => ({
    id: `monitor.rawMeasurements.${monitor}.sidebandVswr.${antenna}`,
    label: `${monitor.toUpperCase()} raw antenna ${antenna + 1} VSWR`,
    section: "Monitor raw measurements" as const,
    type: "number" as const,
    unit: ":1",
    min: 1,
    max: 10,
    step: 0.01,
    description: `VSWR anten ${antenna + 1} tại monitor trước threshold voting.`,
  })),
]);

const routingFields: DvorConfigFieldDefinition[] = dvorMonitorParameters.flatMap((parameter) => [
  { id: `monitor.routing.${parameter}.primary`, label: `${parameter} primary`, section: "Monitor routing" as const, type: "boolean" as const, description: "Định tuyến parameter vào primary monitor." },
  { id: `monitor.routing.${parameter}.secondary`, label: `${parameter} secondary`, section: "Monitor routing" as const, type: "boolean" as const, description: "Định tuyến parameter vào secondary monitor." },
]);

export const dvorConfigFieldCatalog: readonly DvorConfigFieldDefinition[] = [
  { id: "station.stationDescription", label: "Station description", section: "Station", type: "text", description: "Tên trạm hiển thị trên title bar và RMS station config." },
  { id: "station.frequencyMHz", label: "Transmitter frequency", section: "Station", type: "number", unit: "MHz", min: 108, max: 118, step: 0.0001, description: "Tần số VOR; engine tính carrier và sideband frequency." },
  { id: "station.stationType", label: "Station type", section: "Station", type: "select", options: ["DVOR"], description: "Loại đài được mô phỏng." },
  { id: "station.transmitterConfig", label: "Transmitter configuration", section: "Station", type: "select", options: ["Dual Transmitters", "Single Transmitter"], description: "Single Transmitter vô hiệu TX2 trong snapshot nhưng vẫn giữ cấu hình TX2 để chuyển lại dual." },
  { id: "station.monitorConfig", label: "Monitor configuration", section: "Station", type: "select", options: ["Dual Monitors", "Single Monitor"], description: "Single Monitor loại Monitor 2 khỏi health và voting nhưng vẫn giữ cấu hình của nó." },
  ...txFields("tx1"),
  ...txFields("tx2"),
  ...alarmLimitFields,
  ...monitorControlFields,
  ...antennaFields,
  ...calibrationFields,
  ...rawMeasurementFields,
  ...routingFields,
  { id: "simulation.connected", label: "RMS connected", section: "Simulation", type: "boolean", description: "Trạng thái liên kết RMS." },
  { id: "simulation.local", label: "Local mode", section: "Simulation", type: "boolean", description: "Đưa hệ thống vào Local mode." },
  { id: "simulation.integralMonitorBypass", label: "Integral monitor bypass", section: "Simulation", type: "boolean", description: "Giữ alarm hiển thị nhưng chặn tự động chuyển transmitter; chỉ được bật sau khi Local đã bật." },
  { id: "simulation.alert", label: "Force system alert", section: "Simulation", type: "boolean", description: "Ép trạng thái Alert để phục vụ kịch bản." },
  { id: "simulation.timestamp", label: "Display timestamp", section: "Simulation", type: "text", description: "Timestamp hiển thị trên status/data screens." },
];

export function getDvorConfigValue(config: Dvor1150aConfig, fieldId: string): DvorConfigValue {
  let current: unknown = config;
  for (const part of fieldId.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) return null;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" || typeof current === "number" || typeof current === "boolean" || current === null
    ? current
    : null;
}

export function setDvorConfigValue(
  config: Dvor1150aConfig,
  fieldId: string,
  value: DvorConfigValue,
): Dvor1150aConfig {
  const next = structuredClone(config) as unknown as Record<string, unknown>;
  const parts = fieldId.split(".");
  let cursor = next;
  for (const part of parts.slice(0, -1)) {
    const child = cursor[part];
    if (!child || typeof child !== "object") cursor[part] = {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts.at(-1) ?? fieldId] = value;
  return next as unknown as Dvor1150aConfig;
}

export function parseDvorConfigInput(field: DvorConfigFieldDefinition, rawValue: string | boolean): DvorConfigValue {
  if (field.type === "boolean") return typeof rawValue === "boolean" ? rawValue : rawValue === "true";
  if (field.type === "number") {
    if (typeof rawValue === "string" && rawValue.trim() === "") return null;
    const value = Number(rawValue);
    return Number.isFinite(value) ? value : null;
  }
  return String(rawValue);
}

export function validateDvorConfigField(field: DvorConfigFieldDefinition, value: DvorConfigValue): string | null {
  if (field.type === "boolean" && typeof value !== "boolean") return "Giá trị phải là true hoặc false.";
  if (field.type === "text" && typeof value !== "string") return "Giá trị phải là chuỗi ký tự.";
  if (field.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Giá trị phải là số hữu hạn.";
    if (field.min !== undefined && value < field.min) return `Giá trị tối thiểu là ${field.min}.`;
    if (field.max !== undefined && value > field.max) return `Giá trị tối đa là ${field.max}.`;
  }
  if (
    field.type === "text"
    && typeof value === "string"
    && field.id.endsWith("mainIdentCode")
    && !/^[A-Za-z0-9]{2,4}$/.test(value.trim())
  ) {
    return "Ident code phải có 2 đến 4 ký tự chữ/số.";
  }
  if (field.type === "select" && (!field.options || !field.options.includes(String(value)))) {
    return "Giá trị lựa chọn không hợp lệ.";
  }
  return null;
}
