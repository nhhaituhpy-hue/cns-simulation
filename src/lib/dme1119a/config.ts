import type { DmeEditableValue, DmePmdtData } from "../dme-types";
import {
  formatDmeFrequency,
  getDmeStationChannelAllocation,
  type DmeChannelAllocation,
} from "./channel-allocation";
import { recomputeDmeDerivedData } from "./derived-data";

export type DmeParameterValue = DmeEditableValue;
export type DmeParameterFieldType = "boolean" | "number" | "select" | "text";

/**
 * Configuration-to-screen traceability used by the DME training model.
 *
 * The 1119A manual describes a parameter on one screen and the resulting
 * measurement/alarm on several other screens. Keeping this metadata next to
 * the editable field prevents a new control from becoming a UI-only knob.
 */
export interface DmeParameterDerivationMetadata {
  affects: readonly string[];
  formula: string;
  alarmStatus: string;
  controlOnly?: boolean;
}

export interface DmeParameterFieldDefinition {
  id: string;
  label: string;
  section: string;
  type: DmeParameterFieldType;
  description: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
  readOnly?: boolean;
  precision?: number;
  derivation?: DmeParameterDerivationMetadata;
}

const systemFields: readonly DmeParameterFieldDefinition[] = [
  { id: "connected", label: "RMS connected", section: "Simulation", type: "boolean", description: "Trạng thái liên kết giữa PMDT và RMS." },
  { id: "local", label: "Local mode", section: "Simulation", type: "boolean", description: "Đưa hệ thống vào chế độ điều khiển tại chỗ." },
  { id: "alert", label: "Force system alert", section: "Simulation", type: "boolean", description: "Ép trạng thái Alert để kiểm tra giao diện và kịch bản." },
  { id: "timestamp", label: "Display timestamp", section: "Simulation", type: "text", description: "Thời gian hiển thị trên các màn hình PMDT." },
];

const channelFields: readonly DmeParameterFieldDefinition[] = [
  { id: "rmsConfigStation.channelType", label: "Channel type", section: "Channel assignment", type: "select", options: ["X", "Y"], description: "Loại mã xung kênh DME theo Table 9-5 của manual." },
  { id: "rmsConfigStation.channelNumber", label: "Channel number", section: "Channel assignment", type: "number", min: 1, max: 126, step: 1, description: "Số kênh DME hợp lệ từ 1 đến 126." },
  { id: "channelAllocation.receiverFrequencyMHz", label: "Assigned receiver (RX)", section: "Channel assignment", type: "number", unit: "MHz", readOnly: true, precision: 3, description: "Tần số thu tín hiệu interrogation từ máy bay; được suy ra từ kênh." },
  { id: "channelAllocation.transmitterReplyFrequencyMHz", label: "Transmitter reply (TX)", section: "Channel assignment", type: "number", unit: "MHz", readOnly: true, precision: 3, description: "Tần số phát reply của transponder; được suy ra từ kênh X/Y." },
  { id: "channelAllocation.monitorInterrogatorFrequencyMHz", label: "Monitor interrogator (INT)", section: "Channel assignment", type: "number", unit: "MHz", readOnly: true, precision: 3, description: "Tần số bộ Monitor Interrogator dùng để kích thích bộ phát đáp." },
  { id: "channelAllocation.receiverLoFrequencyMHz", label: "Receiver LO", section: "Channel assignment", type: "number", unit: "MHz", readOnly: true, precision: 3, description: "Tần số RX LO, thấp hơn tần số thu được gán 125 MHz." },
  { id: "channelAllocation.interrogatorPulseSpacingUs", label: "INT pulse spacing", section: "Channel assignment", type: "number", unit: "us", readOnly: true, precision: 0, description: "Khoảng cách xung interrogation: X = 12 us, Y = 36 us." },
  { id: "channelAllocation.transmitterReplyPulseSpacingUs", label: "TX reply pulse spacing", section: "Channel assignment", type: "number", unit: "us", readOnly: true, precision: 0, description: "Khoảng cách xung reply: X = 12 us, Y = 30 us." },
  { id: "channelAllocation.nominalReplyDelayUs", label: "Nominal reply delay", section: "Channel assignment", type: "number", unit: "us", readOnly: true, precision: 0, description: "Độ trễ reply danh định: X = 50 us, Y = 56 us." },
];

const stationFields: readonly DmeParameterFieldDefinition[] = [
  { id: "rmsConfigStation.powerLevel", label: "Station power", section: "Station equipment", type: "select", options: ["Low Power", "High Power"], description: "Cấu hình công suất thiết bị: 1118A Low Power hoặc 1119A High Power." },
  { id: "rmsConfigStation.transmitterConfig", label: "Transmitters", section: "Station equipment", type: "select", options: ["Single Transmitter", "Dual Transmitters"], description: "Số lượng transmitter được lắp đặt tại trạm." },
  { id: "rmsConfigStation.monitorConfig", label: "Monitors", section: "Station equipment", type: "select", options: ["Single Monitor", "Dual Monitors"], description: "Số lượng monitor được lắp đặt tại trạm." },
  { id: "rmsConfigStation.hotStandby", label: "Hot standby", section: "Station equipment", type: "boolean", description: "Cho phép transmitter dự phòng hoạt động ở chế độ hot standby." },
  { id: "rmsConfigStation.stationDescription", label: "Station description", section: "Station equipment", type: "text", description: "Tên trạm DME hiển thị trong cấu hình RMS." },
];

const systemSelectionFields: readonly DmeParameterFieldDefinition[] = [
  { id: "monitorTransmitterStatus.mainSelect", label: "Main transmitter", section: "Equipment selection", type: "number", min: 1, max: 2, step: 1, description: "Chọn transmitter chính đang được hệ thống sử dụng." },
  { id: "monitorTransmitterStatus.antennaSelect", label: "Antenna transmitter", section: "Equipment selection", type: "number", min: 1, max: 2, step: 1, description: "Chọn transmitter đang nối với antenna." },
  { id: "monitorTransmitterStatus.transmitterOn.tx1", label: "Transmitter 1 enabled", section: "Equipment selection", type: "boolean", description: "Cho phép transmitter 1 hoạt động." },
  { id: "monitorTransmitterStatus.transmitterOn.tx2", label: "Transmitter 2 enabled", section: "Equipment selection", type: "boolean", description: "Cho phép transmitter 2 hoạt động." },
  { id: "monitorTransmitterStatus.enabledMonitors.monitor1", label: "Monitor 1 enabled", section: "Equipment selection", type: "boolean", description: "Cho phép monitor 1 tham gia giám sát." },
  { id: "monitorTransmitterStatus.enabledMonitors.monitor2", label: "Monitor 2 enabled", section: "Equipment selection", type: "boolean", description: "Cho phép monitor 2 tham gia giám sát." },
];

