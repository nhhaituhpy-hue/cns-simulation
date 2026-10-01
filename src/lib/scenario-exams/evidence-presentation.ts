import { dvorConfigFieldCatalog } from "@/lib/dvor1150a/config-utils";
import { dvor1150ConfigFieldCatalog } from "@/lib/dvor1150/config-utils";
import { dmeParameterFieldCatalog } from "@/lib/dme1119a/config";
import type { ScenarioActionEvent, ScenarioEvidenceValue, ScenarioParameterChangePhase } from "@/lib/scenario-evidence";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { ScenarioExamTechnicalSummary } from "./types";
import { describeExamHardwareSelection } from "./hardware-presentation";

export type EvidenceTone = "success" | "danger" | "warning" | "neutral";
export interface EvidenceDisplayValue { text: string; tone: EvidenceTone }
export interface ExamEvidenceChange {
  label: string;
  before: EvidenceDisplayValue;
  after: EvidenceDisplayValue;
  phase?: string;
  accepted: boolean;
}

const fieldLabels: Record<string, string> = {
  local: "Chế độ Local", "simulation.local": "Chế độ Local",
  "monitorIntegral.bypass": "Integral Monitor Bypass", "monitors.integral.bypass": "Integral Monitor Bypass",
  "monitors.standby.bypass": "Standby Monitor Bypass", "simulation.monitorBypass": "Monitor Bypass",
  monitorNormal: "Integral Monitor", monitorIntegralNormal: "Integral Monitor", monitorStandbyNormal: "Standby Monitor",
  monitorBypass: "Monitor Bypass", monitorIntegralBypass: "Integral Monitor Bypass", monitorStandbyBypass: "Standby Monitor Bypass",
  primaryMonitorAlarm: "Cảnh báo Monitor chính", secondaryMonitorAlarm: "Cảnh báo Monitor dự phòng",
  sidebandVswrAlarm: "Cảnh báo Sideband VSWR", activeTransmitter: "Máy phát chính", alarm: "Cảnh báo hệ thống",
  connected: "Kết nối PMDT", activeAlerts: "Cảnh báo đang có", activeAlarms: "Cảnh báo đang có",
  diagnosticCompleted: "Hoàn tất Diagnostics", diagnosticRun: "Chế độ Diagnostics",
  scenarioStage: "Bước xử lý", hardwareDispositionConfirmed: "Xác nhận phương án phần cứng", identMode: "Chế độ Ident",
};

function readableIdentifier(value: string): string {
  return value.split(".").map((part) => part.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ")
    .replace(/\b(tx[12]|rms|pmdt|vswr|rf|cpu|hpa|lpa|rtc)\b/gi, (word) => word.toUpperCase()))
    .join(" · ").replace(/^\w/, (letter) => letter.toUpperCase());
}

export function examEvidenceFieldLabel(fieldId: string, moduleId: ScenarioParametersModuleId): string {
  if (fieldLabels[fieldId]) return fieldLabels[fieldId];
  const txControl = /^transmitters\.(tx[12])\.(main|onAir|load|off)$/.exec(fieldId);
  if (txControl) return `${txControl[2] === "onAir" ? "On-air" : readableIdentifier(txControl[2])} ${txControl[1].toUpperCase()}`;
  const catalog = moduleId === "dvor-1150a" ? dvorConfigFieldCatalog : moduleId === "dvor-1150" ? dvor1150ConfigFieldCatalog : moduleId === "dme-1119a" ? dmeParameterFieldCatalog : [];
  const field = catalog.find((entry) => entry.id === fieldId);
  if (!field) return readableIdentifier(fieldId);
  const transmitter = /^transmitters\.(tx[12])\./.exec(fieldId)?.[1].toUpperCase();
  return transmitter && !field.label.includes(transmitter) ? `${transmitter} · ${field.label}` : field.label;
}

