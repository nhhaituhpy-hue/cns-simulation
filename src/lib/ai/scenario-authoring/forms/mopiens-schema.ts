import type { JsonValue, ValueSchema } from "../types";
import { inferValueSchema } from "./helpers";
export type MopiensModule = "dvor-220" | "dme-320";
export const protectedMopiensPath = (id: string) => /^configuration\.system\.(allowSimultaneousLogin|allowGuestAccess|automaticLogoutMinutes|settingsOnlyWhenMonitorBypassed|settingsOnlyAtLocal|modifyOnlyWhenBypassed|modifyOnlyAtLocal)$/.test(id);
const dvorUnits: Record<string, string> = { bearingError: "°", fmIndex: "", am30Hz: "%", am9960Hz: "%", ident1020Hz: "%", rfLevel: "dB", distortion9960Hz: "%", carrierFrequency: "MHz", subcarrierFrequency: "Hz" };
export { dvorUnits };
export function mopiensSection(id: string): string {
  if (id.startsWith("successCriteria.")) return "success-criteria";
  if (id === "runtime.faults" || id.startsWith("configuration.system.shutdown") || /FaultShutdownDelayMs$/.test(id)) return "faults";
  if (id === "runtime.measurementOverrides") return "raw";
  if (/^configuration\.(monitor|transmitterLimits)\./.test(id)) return "monitors";
  if (/^configuration\.(thermal|battery|optionalUnits|environment)\./.test(id) || /^runtime\.(acAvailable|battery|batteries|temperaturesC|environment|antennaVswr)/.test(id)) return "plant";
  if (/^configuration\.transmitters\./.test(id) || /^runtime\.spacingOffsetsUs\./.test(id)) return "rf";
  if (id.startsWith("configuration.station.") && !/(stationName|runwayDesignator|equipmentVersion|standbyMode|OnBoot)$/.test(id)) return "rf";
  return "initial";
}
export function mopiensScalarSchema(moduleId: MopiensModule, path: string, value: JsonValue): ValueSchema {
  const key = path.split(".").at(-1)!;
  const label = path.split(".").slice(1).join(" / ").replace(/([a-z])([A-Z])/g, "$1 $2");
  const help = `Trường native ${moduleId}: ${path}. Giữ đơn vị của simulator; kiểm tra quan hệ ngưỡng ở bước xác nhận.`;
  const schema = { ...inferValueSchema(value, label, help), required: true };
  const friendly: Record<string, string> = {
    startMonitorBypassed:"Bắt đầu với giám sát bị bỏ qua (Monitor Bypass)",
    requireServiceNormal:"Trạng thái phục vụ trở về bình thường",
    requireEnabledMonitorChannelsNormal:"Các kênh giám sát đang bật đều bình thường",
    requireMonitorChannelsNormal:"Các kênh giám sát đều bình thường",
    requireNoPrimaryAlarm:"Không còn báo động chính (Primary Alarm)",
    requireNoActiveFaults:"Không còn lỗi đang hoạt động",
    mainTransmitterId:"Máy phát chính khi bắt đầu", mainTransponder:"Máy phát đáp chính khi bắt đầu",
    acAvailable:"Có nguồn điện xoay chiều (AC)", batteryRemainingMinutes:"Thời gian nguồn pin còn lại",
    stationName:"Tên trạm", standbyMode:"Chế độ dự phòng", identCode:"Mã nhận dạng (IDENT)",
  };
  if(friendly[key]) schema.label = friendly[key];
  if(path.startsWith("successCriteria.")) schema.help = `${schema.label}: bật nếu học viên phải đạt điều kiện này khi kết thúc. Không tự cấp quyền sửa và không phải bằng chứng đã khôi phục.`;
  if(key === "startMonitorBypassed") schema.help = "Bật để MON1/MON2 bắt đầu ở Bypass, cho học viên thời gian chẩn đoán. Mặc định lấy nguyên từ thiết bị; không tự xem Bypass là trạng thái bình thường hoặc quyền sửa.";
  if(key === "mainTransmitterId" || key === "mainTransponder") schema.help = "Chọn TX1 hoặc TX2 làm đường phát chính lúc bắt đầu bài; kết quả mong đợi được đặt riêng ở Điều kiện đạt.";
  const select = (values: readonly string[]) => Object.assign(schema, { type: "select", options: values.map(value => ({ value, label: value })) });
  const range = (min: number, max: number, unit?: string, step?: number) => Object.assign(schema, { min, max, ...(unit !== undefined ? { unit } : {}), ...(step !== undefined ? { step } : {}) });
  const common: Record<string, readonly string[]> = {
    standbyMode: ["hot", "cold"], identSync: ["pulse", "code"], fanMode: ["auto", "on", "off"], votingLogic: ["AND", "OR"], severity: ["primary", "secondary"], classification: ["primary", "secondary"], dcdcAlarmSeverity: ["primary", "secondary"], identCodeAlarmSeverity: ["primary", "secondary"], mainTransmitterId: ["tx1", "tx2"], mainTransponder: ["tx1", "tx2"], equipmentVersion: ["single", "dual"], autoDelayCalibration: ["always", "never"], suffix: ["X", "Y"], identWhenMonitorBypassed: ["remove", "itst", "no-change"],
  };
  if (common[key]) select(common[key]);
  if (key === "identKeyer") select(moduleId === "dvor-220" ? ["independent", "associated-master", "associated-slave", "none", "continuous"] : ["none", "independent", "master", "slave", "continuous"]);
  if (key === "playbackSource") select(["mon1", "mon2", "standby", "tx1", "tx2", "on-antenna", "none"]);
  if (key === "identSound") select(["MON1", "MON2", "STB MON", "TX1", "TX2", "ON ANTENNA", "OFF"]);
  if (key === "rcuLineType") select(moduleId === "dvor-220" ? ["ethernet", "modem", "rs232"] : ["Ethernet", "Modem", "RS-232"]);
  if (/scu[12]RemoteType$/.test(key)) select(["RS-232", "Leased Line", "Dialup"]);
  if (key === "type" && path.includes("scuRemote")) select(["rs232", "leased-line", "dial-up"]);
  if (key === "type" && path.includes("monitor.channels")) select(["FFM", "NFM", "disabled"]);
  if (key === "pmdtRs232BaudRate") schema.help += " Lựa chọn PMDT native: 9600, 19200, 38400, 57600, 115200 baud.";
  if (key === "stationName") schema.maxLength = 31;
  if (key === "runwayDesignator") { schema.maxLength = 3; schema.required = false; }
  if (key === "identCode") { schema.maxLength = 4; schema.required = moduleId === "dvor-220"; }
  if (key === "unit") { schema.readOnly = true; schema.required = false; schema.help = "Nhãn đơn vị native, chỉ đọc; không chuyển đổi hoặc sửa số đo engine."; }
  if (typeof value === "number" || value === null) {
    if (/Ms$/.test(key)) schema.unit = "ms";
    if (/Minutes$/.test(key)) schema.unit = "min";
    if (/Percent$|Pct$/.test(key)) schema.unit = "%";
    if (/Us$/.test(key) || path.includes("spacingOffsetsUs")) schema.unit = "µs";
    if (/Dbm$/.test(key)) schema.unit = "dBm";
    if (/Db$/.test(key) || path.includes("rfGainDb")) schema.unit = "dB";
    if (/W$|Watts$/.test(key) || path.includes("sidebandPowerW")) schema.unit = "W";
    if (/Deg$/.test(key) || /rfPhaseDeg|standbyRfPhaseDeg/.test(path)) schema.unit = "°";
    if (/C$/.test(key) || /temperaturesC|shutdownC|restartC/.test(path)) schema.unit = "°C";
    if (/VoltageV$|Voltage$|^voltage$/.test(key)) schema.unit = "V";
    if (/CurrentA$|CurrentLimitA$/.test(key)) schema.unit = "A";
    if (/VoltsPerHour$/.test(key)) schema.unit = "V/h";
    if (key === "minimumPulseRatePps") range(0, 2700, "pps", 1);
    if (key === "frequencyMHz") range(108, 117.95, "MHz", 0.05);
    if (key === "carrierPowerW") range(0, 150, "W");
    if (key === "powerOutputWatts") range(0, 1250, "W");
    if (/^(carrierScalePercent|outputPowerPercent)$/.test(key)) range(0, 100, "%");
    if (path.includes("sidebandPowerW")) range(0, 5, "W");
    if (/^(am30HzPercent|voiceModulationPercent)$/.test(key)) range(0, 40, "%");
    if (key === "identModulationPercent") range(0, 20, "%");
    if (/^(azimuthOffsetDeg|referenceAzimuthDeg)$/.test(key)) range(-40, 40, "°");
    if (/rfPhaseDeg|standbyRfPhaseDeg/.test(path)) range(0, 359.9, "°");
    if (/configuration\.thermal/.test(path) || path.includes("runtime.temperaturesC")) range(-100, 200, "°C");
    if (path === "runtime.environment.temperatureC") range(moduleId === "dvor-220" ? -50 : -100, moduleId === "dvor-220" ? 100 : 200, "°C");
    if (/^(executiveAlarmDelayMs|monitorActionDelayMs)$/.test(key)) range(200, 51000, "ms");
    if (/^(postChangeoverHoldoffMs|powerOnHoldoffMs|identCodeAlarmDelayMs|identFaultDelayMs|selfTestHoldoffMs)$/.test(key)) range(0, 100000, "ms");
    if (/FaultShutdownDelayMs$|^alarmDelayMs$/.test(key)) range(0, 30000, "ms");
    if (key === "measurementAverageCount") range(2, 10, "samples", 1);
    if (key === "warningRangePercent") range(0, 100, "%");
    if (/^(remoteConnectionLimit|localConnectionLimit)$/.test(key)) range(0, 16, undefined, 1);
    if (/BaudRate$|^baudRate$/.test(key) && moduleId === "dme-320") range(2400, 230400, "baud", 1);
    if (/^vswrUpper/.test(key)) range(1, 10, ":1");
    if (/^cutoffVoltage/.test(key)) range(19, 24, "V");
    if (/^chargingCurrent/.test(key)) range(10, 30, "A");
    if (path === "runtime.batteryRemainingMinutes") range(0, 1440, "min");
    if (moduleId === "dme-320") {
      if (path === "configuration.station.channel.number") range(1, 126, undefined, 1);
      if (key === "delayOffsetUs") range(-15, 35, "µs");
      if (key === "sensitivityDbm") range(-95, -60, "dBm");
      if (key === "sdesDurationUs") range(0, 34, "µs");
      if (key === "ldesDurationUs") range(0, 350, "µs");
      if (key === "ldesThresholdDbm") range(-110, 9, "dBm");
      if (key === "deadTimeUs") range(0, 150, "µs");
      if (/^(warningVoltage|alarmVoltage|voltage)$/.test(key)) range(0, 30, "V");
      if (key === "fullyChargedVoltage") range(24, 30, "V");
      if (/configuration\.battery\..*TemperatureC|runtime\.batteries\..*\.temperatureC/.test(path)) range(-128, 127, "°C");
      if (/VoltsPerHour$/.test(key)) range(0, 10, "V/h");
    }
    if (/\.(lowerAlarm|lowerWarning|upperWarning|upperAlarm|alarmLow|warningLow|warningHigh|alarmHigh)$/.test(path)) schema.nullable = true;
    const parameter = path.split(".limits.")[1]?.split(".")[0];
    if (moduleId === "dvor-220" && parameter && key !== "severity") schema.unit = dvorUnits[parameter];
  }
  if (moduleId === "dvor-220" && /\.(lowerAlarm|lowerWarning|upperWarning|upperAlarm)$/.test(path)) {
    // The native import parser compares against factory types, including null.
    // Do not offer a control conversion that native persistence cannot retain.
    schema.nullable = value === null;
    if(value === null) schema.readOnly = true;
    schema.help += value === null ? " Parser import native chỉ chấp nhận null ở ngưỡng này; chỉ đọc, không tự tạo ngưỡng số." : " Parser import native yêu cầu số ở ngưỡng này; không thể chuyển thành null.";
  }
  if (Array.isArray(value) && typeof value[0] === "boolean") schema.item = { type: "boolean", label: "Kênh vào/ra", help: "Bật/tắt kênh native theo đúng số lượng phần cứng.", required: true, initial: false };
  return schema;
}