const monitorReadingFields: readonly DmeParameterFieldDefinition[] = [
  { id: "sidebarParams.delay.value", label: "Delay", unit: "us", min: 0, max: 100, step: 0.01 },
  { id: "sidebarParams.spacing.value", label: "Spacing", unit: "us", min: 0, max: 40, step: 0.01 },
  { id: "sidebarParams.txPower.value", label: "Tx power", unit: "W", min: 0, max: 5000, step: 1 },
  { id: "sidebarParams.erp.value", label: "ERP", unit: "dB", min: -30, max: 30, step: 0.1 },
  { id: "sidebarParams.efficiency.value", label: "Efficiency", unit: "%", min: 0, max: 100, step: 0.1 },
  { id: "sidebarParams.prf.value", label: "PRF", unit: "ppps", min: 0, max: 6000, step: 1 },
].map((field) => ({
  ...field,
  section: "Monitor readings",
  type: "number" as const,
  readOnly: true,
  description: `Giá trị ${field.label} hiển thị tại sidebar Monitor 1.`,
}));

const monitorControlFields: readonly DmeParameterFieldDefinition[] = [
  { id: "monitorTimers.integralShutdownDelay", label: "Integral shutdown delay", unit: "s", min: 0, max: 600, step: 0.1 },
  { id: "monitorTimers.standbyShutdownDelay", label: "Standby shutdown delay", unit: "s", min: 0, max: 600, step: 0.1 },
  { id: "monitorTimers.continuousIdent", label: "Continuous ident timer", unit: "s", min: 0, max: 600, step: 0.1 },
  { id: "monitorTimers.noIdent", label: "No ident timer", unit: "s", min: 0, max: 600, step: 0.1 },
  { id: "monitorSystemSettings.efficiencyCertificationLevel", label: "Efficiency certification", unit: "%", min: 0, max: 100, step: 1 },
  { id: "monitorSystemSettings.monitor1ReplyAttenuation", label: "Monitor 1 reply attenuation", unit: "dB", min: 0, max: 100, step: 0.1 },
  { id: "monitorSystemSettings.monitor2ReplyAttenuation", label: "Monitor 2 reply attenuation", unit: "dB", min: 0, max: 100, step: 0.1 },
  { id: "monitorSystemSettings.directionalCouplerLoss", label: "Directional coupler loss", unit: "dB", min: -500, max: 0, step: 0.1 },
].map((field) => ({
  ...field,
  section: "Monitor control",
  type: "number" as const,
  description: `Tham số ${field.label} của khối monitor DME.`,
}));

const rmsControlFields: readonly DmeParameterFieldDefinition[] = [
  { id: "rmsConfigGeneral.monitorIntegrityTestsEnabled", label: "Integrity tests enabled", section: "RMS control", type: "boolean", description: "Cho phép RMS thực hiện kiểm tra integrity tự động." },
  { id: "rmsConfigGeneral.votingLogic", label: "Voting logic", section: "RMS control", type: "select", options: ["AND", "OR"], description: "Quy tắc tổng hợp trạng thái hai monitor." },
  { id: "rmsConfigGeneral.transfer", label: "Transfer rule", section: "RMS control", type: "select", options: ["on Primary Alarm", "on Secondary Alarm", "Best Availability"], description: "Điều kiện yêu cầu chuyển transmitter theo RMS/LCU." },
  { id: "rmsConfigGeneral.automaticRestartsEnabled", label: "Automatic restarts", section: "RMS control", type: "boolean", description: "Cho phép RMS tự khởi động lại thiết bị." },
  { id: "rmsConfigGeneral.firstRestartDelay", label: "First restart delay", section: "RMS control", type: "number", unit: "s", min: 0, max: 600, step: 1, description: "Thời gian chờ trước lần restart đầu tiên." },
  { id: "rmsConfigGeneral.numberOfAutomaticRestarts", label: "Automatic restart count", section: "RMS control", type: "number", min: 0, max: 10, step: 1, description: "Số lần RMS được phép tự restart." },
  { id: "rmsConfigGeneral.rcsuPresent", label: "RCSU present", section: "RMS control", type: "boolean", description: "Khai báo RCSU có trong cấu hình trạm." },
  { id: "rmsConfigGeneral.rcsuConnectionType", label: "RCSU connection type", section: "RMS control", type: "select", options: ["Dedicated Modem", "RF Modem/Fiber"], description: "Kiểu đường kết nối giữa RMS và RCSU." },
  { id: "rmsConfigGeneral.interlockControl", label: "Interlock control", section: "RMS control", type: "select", options: ["Not Applicable", "External Interlock Input", "From RCSU"], description: "Nguồn điều khiển interlock của hệ thống DME." },
  { id: "rmsConfigGeneral.spiFilterType", label: "SPI filter", section: "RMS control", type: "select", options: ["Normal", "Filtered"], description: "Chế độ lọc tín hiệu SPI của RMS." },
  { id: "rmsConfigGeneral.exitDelay", label: "Security exit delay", section: "RMS control", type: "number", unit: "s", min: 0, max: 600, step: 1, description: "Thời gian trễ thoát của hệ thống an ninh." },
  { id: "rmsConfigGeneral.entryDelay", label: "Security entry delay", section: "RMS control", type: "number", unit: "s", min: 0, max: 600, step: 1, description: "Thời gian trễ vào của hệ thống an ninh." },
  { id: "rmsConfigGeneral.remoteResetEnabledSmoke", label: "Remote smoke reset", section: "RMS control", type: "boolean", description: "Cho phép reset cảnh báo khói từ xa." },
  { id: "rmsConfigGeneral.remoteResetEnabledIntrusion", label: "Remote intrusion reset", section: "RMS control", type: "boolean", description: "Cho phép reset cảnh báo xâm nhập từ xa." },
  { id: "rmsConfigGeneral.rmmConnectionType", label: "RMM connection type", section: "RMS control", type: "select", options: ["PSTN Modem", "Dedicated Modem", "None"], description: "Kiểu kết nối RMM của trạm." },
  { id: "rmsConfigGeneral.dialInRings", label: "Dial-in rings", section: "RMS control", type: "number", min: 0, max: 20, step: 1, description: "Số hồi chuông trước khi modem trả lời." },
  { id: "rmsConfigGeneral.dialOutOnStatusChange", label: "Dial-out status", section: "RMS control", type: "select", options: ["Disabled", "Dial out to SELEX RSMS"], description: "Điều kiện gọi ra khi trạng thái trạm thay đổi." },
  { id: "rmsConfigGeneral.dialOutPhoneNumber", label: "Dial-out phone number", section: "RMS control", type: "text", description: "Số điện thoại gọi ra của RMM." },
  { id: "rmsConfigGeneral.toneDialOut", label: "Tone dial-out", section: "RMS control", type: "boolean", description: "Sử dụng quay số tone khi gọi ra." },
];