const controls: Record<string, { title: string; button: string }> = {
  "pmdt-login": { title: "Đăng nhập PMDT", button: "Logon" },
  "config-apply": { title: "Áp dụng cấu hình", button: "Apply" },
  "config-backup": { title: "Sao lưu cấu hình", button: "Backup" },
  "config-restore": { title: "Khôi phục cấu hình", button: "Restore" },
  "local-on": { title: "Bật chế độ điều khiển tại chỗ", button: "Local ON" },
  "local-off": { title: "Tắt chế độ điều khiển tại chỗ", button: "Local OFF" },
  "diagnostics-run-full": { title: "Chạy Diagnostics đầy đủ", button: "Run Full" },
  "diagnostics-run-on-air": { title: "Chạy Diagnostics On-air", button: "Run On-air" },
  "scenario-stage-hardware": { title: "Chuyển sang xác định phần cứng", button: "Tiếp tục: Xác định phần cứng" },
  "hardware-no-replacement": { title: "Xác nhận không cần thay phần cứng", button: "Không thay phần cứng" },
  "automatic-monitor-transfer": { title: "Đáp ứng bảo vệ tự động của Monitor", button: "Bảo vệ Monitor" },
};

export function examEvidenceControl(controlId: string, fallback: string, moduleId: ScenarioParametersModuleId) {
  if (controls[controlId]) return controls[controlId];
  const transmitter = /^(?:transmitter-|tx-transfer-)(tx[12])(?:-(main|load|off))?$/.exec(controlId);
  const legacyTransmitter = /^(?:TX\s*)?(TX[12])\s+(main|load|off)$/i.exec(fallback);
  if (transmitter || legacyTransmitter) {
    const tx = (transmitter?.[1] ?? legacyTransmitter![1]).toUpperCase();
    const mode = (transmitter?.[2] ?? legacyTransmitter?.[2] ?? "main").toLowerCase();
    return { title: mode === "main" ? `Chọn ${tx} làm máy phát chính` : mode === "load" ? `Chuyển ${tx} sang tải giả` : `Tắt máy phát ${tx}`, button: `${readableIdentifier(mode)} ${tx}` };
  }
  if (/^hardware-occurrence-/.test(controlId)) return { title: /unselect/i.test(fallback) ? "Bỏ chọn khối/card" : "Chọn khối/card nghi ngờ", button: "Lựa chọn phần cứng" };
  const fieldId = /^(?:Set|Stage)\s+(.+)$/.exec(fallback)?.[1] ?? (controlId.includes(".") ? controlId : undefined);
  if (fieldId) {
    const label = examEvidenceFieldLabel(fieldId, moduleId);
    return { title: `${fallback.startsWith("Stage ") ? "Chỉnh bản nháp" : "Thay đổi"}: ${label}`, button: label };
  }
  return { title: readableIdentifier(fallback || controlId), button: undefined };
}

/** A boolean alarm and a boolean Normal indicator have opposite meanings. */
export function examEvidenceValue(value: ScenarioEvidenceValue | undefined, fieldId = ""): EvidenceDisplayValue {
  if (value === undefined || value === null) return { text: value === null && fieldId === "activeTransmitter" ? "Chưa có máy phát" : "Không ghi nhận", tone: "neutral" };
  const boolean = typeof value === "boolean" ? value : value === "true" ? true : value === "false" ? false : undefined;
  if (boolean !== undefined) {
    if (/normal$/i.test(fieldId)) return { text: boolean ? "Bình thường" : "Có cảnh báo", tone: boolean ? "success" : "danger" };
    if (/alarm$|^alarm$/i.test(fieldId)) return { text: boolean ? "Có cảnh báo" : "Không cảnh báo", tone: boolean ? "danger" : "success" };
    if (/bypass/i.test(fieldId)) return { text: boolean ? "Bật Bypass" : "Tắt Bypass", tone: boolean ? "warning" : "success" };
    if (/completed$|confirmed$/i.test(fieldId)) return { text: boolean ? "Đã xác nhận" : "Chưa xác nhận", tone: boolean ? "success" : "neutral" };
    if (fieldId === "connected") return { text: boolean ? "Đã kết nối" : "Mất kết nối", tone: boolean ? "success" : "danger" };
    return { text: boolean ? "Bật" : "Tắt", tone: "neutral" };
  }
  if (Array.isArray(value)) return { text: value.length ? value.map((entry) => examEvidenceValue(entry).text).join(" · ") : "Không có", tone: "neutral" };
  if (typeof value === "object") return { text: `Đã ghi nhận ${Object.keys(value).length} giá trị`, tone: "neutral" };
  const text = String(value);
  if (/^tx[12]$/i.test(text)) return { text: text.toUpperCase(), tone: "neutral" };
  if (fieldId === "scenarioStage") return { text: ({ pmdt: "Kiểm tra PMDT", hardware: "Xác định phần cứng", complete: "Hoàn tất" } as Record<string, string>)[text] ?? text, tone: "neutral" };
  return { text, tone: "neutral" };
}

