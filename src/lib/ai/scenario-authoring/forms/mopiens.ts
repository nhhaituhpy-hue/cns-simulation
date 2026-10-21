import type { ScenarioParametersDefinition } from "@/lib/scenario-parameters";
import type { AuthoringField, AuthoringSection, JsonValue, NativeAuthoringAdapter } from "../types";
import { createDefaultDvor220ScenarioDefinition, parseDvor220ScenarioDefinition, validateDvor220ScenarioDefinition, previewDvor220Scenario, evaluateDvor220Scenario } from "@/modules/operations/dvor-220/domain/scenario";
import { createDefaultDme320ScenarioDefinition, parseDme320ScenarioDefinition, validateDme320ScenarioDefinition, evaluateDme320Scenario } from "@/modules/operations/dme-320/domain/scenario";
import { previewDme320Scenario, rebaseChannelDependentMonitorLimits } from "@/modules/operations/dme-320/domain/engine";
import { assertSafeJson, metadataFields, metadataSection, readPath, writePath, validateMetadata } from "./helpers";
import { validateDvor220Configuration } from "@/modules/operations/dvor-220/domain/validation";
import { mopiensDerivedFields } from "./mopiens-derived";
import { assertMopiensShape, mopiensListIssues } from "./mopiens-safety";
import { mopiensListSchema, validateMopiensValue } from "./mopiens-lists";
import { mopiensScalarSchema, mopiensSection, protectedMopiensPath, type MopiensModule } from "./mopiens-schema";
type Definition = ReturnType<typeof createDefaultDvor220ScenarioDefinition> | ReturnType<typeof createDefaultDme320ScenarioDefinition>;
const sections: AuthoringSection[] = [metadataSection, ...[
  ["initial", "Trạng thái khởi đầu", "Trạm, kết nối mô phỏng và trạng thái lúc bắt đầu bài."],
  ["rf", "Tín hiệu RF / Điều chế / Kênh", "Setpoint phát và tín hiệu; số đo engine không phải đầu vào."],
  ["monitors", "Giám sát và giới hạn", "Kênh, voting, ngưỡng và độ trễ native; không dùng ngưỡng để né bài."],
  ["plant", "Thiết bị / Nguồn điện / Môi trường", "Nhiệt độ, nguồn, môi trường và VSWR."],
  ["faults", "Lỗi đưa vào", "Lỗi thiết bị có kiểu; có thể cần clear-fault thay vì chỉnh RF."],
  ["raw", "Số đo giám sát cưỡng bức", "Giá trị cưỡng bức có ưu tiên; PMDT có thể không khắc phục được."],
  ["success-criteria", "Điều kiện đạt", "Tiêu chí của engine, không phải bài chẩn đoán SELEX."],
].map(([id, title, help]) => ({ id, title, help }))];
function factory(moduleId: MopiensModule): Definition { return moduleId === "dvor-220" ? createDefaultDvor220ScenarioDefinition() : createDefaultDme320ScenarioDefinition(); }
function makeFields(moduleId: MopiensModule, definition: ScenarioParametersDefinition): AuthoringField[] {
  assertMopiensShape(definition, factory(moduleId));
  const fields = metadataFields(definition);
  function visit(value: JsonValue, id: string) {
    if (protectedMopiensPath(id)) return;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, child] of Object.entries(value)) visit(child, `${id}.${key}`);
      return;
    }
    const schema = mopiensListSchema(moduleId, id) ?? mopiensScalarSchema(moduleId, id, value);
    if (moduleId === "dme-320" && /^configuration\.monitor\.limits\.[^.]+\.(nominal|alarmLow|warningLow|warningHigh|alarmHigh)$/.test(id)) schema.unit = readPath(reference, `${id.slice(0, id.lastIndexOf("."))}.unit`) as string;
    if (moduleId === "dvor-220" && /^configuration\.transmitterLimits\.(carrierPower|sidebandPower)\./.test(id) && schema.type === "number") schema.unit = "W";
    fields.push({ id, sectionId: mopiensSection(id), group: id.split(".").slice(1, -1).join(" / ") || "Runtime", schema, value: readPath(definition, id)!, baselineEligible: id.startsWith("configuration.") && !id.startsWith("configuration.system.") && !schema.readOnly });
  }
  const reference = factory(moduleId);
  for (const key of ["configuration", "runtime", "successCriteria"] as const) visit(reference[key] as unknown as JsonValue, key);
  return fields;
}
function makeAdapter(moduleId: MopiensModule): NativeAuthoringAdapter {
  const validate: NativeAuthoringAdapter["validate"] = (input) => {
    try {
      assertSafeJson(input);
      const fields = makeFields(moduleId, input);
      const issues = [...validateMetadata(input), ...fields.filter(f => f.sectionId !== "metadata").flatMap(f => validateMopiensValue(f.schema, f.value, f.schema.label).map(message => ({ code: "INVALID_NATIVE_FIELD", fieldId: f.id, sectionId: f.sectionId, severity: "error" as const, message })))];
      if (issues.length) return issues;
      issues.push(...mopiensListIssues((input as Definition).runtime as unknown as Record<string, JsonValue>).map(i => ({...i, code: "DUPLICATE_NATIVE_INPUT", sectionId: mopiensSection(i.fieldId), severity: "error" as const})));
      const native = moduleId === "dvor-220" ? validateDvor220ScenarioDefinition(input as ReturnType<typeof createDefaultDvor220ScenarioDefinition>) : validateDme320ScenarioDefinition(input);
      issues.push(...native.map(message => {
        const path = message.split(":")[0];
        const fieldId = /^(station|thermal|monitor|battery|communication|transmitters|system|environment)\./.test(path) ? `configuration.${path}` : undefined;
        return { code: "INVALID_NATIVE_SCENARIO", sectionId: fieldId ? mopiensSection(fieldId) : "initial", ...(fieldId ? {fieldId} : {}), severity: "error" as const, message };
      }));
      if (moduleId === "dvor-220") issues.push(...validateDvor220Configuration((input as ReturnType<typeof createDefaultDvor220ScenarioDefinition>).configuration).filter(i => i.severity === "warning").map(i => ({code: "NATIVE_WARNING", fieldId: `configuration.${i.path}`, sectionId: mopiensSection(`configuration.${i.path}`), severity: "warning" as const, message: i.message})));
      if (!issues.some(i => i.severity === "error")) {
        const parsed = moduleId === "dvor-220" ? parseDvor220ScenarioDefinition(input) : parseDme320ScenarioDefinition(input);
        if (!parsed) issues.push({ code: "NATIVE_PARSE_REJECTED", sectionId: "initial", severity: "error", message: "Parser native từ chối cấu trúc/giá trị. Đối chiếu giới hạn import native; không tự chuyển đổi." });
      }
      return issues;
    } catch { return [{ code: "INVALID_NATIVE_SCENARIO", sectionId: "initial", severity: "error", message: "Cấu trúc kịch bản native không hợp lệ." }]; }
  };
  return {
    moduleId, createDefault: () => factory(moduleId),
    form: definition => {
      const fields = makeFields(moduleId, definition);
      // Unknown typed-list keys must never cross the public DTO boundary.
      for (const field of fields.filter(f => f.schema.type === "array")) {
        if (validateMopiensValue(field.schema, field.value, field.schema.label).length) throw new Error(`Danh sách native không hợp lệ: ${field.id}.`);
      }
      if (!validate(definition, "draft").some(i => i.severity === "error")) fields.push(...mopiensDerivedFields(moduleId, definition as Definition));
      return { moduleId, label: moduleId === "dvor-220" ? "DVOR 220" : "DME 320", version: 1, sections: structuredClone(sections), fields: structuredClone(fields), notices: ["Không hiển thị hoặc sửa tài khoản, mật khẩu, chính sách đăng nhập/quyền sửa. Giữ mặc định native.", "Số đo dẫn xuất chỉ đọc qua preview. Preview không chứng minh chuỗi khôi phục của học viên.", "Giới hạn null của DVOR 220 phụ thuộc parser import native: một số chuyển đổi null/số bị parser từ chối; không tự sửa giá trị."] };
    },
    apply(definition, changes) {
      assertSafeJson(definition); assertSafeJson(changes);
      const fields = new Map(makeFields(moduleId, definition).map(f => [f.id, f]));
      const result = structuredClone(definition);
      const seen = new Set<string>();
      for (const change of changes) {
        if (Object.keys(change).some(key => !["fieldId", "value"].includes(key)) || seen.has(change.fieldId)) throw new Error("Thay đổi trùng hoặc không hợp lệ.");
        seen.add(change.fieldId);
        const field = fields.get(change.fieldId);
        if (!field || field.schema.readOnly) throw new Error("Trường không được hỗ trợ hoặc chỉ đọc.");
        const issues = validateMopiensValue(field.schema, change.value, field.schema.label);
        if (moduleId === "dvor-220" && change.fieldId === "configuration.communication.pmdtRs232BaudRate" && ![9600, 19200, 38400, 57600, 115200].includes(change.value as number)) issues.push("PMDT RS-232 baud: chọn 9600, 19200, 38400, 57600 hoặc 115200.");
        if (issues.length) throw new Error(issues.join(" "));
        writePath(result, change.fieldId, change.value);
      }
      if (moduleId === "dme-320" && changes.some(c => c.fieldId.startsWith("configuration.station.channel."))) {
        const before = definition as ReturnType<typeof createDefaultDme320ScenarioDefinition>;
        const after = result as typeof before;
        rebaseChannelDependentMonitorLimits(before.configuration, after.configuration);
        // Explicit authored limits win; only channel-derived offsets follow the channel.
        for (const change of changes.filter(c => c.fieldId.startsWith("configuration.monitor.limits."))) writePath(result, change.fieldId, change.value);
      }
      const issues = validate(result, "draft").filter(i => i.severity === "error");
      if (issues.length) throw new Error(issues.map(i => i.message).join(" "));
      return result;
    }, validate,
    preview(definition) {
      const issues = validate(definition, "final");
      if (issues.some(i => i.severity === "error")) return { status: "invalid", checks: [], notes: issues.map(i => i.message), recoveryVerified: false };
      if (moduleId === "dvor-220") {
        const parsed = parseDvor220ScenarioDefinition(definition)!;
        const { device, snapshot } = previewDvor220Scenario(parsed);
        const evaluation = evaluateDvor220Scenario(device, snapshot);
        return { status: "valid", checks: evaluation.checks, notes: [...issues.map(i => i.message), ...evaluation.blockers, "Chỉ kiểm trạng thái ban đầu trên engine native, không replay khôi phục."], recoveryVerified: false };
      }
      const parsed = parseDme320ScenarioDefinition(definition)!;
      const evaluation = evaluateDme320Scenario(previewDme320Scenario(parsed));
      return { status: "valid", checks: evaluation.checks, notes: [...issues.map(i => i.message), ...evaluation.blockers, "Chỉ kiểm trạng thái ban đầu trên engine native, không replay khôi phục."], recoveryVerified: false };
    },
  };
}
export const mopiensAuthoringAdapters: NativeAuthoringAdapter[] = [makeAdapter("dvor-220"), makeAdapter("dme-320")];