const digitalIoConfigFields: readonly DmeParameterFieldDefinition[] = [
  { id: "rmsConfigGeneral.smokeAlarmInstalled", label: "Smoke alarm", section: "Digital I/O configuration", type: "boolean", description: "Bật giám sát đầu vào Smoke Alarm." },
  { id: "rmsConfigGeneral.intrusionAlarmInstalled", label: "Intrusion alarm", section: "Digital I/O configuration", type: "boolean", description: "Bật giám sát đầu vào Intrusion Alarm." },
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `rmsConfigGeneral.spareInputs.${index}`,
    label: `Spare input ${index + 1} usage`,
    section: "Digital I/O configuration",
    type: "select" as const,
    options: ["Not Present", "Alarm", "Status", "Remote Reset"],
    description: `Cấu hình kênh Spare Input #${index + 1}.`,
  })),
];

const rmsLimitEnableFields: readonly DmeParameterFieldDefinition[] = [
  ...Array.from({ length: 15 }, (_, index) => ({
    id: `rmsVoltageData.${index}.enabled`,
    label: `RMS voltage limit ${index + 1} enabled`,
    section: "RMS limit enables",
    type: "boolean" as const,
    description: "Bật cảnh báo Maintenance Alert cho giới hạn điện áp tương ứng.",
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `rmsCurrentData.${index}.enabled`,
    label: `RMS current limit ${index + 1} enabled`,
    section: "RMS limit enables",
    type: "boolean" as const,
    description: "Bật cảnh báo Maintenance Alert cho giới hạn dòng điện tương ứng.",
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `rmsTemperatureData.${index}.enabled`,
    label: `RMS temperature limit ${index + 1} enabled`,
    section: "RMS limit enables",
    type: "boolean" as const,
    description: "Bật cảnh báo Maintenance Alert cho giới hạn nhiệt độ tương ứng.",
  })),
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `rmsAdData.${index}.enabled`,
    label: `RMS A/D limit ${index + 1} enabled`,
    section: "RMS limit enables",
    type: "boolean" as const,
    description: "Bật cảnh báo Maintenance Alert cho ngõ vào A/D tương ứng.",
  })),
];

const monitorRoutingFields: readonly DmeParameterFieldDefinition[] = Array.from({ length: 10 }, (_, index) =>
  (["primary", "secondary"] as const).map((role) => ({
    id: `monitorConfigGeneral.${index}.${role}`,
    label: `Monitor ${index + 1} ${role}`,
    section: "Monitor executive alarms",
    type: "boolean" as const,
    description: "Phân loại điều kiện monitor thành Primary hoặc Secondary Alarm.",
  })),
).flat();

const transmitterRtcFields: readonly DmeParameterFieldDefinition[] = [
  { id: "txConfigNominal.rtcParameters.powerOutput", label: "Power output", unit: "dB", min: -10, max: 5, step: 0.01, precision: 2 },
  { id: "txConfigNominal.rtcParameters.minimumSquitter", label: "Minimum squitter", unit: "ppps", min: 0, max: 6000, step: 1 },
  { id: "txConfigNominal.rtcParameters.maximumPrf", label: "Maximum PRF", unit: "ppps", min: 0, max: 10000, step: 1 },
  { id: "txConfigNominal.rtcParameters.ldesWindow", label: "LDES window", unit: "us", min: 0, max: 1000, step: 1 },
  { id: "txConfigNominal.rtcParameters.ldesThreshold", label: "LDES threshold", unit: "dBm", min: -120, max: 0, step: 1 },
  { id: "txConfigNominal.rtcParameters.deadTime", label: "Dead time", unit: "us", min: 0, max: 1000, step: 1 },
  { id: "txConfigNominal.rtcParameters.replyDelayOffset", label: "Reply delay offset", unit: "us", min: -100, max: 100, step: 0.01 },
  { id: "txConfigNominal.rtcParameters.rxSensitivity", label: "Rx sensitivity", unit: "dBm", min: -94, max: -72, step: 0.1 },
  { id: "txConfigNominal.rtcParameters.nominalPropagationDelay", label: "Nominal propagation delay", unit: "us", min: 0, max: 100, step: 0.01 },
  { id: "txConfigNominal.rtcParameters.maxPropagationVariance", label: "Max propagation variance", unit: "us", min: 0, max: 100, step: 0.01 },
  { id: "txConfigNominal.rtcParameters.standbyPropagationOffset", label: "Standby propagation offset", unit: "us", min: -100, max: 100, step: 0.01 },
].map((field) => ({
  ...field,
  section: "Transmitter RTC",
  type: "number" as const,
  description: `Tham số danh định ${field.label} của RTC transmitter.`,
}));

const transmitterOperationFields: readonly DmeParameterFieldDefinition[] = [
  { id: "txConfigNominal.operation.timing", label: "Timing reference", section: "Transmitter operation", type: "select", options: ["1st Pulse", "2nd Pulse"], description: "Xung tham chiếu dùng cho timing reply." },
  { id: "txConfigNominal.operation.squitterEnabled", label: "Squitter enabled", section: "Transmitter operation", type: "boolean", description: "Cho phép phát squitter." },
  { id: "txConfigNominal.operation.sdesEnabled", label: "SDES enabled", section: "Transmitter operation", type: "boolean", description: "Cho phép xử lý SDES." },
  { id: "txConfigNominal.operation.ldesEnabled", label: "LDES enabled", section: "Transmitter operation", type: "boolean", description: "Cho phép xử lý LDES." },
  { id: "txConfigNominal.operation.equalizationPulsesEnabled", label: "Equalization pulses", section: "Transmitter operation", type: "boolean", description: "Cho phép các xung cân bằng." },
  { id: "txConfigNominal.powerAmplifiers.lowOutputPowerAlertLimit", label: "Low output power alert", section: "Transmitter operation", type: "number", unit: "%", min: 0, max: 100, step: 1, description: "Ngưỡng cảnh báo công suất PA thấp." },
  { id: "txConfigNominal.powerAmplifiers.hpa1Enabled", label: "HPA 1 enabled", section: "Transmitter operation", type: "boolean", description: "Cho phép HPA 1 hoạt động." },
  { id: "txConfigNominal.powerAmplifiers.hpa2Enabled", label: "HPA 2 enabled", section: "Transmitter operation", type: "boolean", description: "Cho phép HPA 2 hoạt động." },
];