const phases: Record<ScenarioParameterChangePhase, string> = { draft: "Bản nháp", apply: "Đã Apply", command: "Lệnh điều khiển", restore: "Khôi phục", backup: "Sao lưu" };
const snapshotFields = ["local", "connected", "monitorNormal", "monitorIntegralNormal", "monitorStandbyNormal", "monitorBypass", "monitorIntegralBypass", "monitorStandbyBypass", "sidebandVswrAlarm", "primaryMonitorAlarm", "secondaryMonitorAlarm", "activeTransmitter", "alarm", "activeAlerts", "activeAlarms", "scenarioStage", "diagnosticRun", "diagnosticCompleted", "hardwareDispositionConfirmed", "identMode"];

export function presentExamEvidenceAction(event: ScenarioActionEvent, moduleId: ScenarioParametersModuleId) {
  const input = event.input && typeof event.input === "object" && !Array.isArray(event.input) ? event.input : {};
  const fieldId = typeof input.fieldId === "string" ? input.fieldId : event.controlId ?? "";
  const control = examEvidenceControl(event.controlId ?? fieldId, event.label, moduleId);
  const changes: ExamEvidenceChange[] = snapshotFields.flatMap((key) => {
    if (!event.before || !event.after || JSON.stringify(event.before[key]) === JSON.stringify(event.after[key])) return [];
    return [{ label: examEvidenceFieldLabel(key, moduleId), before: examEvidenceValue(event.before[key], key), after: examEvidenceValue(event.after[key], key), accepted: event.accepted }];
  });
  for (const change of event.parameterChanges ?? []) {
    const accepted = event.accepted && change.accepted;
    const phase = !accepted && change.phase !== "draft" ? `Yêu cầu ${phases[change.phase].replace("Đã ", "")}` : phases[change.phase];
    changes.push({ label: examEvidenceFieldLabel(change.fieldId, moduleId), before: examEvidenceValue(change.before, change.fieldId), after: examEvidenceValue(change.after, change.fieldId), phase, accepted });
  }
  const facts: { label: string; value: string }[] = [];
  if (typeof input.securityLevel === "number") facts.push({ label: "Quyền truy cập", value: `Cấp ${input.securityLevel}` });
  if (typeof input.userId === "string") facts.push({ label: "Tài khoản PMDT", value: input.userId });
  if (typeof input.occurrenceKey === "string") {
    const card = describeExamHardwareSelection(input.occurrenceKey, moduleId);
    facts.push({ label: "Khối/card", value: `${card.label} · ${card.position}` });
    if (typeof input.selected === "boolean") facts.push({ label: "Lựa chọn", value: input.selected ? "Đã chọn" : "Đã bỏ chọn" });
  }
  if (input.value !== undefined) facts.push({ label: event.accepted ? "Giá trị chọn" : "Giá trị yêu cầu", value: examEvidenceValue(input.value, fieldId).text });
  if (input.enabled !== undefined) facts.push({ label: "Giá trị chọn", value: examEvidenceValue(input.enabled, fieldId).text });
  if (typeof input.transmitterId === "string" && !/^transmitter-|^tx-transfer-/.test(event.controlId ?? "")) facts.push({ label: "Máy phát", value: input.transmitterId.toUpperCase() });
  if (typeof event.input === "string" || typeof event.input === "number" || typeof event.input === "boolean") facts.push({ label: "Giá trị chọn", value: examEvidenceValue(event.input, fieldId).text });
  return { ...control, changes, facts,
    category: ({ view: "Kiểm tra màn hình", control: "Điều khiển", configuration: "Cấu hình", authentication: "Đăng nhập", system: "Phản hồi hệ thống" } as const)[event.kind],
    actor: ({ student: "Thí sinh", system: "Hệ thống", instructor: "Giám khảo" } as const)[event.actor],
    reason: examEvidenceReason(event.reason),
  };
}