const transmitterIdentFields: readonly DmeParameterFieldDefinition[] = [
  { id: "txConfigNominal.ident.keyerIo", label: "Keyer I/O", section: "Transmitter ident", type: "select", options: ["Active High/Open", "Active Low/Ground"], description: "Kiểu logic của ngõ vào keyer ident." },
  { id: "txConfigNominal.ident.windowedKeying", label: "Windowed keying", section: "Transmitter ident", type: "boolean", description: "Giới hạn tín hiệu keying vào cửa sổ thời gian hợp lệ." },
  { id: "txConfigNominal.ident.keyerSource", label: "Ident keyer source", section: "Transmitter ident", type: "select", options: ["Internal Keying", "External Keying"], description: "Nguồn keying của tín hiệu ident." },
  { id: "txConfigNominal.ident.selfKeyOnLoss", label: "Self-key on loss", section: "Transmitter ident", type: "boolean", description: "Tự phát ident khi mất tín hiệu keying bên ngoài." },
  { id: "txConfigNominal.ident.shutdownOnLoss", label: "Shutdown on loss", section: "Transmitter ident", type: "boolean", description: "Tắt phát ident khi mất tín hiệu keying." },
  { id: "txConfigNominal.ident.restartWhenSignalResumes", label: "Restart when signal resumes", section: "Transmitter ident", type: "boolean", description: "Khởi động lại phát ident khi tín hiệu keying trở lại." },
  { id: "txConfigNominal.ident.primaryIdentCode", label: "Primary ident code", section: "Transmitter ident", type: "text", description: "Mã ident chính gồm 2 đến 4 ký tự." },
  { id: "txConfigNominal.ident.secondaryIdentEnabled", label: "Secondary ident enabled", section: "Transmitter ident", type: "boolean", description: "Cho phép sử dụng mã ident phụ." },
  { id: "txConfigNominal.ident.secondaryIdentCode", label: "Secondary ident code", section: "Transmitter ident", type: "text", description: "Mã ident phụ gồm 2 đến 4 ký tự." },
  { id: "txConfigNominal.ident.standbyIdent", label: "Standby ident", section: "Transmitter ident", type: "select", options: ["Same as Main Ident", "Secondary Ident", "Disabled"], description: "Chế độ ident của transmitter dự phòng." },
];

const transmitterOffsetFields: readonly DmeParameterFieldDefinition[] = [
  { id: "txOffsets.0.tx1", label: "TX1 power output scale", section: "Transmitter offsets", type: "number", unit: "%", min: 0, max: 200, step: 0.1, description: "Scale factor áp dụng cho công suất đỉnh đo bởi RTC của TX1." },
  { id: "txOffsets.0.tx2", label: "TX2 power output scale", section: "Transmitter offsets", type: "number", unit: "%", min: 0, max: 200, step: 0.1, description: "Scale factor áp dụng cho công suất đỉnh đo bởi RTC của TX2." },
  { id: "txOffsets.1.tx1", label: "TX1 Rx sensitivity offset", section: "Transmitter offsets", type: "number", unit: "dB", min: -20, max: 20, step: 0.1, description: "Offset hiệu chỉnh độ nhạy bộ thu của TX1." },
  { id: "txOffsets.1.tx2", label: "TX2 Rx sensitivity offset", section: "Transmitter offsets", type: "number", unit: "dB", min: -20, max: 20, step: 0.1, description: "Offset hiệu chỉnh độ nhạy bộ thu của TX2." },
  { id: "txOffsets.2.tx1", label: "TX1 base delay offset", section: "Transmitter offsets", type: "number", unit: "us", min: -100, max: 100, step: 0.01, description: "Offset trễ đường truyền cơ sở của TX1." },
  { id: "txOffsets.2.tx2", label: "TX2 base delay offset", section: "Transmitter offsets", type: "number", unit: "us", min: -100, max: 100, step: 0.01, description: "Offset trễ đường truyền cơ sở của TX2." },
];

const monitorOffsetSpecs = [
  { index: 0, label: "Delay Offset", unit: "us", min: -100, max: 100, step: 0.01 },
  { index: 1, label: "Spacing Offset", unit: "us", min: -100, max: 100, step: 0.01 },
  { index: 2, label: "Tx Power Scale", unit: "%", min: 0, max: 300, step: 0.1 },
  { index: 3, label: "Tx Power Offset", unit: "Watts", min: -5000, max: 5000, step: 1 },
  { index: 4, label: "Efficiency Offset", unit: "%", min: -100, max: 100, step: 0.1 },
  { index: 5, label: "PRF Offset", unit: "ppps", min: -6000, max: 6000, step: 1 },
  { index: 6, label: "Tx Frequency Offset", unit: "ppm", min: -1000, max: 1000, step: 1 },
  { index: 7, label: "Rx Frequency Offset", unit: "ppm", min: -1000, max: 1000, step: 1 },
  { index: 8, label: "ERP Offset", unit: "dB", min: -100, max: 100, step: 0.1 },
  { index: 9, label: "Return Loss Offset", unit: "dB", min: -100, max: 100, step: 0.1 },
] as const;

const monitorOffsetFields: readonly DmeParameterFieldDefinition[] = [1, 2].flatMap((monitorNumber) =>
  monitorOffsetSpecs.flatMap((spec) => (["integral", "standby"] as const).map((kind) => {
    const isNotApplicable = (
      (kind === "integral" && (spec.label === "Tx Power Scale" || spec.label === "Tx Power Offset"))
      || (kind === "standby" && (spec.label === "ERP Offset" || spec.label === "Return Loss Offset"))
    );
    return {
      id: "monitorOffsets.monitor" + monitorNumber + "." + spec.index + "." + kind,
      label: "Monitor " + monitorNumber + " " + kind + " " + spec.label,
      section: "Monitor offsets",
      type: "number" as const,
      unit: spec.unit,
      min: spec.min,
      max: spec.max,
      step: spec.step,
      readOnly: isNotApplicable,
      description: "Offset hiệu chỉnh " + spec.label + " cho " + kind + " data của Monitor " + monitorNumber + ".",
    };
  })),
);