const reasons: Record<string, string> = {
  "Security level is insufficient.": "Quyền truy cập hiện tại chưa đủ để thực hiện thao tác.",
  "Local mode is disabled.": "Chưa bật chế độ Local.",
  "Local mode is required before enabling Monitor Bypass.": "Cần bật Local trước khi bật Monitor Bypass.",
  "Local mode is required for this routing command.": "Cần bật Local trước khi chuyển chế độ máy phát.",
  "PMDT rejected the configuration value.": "PMDT từ chối giá trị cấu hình đã nhập.",
  "PMDT rejected the routing command.": "PMDT từ chối lệnh chuyển chế độ máy phát.",
  "PMDT is not ready to Apply the draft.": "PMDT chưa đủ điều kiện để Apply bản nháp.",
  "Configuration validation failed.": "Cấu hình chưa hợp lệ.",
  "Scenario recovery controls only.": "Kịch bản chỉ cho phép sử dụng các chức năng khắc phục đã cấp.",
  "Invalid User ID or Password.": "Thông tin đăng nhập PMDT không hợp lệ.",
  "Logon is temporarily blocked.": "Đăng nhập PMDT đang tạm khóa.",
  "Security level, login or Local requirement is not satisfied.": "Chưa đáp ứng yêu cầu đăng nhập, quyền truy cập hoặc chế độ Local.",
  "Local mode, login or security requirement is not satisfied.": "Chưa đáp ứng yêu cầu Local, đăng nhập hoặc quyền truy cập.",
  "Security level or login state does not allow this command.": "Phiên đăng nhập hoặc quyền truy cập chưa cho phép thao tác này.",
  "TX2 is unavailable in Single Transmitter mode.": "TX2 không khả dụng trong cấu hình một máy phát.",
  "Target transmitter is unavailable.": "Máy phát được chọn không khả dụng.",
  "PMDT automatic protection response.": "Hệ thống tự động thực hiện bảo vệ theo trạng thái Monitor.",
};

export function examEvidenceReason(reason?: string): string | undefined { return reason ? reasons[reason] ?? reason : undefined; }

const criterionLabels: Record<string, string> = {
  "integral-monitor": "Integral Monitor ở trạng thái bình thường", "standby-monitor": "Standby Monitor ở trạng thái bình thường",
  "active-transmitter": "Có máy phát chính đưa ra anten", "sideband-vswr": "Không còn cảnh báo Sideband VSWR", "vswr-executive": "Không còn cảnh báo Sideband VSWR",
  "monitor-bypass": "Đã tắt Monitor Bypass", "hardware-selection": "Xác định đúng khối/card hoặc phương án phần cứng",
};
const criterionDetails: Record<string, string> = {
  Normal: "Bình thường", "Alarm active": "Đang có cảnh báo", Active: "Đang có cảnh báo", Clear: "Không cảnh báo",
  "Bypass active": "Bypass đang bật", Released: "Bypass đã tắt", "No active transmitter": "Chưa có máy phát chính",
  "No hardware replacement selected": "Đã xác nhận không cần thay phần cứng", "Đúng occurrence": "Đã chọn đúng khối/card và vị trí",
  "Chưa khớp block/occurrence đáp án": "Khối/card hoặc vị trí được chọn chưa khớp đáp án",
};

export function presentExamCriterion(check: ScenarioExamTechnicalSummary["checks"][number], moduleId: ScenarioParametersModuleId) {
  const actionId = check.id.startsWith("action-") ? check.id.slice(7) : /^PMDT action:\s*(.+)$/.exec(check.label)?.[1];
  return { label: actionId ? examEvidenceControl(actionId, actionId, moduleId).title : criterionLabels[check.id] ?? check.label,
    detail: criterionDetails[check.detail] ?? check.detail };
}

const timeFormatter = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
export function formatExamEvidenceTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Chưa ghi nhận giờ" : timeFormatter.format(date);
}