const alarmLimitSpecs = [
  { index: 0, label: "Delay", unit: "us", limits: ["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] },
  { index: 1, label: "Spacing", unit: "us", limits: ["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] },
  { index: 2, label: "Tx power", unit: "W", limits: ["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] },
  { index: 3, label: "ERP", unit: "dB", limits: ["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] },
  { index: 4, label: "Efficiency", unit: "%", limits: ["alarmLow", "preAlarmLow", "nominal"] },
  { index: 5, label: "PRF", unit: "ppps", limits: ["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] },
  { index: 6, label: "Tx Frequency Error", unit: "ppm", limits: ["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] },
  { index: 7, label: "Rx Frequency Error", unit: "ppm", limits: ["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] },
  { index: 8, label: "VSWR", unit: ":1", limits: ["nominal", "preAlarmHigh", "alarmHigh"] },
] as const;

const limitLabels: Record<(typeof alarmLimitSpecs)[number]["limits"][number], string> = {
  alarmLow: "Alarm low",
  preAlarmLow: "Pre-alarm low",
  nominal: "Nominal",
  preAlarmHigh: "Pre-alarm high",
  alarmHigh: "Alarm high",
};

const alarmLimitFields: readonly DmeParameterFieldDefinition[] = alarmLimitSpecs.flatMap((parameter) =>
  parameter.limits.map((limit) => ({
    id: `alarmLimits.${parameter.index}.${limit}`,
    label: `${parameter.label} ${limitLabels[limit]}`,
    section: "Monitor alarm limits",
    type: "number" as const,
    unit: parameter.unit,
    step: parameter.label === "Tx power" || parameter.label === "PRF" ? 1 : 0.01,
    readOnly: limit === "nominal" && (parameter.label === "Delay" || parameter.label === "Spacing"),
    description: `Giới hạn ${limitLabels[limit].toLowerCase()} của ${parameter.label}.`,
  })),
);

const rawDmeParameterFieldCatalog: readonly DmeParameterFieldDefinition[] = [
  ...channelFields,
  ...stationFields,
  ...systemSelectionFields,
  ...monitorReadingFields,
  ...monitorControlFields,
  ...rmsControlFields,
  ...digitalIoConfigFields,
  ...rmsLimitEnableFields,
  ...monitorRoutingFields,
  ...transmitterRtcFields,
  ...transmitterOperationFields,
  ...transmitterIdentFields,
  ...transmitterOffsetFields,
  ...monitorOffsetFields,
  ...alarmLimitFields,
  ...systemFields,
];

type DmeDerivationRule = {
  matches: (fieldId: string) => boolean;
  metadata: DmeParameterDerivationMetadata;
};

/*
 * DME 1119A CONFIG -> MONITOR DERIVATION MAP
 *
 * The rules intentionally cover read-only fields as well as editable fields;
 * this makes the catalog auditable and allows tests to assert that every
 * control has an explicit destination. Formulas are training-model formulas
 * where the manual gives a physical relationship; otherwise the text states
 * that the field is control/status-only instead of implying a numeric effect.
 */
const dmeDerivationRules: readonly DmeDerivationRule[] = [
  {
    matches: (id) => id === "rmsConfigStation.channelType" || id === "rmsConfigStation.channelNumber" || id.startsWith("channelAllocation."),
    metadata: {
      affects: ["CONFIG Station", "Monitor Data Integral/Standby", "Monitor Test Results", "Decoder", "RTC Data", "Sidebar"],
      formula: "Table 9-5: INT/RX=1024+n; RX LO=899+n; TX=(961+n)/(1087+n) by X/Y band; spacing and 50/56 us delay by type.",
      alarmStatus: "Rebase channel nominal and Delay/Spacing offset limits; retain per-monitor calibration deltas.",
    },
  },
  {
    matches: (id) => id === "rmsConfigStation.powerLevel",
    metadata: {
      affects: ["Transmitter Data/PA", "Monitor Data Tx Power/ERP", "RTC Data", "Sidebar"],
      formula: "High Power target baseline 1000 W; Low Power target baseline 100 W, then apply RTC dB output and TX scale.",
      alarmStatus: "Re-evaluate Output Power/PA low-output threshold and ERP calibration.",
    },
  },
  {
    matches: (id) => id === "rmsConfigStation.transmitterConfig" || id === "rmsConfigStation.monitorConfig" || id === "rmsConfigStation.hotStandby",
    metadata: {
      affects: ["Sidebar routing", "Monitor Normal/Pri/Sec", "Transmitter Data", "RTC Data traffic and standby rows"],
      formula: "Single/dual equipment gates availability; dual hot-standby keeps the non-main TX on Load.",
      alarmStatus: "Unavailable TX/monitor rows become gray; automatic transfer is available only for dual equipment.",
    },
  },
  {
    matches: (id) => id === "rmsConfigStation.stationDescription",
    metadata: {
      affects: ["RMS Station Configuration", "Title/sidebar station context"],
      formula: "Display text only.",
      alarmStatus: "No monitor numeric effect; remains visible in RMS/status context.",
      controlOnly: true,
    },
  },
  {
    matches: (id) => id.startsWith("monitorTransmitterStatus.transmitterOn.") || id === "monitorTransmitterStatus.mainSelect" || id === "monitorTransmitterStatus.antennaSelect",
    metadata: {
      affects: ["Sidebar transmitter Main/Antenna/Load/Off", "Integral/Standby monitor columns", "RTC traffic"],
      formula: "Selected antenna TX is Integral; the other dual TX is Standby/Load; Off removes replies and monitor traffic.",
      alarmStatus: "Routing/availability and TX-enabled maintenance status are recomputed.",
    },
  },
  {
    matches: (id) => id.startsWith("monitorTransmitterStatus.enabledMonitors."),
    metadata: {
      affects: ["Monitor Normal/Pri/Sec/Bypass", "Monitor Data columns"],
      formula: "Disabled monitor is excluded from voting and shown unavailable.",
      alarmStatus: "No numeric value is fabricated; disabled monitor rows are gray and maintenance alert remains observable.",
    },
  },
  {
    matches: (id) => id.startsWith("sidebarParams."),
    metadata: {
      affects: ["Sidebar"],
      formula: "Read-only projection of Monitor 1 Integral rows.",
      alarmStatus: "Mirrors the derived Monitor 1 row status.",
      controlOnly: true,
    },
  },
  {
    matches: (id) => id.startsWith("monitorTimers."),
    metadata: {
      affects: ["Monitor status/timers", "RMS Maintenance Alert timing"],
      formula: "Control timer only; no monitor measurement arithmetic.",
      alarmStatus: "Updates timeout/status presentation when a timer is used.",
      controlOnly: true,
    },
  },
  {
    matches: (id) => id === "monitorSystemSettings.efficiencyCertificationLevel",
    metadata: {
      affects: ["Decoder Test Results", "Monitor Efficiency status"],
      formula: "Positive decoder efficiency lower limit equals configured certification level.",
      alarmStatus: "Decoder result/status is warning when data falls below this limit.",
    },
  },
  {
    matches: (id) => id === "monitorSystemSettings.monitor1ReplyAttenuation" || id === "monitorSystemSettings.monitor2ReplyAttenuation" || id === "monitorSystemSettings.directionalCouplerLoss",
    metadata: {
      affects: ["Monitor 1/2 ERP", "Monitor offsets/calibration", "Sidebar ERP"],
      formula: "ERP calibration = measured reply level - Reply Attenuation + Directional Coupler Loss (relative to calibrated baseline).",
      alarmStatus: "ERP limits are re-evaluated independently for Monitor 1 and Monitor 2.",
    },
  },
  {
    matches: (id) => id.startsWith("rmsConfigGeneral.monitorIntegrityTestsEnabled") || id.startsWith("monitorConfigGeneral."),
    metadata: {
      affects: ["Monitor Normal/Pri/Sec", "RMS Alert", "LCU transfer/voting"],
      formula: "Primary/Secondary classification follows Monitor Configuration; AND requires all enabled monitors, OR accepts any monitor.",
      alarmStatus: "Integrity failure is an alarm when enabled, otherwise a yellow integrity alert (not silently suppressed).",
    },
  },
  {
    matches: (id) => id === "rmsConfigGeneral.votingLogic" || id === "rmsConfigGeneral.transfer",
    metadata: {
      affects: ["Monitor Normal/Pri/Sec", "RMS station Alert", "Automatic TX transfer"],
      formula: "Voting uses configured AND/OR; transfer follows on Primary Alarm/on Secondary Alarm/Best Availability.",
      alarmStatus: "Primary/secondary alarm drives the configured transfer rule.",
    },
  },
  {
    matches: (id) => id.startsWith("txConfigNominal.rtcParameters.powerOutput"),
    metadata: {
      affects: ["RTC/Transmitter Data output", "Monitor Tx Power/ERP", "PA status", "RTC status", "Sidebar"],
      formula: "Target watts = calibrated station baseline × 10^((Power Output - reference dB)/10) × TX scale; actual output is reduced by disabled PA.",
      alarmStatus: "Below target −2% raises Output Power/PA alert; PA disable never remains green.",
    },
  },
  {
    matches: (id) => id === "txConfigNominal.rtcParameters.minimumSquitter" || id === "txConfigNominal.rtcParameters.maximumPrf",
    metadata: {
      affects: ["RTC PRF", "Traffic Load bands/Total Replies/Monitor Replies", "RTC overload"],
      formula: "PRF scales from Minimum Squitter and clamps at min(Maximum PRF, 5500 ppps); gain reduction starts at 90% capacity and targets 95%.",
      alarmStatus: "PRF limits and deterministic overload/gain-reduction status are recomputed.",
    },
  },
  {
    matches: (id) => id === "txConfigNominal.rtcParameters.deadTime",
    metadata: {
      affects: ["RTC PRF capacity", "Decoded/reply traffic", "Transponder test"],
      formula: "Reply capacity is bounded by 1,000,000/dead-time and the 5500 ppps hardware ceiling.",
      alarmStatus: "Capacity reduction is reflected in PRF/traffic and overload status.",
    },
  },
  {
    matches: (id) => id === "txConfigNominal.rtcParameters.replyDelayOffset",
    metadata: {
      affects: ["Monitor Delay", "RTC Delay Control", "Monitor alarms", "LCU transfer"],
      formula: "Measured Delay = channel nominal + Reply Delay Offset + TX Base Offset + monitor Delay Offset.",
      alarmStatus: "+0.45 us crosses the default +0.40 us Delay alarm and requests transfer per §6.2.8.",
    },
  },
  {
    matches: (id) => id === "txConfigNominal.rtcParameters.rxSensitivity",
    metadata: {
      affects: ["Decoder Test Receiver Sensitivity", "Decoder status"],
      formula: "Receiver sensitivity data follows the configured RTC Rx Sensitivity.",
      alarmStatus: "Decoder is out of tolerance outside the manual ±3 dB receiver-sensitivity band.",
    },
  },
  {
    matches: (id) => id === "txConfigNominal.rtcParameters.nominalPropagationDelay" || id === "txConfigNominal.rtcParameters.maxPropagationVariance" || id === "txConfigNominal.rtcParameters.standbyPropagationOffset",
    metadata: {
      affects: ["RTC Data Prop Delay low/current/high", "Monitor Delay", "Tx2 standby alignment"],
      formula: "RTC1 = nominal + TX1 base; RTC2 = nominal + standby offset + TX2 base; low/high = current nominal ± max variance.",
      alarmStatus: "Delay monitor status uses the channel nominal and configured offset limits.",
    },
  },
  {
    matches: (id) => id === "txConfigNominal.rtcParameters.ldesWindow" || id === "txConfigNominal.rtcParameters.ldesThreshold" || id === "txConfigNominal.operation.ldesEnabled" || id === "txConfigNominal.operation.sdesEnabled",
    metadata: {
      affects: ["RTC Traffic Load", "LDES trigger diagnostics", "Decoder/monitor alert state"],
      formula: "Manual: LDES Window=SRE×12.36 us/NMI+10 us; Threshold=−0.385 dBm/NMI×FUD−20 dBm. PMDT has no SRE/FUD inputs, so configured values are the deterministic training-model source (assumption documented in derived-data.ts).",
      alarmStatus: "Echo suppression lowers reply/traffic deterministically and exposes LDES trigger rate when enabled.",
    },
  },
  {
    matches: (id) => id === "txConfigNominal.operation.timing" || id === "txConfigNominal.operation.squitterEnabled" || id === "txConfigNominal.operation.equalizationPulsesEnabled",
    metadata: {
      affects: ["RTC timing/traffic", "Monitor/decoder test labels"],
      formula: "Timing selects the measured pulse reference; squitter/equalization gates deterministic traffic generation.",
      alarmStatus: "Timing/control alerts are reflected in maintenance/status screens; no unexplained random values.",
    },
  },
  {
    matches: (id) => id === "txConfigNominal.powerAmplifiers.lowOutputPowerAlertLimit" || id.startsWith("txConfigNominal.powerAmplifiers.hpa"),
    metadata: {
      affects: ["PA output/status", "Monitor Tx Power", "RTC status", "Station Alert"],
      formula: "PA output status compares actual/target percentage (≤ limit is alert, including the manual's 100% alignment check); disabled HPA reduces only its transmitter factor.",
      alarmStatus: "Disabled/under-power PA is red and contributes a per-transmitter maintenance/station alert.",
    },
  },
  {
    matches: (id) => id.startsWith("txConfigNominal.ident.") || id === "identMode",
    metadata: {
      affects: ["Ident Code/Ident Status", "RTC maintenance alerts", "Station Alert"],
      formula: "Primary/secondary/standby ident selection follows Table 3-11; command mode and keyer source/windowing drive status text. The training model has no external key-contact input, so External Keying without Self-Key on Loss is a deterministic warning and Shutdown on Loss is an alarm.",
      alarmStatus: "Off/continuous/keyer-loss conditions are surfaced as ident status/maintenance alerts.",
    },
  },
  {
    matches: (id) => id.startsWith("txOffsets.0."),
    metadata: {
      affects: ["TX1 or TX2 RTC target/output (selected field only)", "Integral/Standby Tx Power", "Active-TX ERP/VSWR path", "PA/RTC status"],
      formula: "Table 3-12: peak target(TXn) = common Nominal Power Output target × (TXn Power Output Scale / factory TXn scale); monitor Tx Power then applies that monitor's Tx Power Scale/Offset. TX1 and TX2 never share this scale.",
      alarmStatus: "Output/PA and monitor limits are evaluated for the affected transmitter; changing TX1 cannot raise, clear, or alter TX2 status. ERP follows the active TX power path; VSWR remains a ratio and is clamped ≥1.",
    },
  },
  {
    matches: (id) => id.startsWith("txOffsets.1."),
    metadata: {
      affects: ["Decoder Test Receiver Sensitivity per TX/monitor", "Decoder status"],
      formula: "Table 3-12 Rx Sensitivity Offset adds dB to the selected transmitter RTC sensitivity.",
      alarmStatus: "Decoder sensitivity is shown against the configured ±3 dB limits and is In Process outside the usable −94..−72 dBm range.",
    },
  },
  {
    matches: (id) => id.startsWith("txOffsets.2."),
    metadata: {
      affects: ["Monitor Delay", "RTC Prop Delay", "Tx2 standby alignment"],
      formula: "Base Offset adds microseconds to the corresponding transmitter timing path.",
      alarmStatus: "Delay limits and transfer logic are re-evaluated for the affected TX.",
    },
  },
  {
    matches: (id) => id.startsWith("monitorOffsets."),
    metadata: {
      affects: ["Monitor Integral/Standby rows", "Monitor calibration", "Sidebar", "Alarm status"],
      formula: "Per-monitor offsets/scales are applied independently to Delay, Spacing, Tx Power, Efficiency, PRF, frequency ppm, ERP and Return Loss; VSWR=max(1, conversion(Return Loss)).",
      alarmStatus: "Each monitor column is classified against the configured limits after calibration.",
    },
  },
  {
    matches: (id) => id.startsWith("alarmLimits."),
    metadata: {
      affects: ["Monitor Data limits/status", "Alarm Limits Integrity Results", "RMS Alert/transfer"],
      formula: "Delay/Spacing alarm values are nominal plus configured offsets; integrity targets use the four §3.6.9.2.1 formulas.",
      alarmStatus: "Low/Pre/High thresholds are recomputed for every monitor measurement.",
    },
  },
  {
    matches: (id) => id.startsWith("rmsConfigGeneral.") || id.startsWith("rmsVoltageData.") || id.startsWith("rmsCurrentData.") || id.startsWith("rmsTemperatureData.") || id.startsWith("rmsAdData."),
    metadata: {
      affects: ["RMS Configuration/Status", "Digital I/O or Maintenance Alert"],
      formula: "Control/configuration value only unless it enables its corresponding RMS limit/input row.",
      alarmStatus: "Updates RMS status/alert presentation; no RF monitor numeric effect.",
      controlOnly: true,
    },
  },
  {
    matches: (id) => id.startsWith("securityAccounts.") || id === "connected" || id === "local" || id === "alert" || id === "timestamp",
    metadata: {
      affects: ["Login/security", "RMS status", "PMDT clock/connection"],
      formula: "Control-only/session value; timestamp is refreshed in real time and never marks configDirty.",
      alarmStatus: "Updates the appropriate status screen; no RF monitor numeric effect.",
      controlOnly: true,
    },
  },
];

function metadataForDmeField(field: DmeParameterFieldDefinition): DmeParameterDerivationMetadata {
  const rule = dmeDerivationRules.find((candidate) => candidate.matches(field.id));
  return rule?.metadata ?? {
    affects: [field.section],
    formula: "Control/status presentation only; no undocumented monitor numeric effect.",
    alarmStatus: "Updates the owning configuration/status screen.",
    controlOnly: true,
  };
}

export const dmeParameterFieldCatalog: readonly DmeParameterFieldDefinition[] = rawDmeParameterFieldCatalog.map((field) => ({
  ...field,
  derivation: field.derivation ?? metadataForDmeField(field),
}));

/** A flat mapping table useful to reviewers and focused derivation tests. */
export const dmeConfigDerivationMap = dmeParameterFieldCatalog.map((field) => ({
  fieldId: field.id,
  label: field.label,
  ...(field.derivation as DmeParameterDerivationMetadata),
}));

const channelAllocationPrefix = "channelAllocation.";

function formatAssignedValue(value: number, precision: number): string {
  return precision === 3 ? formatDmeFrequency(value) : value.toFixed(precision);
}

function shiftDisplayedMeasurement(
  value: string,
  previousNominal: number | null,
  nextNominal: number,
  precision: number,
): string {
  const parsed = Number(value);
  const shifted = previousNominal !== null && Number.isFinite(parsed)
    ? nextNominal + (parsed - previousNominal)
    : nextNominal;
  return formatAssignedValue(shifted, precision);
}

function shiftNumericMeasurement(
  value: number,
  previousNominal: number | null,
  nextNominal: number,
  precision = 2,
): number {
  const shifted = previousNominal === null ? nextNominal : nextNominal + (value - previousNominal);
  return Number(shifted.toFixed(precision));
}

function synchronizeDmeChannelData(
  data: DmePmdtData,
  previous: DmeChannelAllocation | null,
  next: DmeChannelAllocation,
): DmePmdtData {
  if (previous && data.rmsConfigStation.stationDescription === `VIETNAM TUY HOA ${previous.channelLabel}`) {
    data.rmsConfigStation.stationDescription = `VIETNAM TUY HOA ${next.channelLabel}`;
  }

  const updateMonitorRows = (rows: DmePmdtData["integralData"]) => rows.map((row) => {
    const assignments: Record<string, { previous: number | null; next: number; precision: number }> = {
      Delay: { previous: previous?.nominalReplyDelayUs ?? null, next: next.nominalReplyDelayUs, precision: 2 },
      Spacing: { previous: previous?.transmitterReplyPulseSpacingUs ?? null, next: next.transmitterReplyPulseSpacingUs, precision: 2 },
      "Tx Frequency": { previous: previous?.transmitterReplyFrequencyMHz ?? null, next: next.transmitterReplyFrequencyMHz, precision: 3 },
      "Rx LO Frequency": { previous: previous?.receiverLoFrequencyMHz ?? null, next: next.receiverLoFrequencyMHz, precision: 3 },
      "Rx Frequency": { previous: previous?.receiverFrequencyMHz ?? null, next: next.receiverFrequencyMHz, precision: 3 },
    };
    const assignment = assignments[row.label];
    if (!assignment) return row;
    return {
      ...row,
      mon1Value: shiftDisplayedMeasurement(row.mon1Value, assignment.previous, assignment.next, assignment.precision),
      mon2Value: shiftDisplayedMeasurement(row.mon2Value, assignment.previous, assignment.next, assignment.precision),
    };
  });

  const updateCalibrationRows = (rows: DmePmdtData["monitorCalibrationData"]["monitor1"]) => rows.map((row) => {
    const nextBaseline = row.parameter === "Delay"
      ? next.nominalReplyDelayUs
      : row.parameter === "Spacing"
        ? next.transmitterReplyPulseSpacingUs
        : null;
    if (nextBaseline === null) return row;
    return {
      ...row,
      actual: Number((nextBaseline + (row.actual - row.baseline)).toFixed(2)),
      baseline: nextBaseline,
    };
  });

  const decoderSpacingShift = previous
    ? next.interrogatorPulseSpacingUs - previous.interrogatorPulseSpacingUs
    : 0;
  const updateDecoderRows = (rows: DmePmdtData["decoderResults"]["monitor1"]) => rows.map((row) => {
    const parameter = row.parameter
      .replace(
        /^Receiver Sensitivity @ \d+(?:\.\d+)? us/,
        `Receiver Sensitivity @ ${next.interrogatorPulseSpacingUs.toFixed(1)} us`,
      )
      .replace(/^Spacing (\d+(?:\.\d+)?)/, (_, spacing: string) => (
        decoderSpacingShift === 0
          ? `Spacing ${spacing}`
          : `Spacing ${(Number(spacing) + decoderSpacingShift).toFixed(1)}`
      ));
    return { ...row, parameter };
  });

  data.sidebarParams.delay.value = shiftNumericMeasurement(
    data.sidebarParams.delay.value,
    previous?.nominalReplyDelayUs ?? null,
    next.nominalReplyDelayUs,
  );
  data.sidebarParams.spacing.value = shiftNumericMeasurement(
    data.sidebarParams.spacing.value,
    previous?.transmitterReplyPulseSpacingUs ?? null,
    next.transmitterReplyPulseSpacingUs,
  );
  data.integralData = updateMonitorRows(data.integralData);
  data.standbyData = updateMonitorRows(data.standbyData);
  data.monitorDetailData = {
    monitor1: updateMonitorRows(data.monitorDetailData.monitor1),
    monitor2: updateMonitorRows(data.monitorDetailData.monitor2),
  };
  data.monitorCalibrationData = {
    monitor1: updateCalibrationRows(data.monitorCalibrationData.monitor1),
    monitor2: updateCalibrationRows(data.monitorCalibrationData.monitor2),
  };
  data.decoderResults = {
    monitor1: updateDecoderRows(data.decoderResults.monitor1),
    monitor2: updateDecoderRows(data.decoderResults.monitor2),
  };
  data.alarmLimits = data.alarmLimits.map((row) => {
    if (row.parameter === "Delay") return { ...row, nominal: next.nominalReplyDelayUs };
    if (row.parameter === "Spacing") return { ...row, nominal: next.transmitterReplyPulseSpacingUs };
    return row;
  });

  return data;
}

export function getDmeParameterValue(data: DmePmdtData, fieldId: string): DmeParameterValue {
  if (fieldId.startsWith(channelAllocationPrefix)) {
    const allocation = getDmeStationChannelAllocation(data.rmsConfigStation);
    if (!allocation) return null;
    const key = fieldId.slice(channelAllocationPrefix.length);
    const value = (allocation as unknown as Record<string, unknown>)[key];
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? value
      : null;
  }

  let current: unknown = data;
  for (const part of fieldId.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) return null;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" || typeof current === "number" || typeof current === "boolean" || current === null
    ? current
    : null;
}

export function setDmeParameterValue(
  data: DmePmdtData,
  fieldId: string,
  value: DmeParameterValue,
): DmePmdtData {
  if (fieldId.startsWith(channelAllocationPrefix)) return data;
  // Read-only projections (including channel-derived Delay/Spacing nominal
  // values) must remain derived values even when a caller bypasses the form.
  if (dmeParameterFieldCatalog.find((field) => field.id === fieldId)?.readOnly) {
    return recomputeDmeDerivedData(data);
  }

  const previousAllocation = getDmeStationChannelAllocation(data.rmsConfigStation);
  const next = structuredClone(data) as unknown as Record<string, unknown>;
  const parts = fieldId.split(".");
  let cursor = next;
  for (const part of parts.slice(0, -1)) {
    const child = cursor[part];
    if (!child || typeof child !== "object") cursor[part] = {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts.at(-1) ?? fieldId] = value;
  const nextData = next as unknown as DmePmdtData;

  if (fieldId === "alert") {
    nextData.manualAlertOverride = Boolean(value);
  }

  if (fieldId === "rmsConfigStation.channelNumber" || fieldId === "rmsConfigStation.channelType") {
    const nextAllocation = getDmeStationChannelAllocation(nextData.rmsConfigStation);
    if (nextAllocation) return recomputeDmeDerivedData(synchronizeDmeChannelData(nextData, previousAllocation, nextAllocation));
  }

  return recomputeDmeDerivedData(nextData);
}

export function parseDmeParameterInput(
  field: DmeParameterFieldDefinition,
  rawValue: string | boolean,
): DmeParameterValue {
  if (field.type === "boolean") return typeof rawValue === "boolean" ? rawValue : rawValue === "true";
  if (field.type === "number") {
    const value = Number(rawValue);
    return Number.isFinite(value) ? value : null;
  }
  return String(rawValue);
}

export function validateDmeParameterField(
  field: DmeParameterFieldDefinition,
  value: DmeParameterValue,
): string | null {
  if (field.type === "boolean" && typeof value !== "boolean") return "Giá trị phải là true hoặc false.";
  if (field.type === "text" && typeof value !== "string") return "Giá trị phải là chuỗi ký tự.";
  if (field.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Giá trị phải là số hữu hạn.";
    if (field.id === "rmsConfigStation.channelNumber" && !Number.isInteger(value)) {
      return "Channel number phải là số nguyên từ 1 đến 126.";
    }
    if (field.min !== undefined && value < field.min) return `Giá trị tối thiểu là ${field.min}.`;
    if (field.max !== undefined && value > field.max) return `Giá trị tối đa là ${field.max}.`;
  }
  if (field.type === "text" && field.id.endsWith("IdentCode") && !/^[A-Za-z0-9]{2,4}$/.test(String(value).trim())) {
    return "Ident code phải có 2 đến 4 ký tự chữ/số.";
  }
  if (field.type === "select" && (!field.options || !field.options.includes(String(value)))) {
    return "Giá trị lựa chọn không hợp lệ.";
  }
  return null;
}
