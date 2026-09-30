import {
  isScenarioParametersModuleId,
  type ScenarioParametersModuleId,
} from "@/lib/scenario-parameters";
import type { IssueScenarioExamCodeInput, ScenarioExamInput } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ScenarioExamValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioExamValidationError";
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ScenarioExamValidationError("Dữ liệu kỳ thi không hợp lệ.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") {
    throw new ScenarioExamValidationError(`${label} phải là chuỗi.`);
  }
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new ScenarioExamValidationError(`${label} phải dài từ ${min} đến ${max} ký tự.`);
  }
  return normalized;
}

function uuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID.test(value.trim())) {
    throw new ScenarioExamValidationError(`${label} không hợp lệ.`);
  }
  return value.trim();
}

export function validateScenarioExamUuid(value: unknown, label: string): string {
  return uuid(value, label);
}

function optionalDate(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new ScenarioExamValidationError(`${label} không hợp lệ.`);
  }
  return new Date(value).toISOString();
}

export function validateScenarioExamInput(value: unknown): ScenarioExamInput {
  const input = record(value);
  const name = text(input.name, "Tên kỳ thi", 3, 200);
  const description = input.description === undefined
    ? ""
    : text(input.description, "Mô tả kỳ thi", 0, 2000);
  const opensAt = optionalDate(input.opensAt, "Thời điểm mở kỳ thi");
  const closesAt = optionalDate(input.closesAt, "Thời điểm đóng kỳ thi");
  const durationMinutes = input.durationMinutes;
  if (
    typeof durationMinutes !== "number" ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 1440
  ) {
    throw new ScenarioExamValidationError("Thời lượng phải là số nguyên từ 1 đến 1440 phút.");
  }
  if (opensAt && closesAt && new Date(closesAt).getTime() <= new Date(opensAt).getTime()) {
    throw new ScenarioExamValidationError("Thời điểm đóng phải sau thời điểm mở.");
  }
  return {
    ...(input.id === undefined ? {} : { id: uuid(input.id, "Mã kỳ thi") }),
    name,
    description,
    opensAt,
    closesAt,
    durationMinutes,
  };
}

export function validateIssueScenarioExamCodeInput(
  value: unknown,
): IssueScenarioExamCodeInput {
  const input = record(value);
  const examId = uuid(input.examId, "Mã kỳ thi");
  const candidateName = text(input.candidateName, "Tên thí sinh", 2, 160);
  const candidateUnit = text(input.candidateUnit, "Đơn vị", 2, 200);
  if (!Array.isArray(input.moduleIds) || input.moduleIds.length < 1 || input.moduleIds.length > 6) {
    throw new ScenarioExamValidationError("Phải chọn từ 1 đến 6 môn thi.");
  }
  const moduleIds = input.moduleIds.map((value): ScenarioParametersModuleId => {
    if (typeof value !== "string" || !isScenarioParametersModuleId(value)) {
      throw new ScenarioExamValidationError("Môn thi chưa được hỗ trợ.");
    }
    return value;
  });
  if (new Set(moduleIds).size !== moduleIds.length) {
    throw new ScenarioExamValidationError("Không được chọn trùng môn thi.");
  }
  return { examId, candidateName, candidateUnit, moduleIds };
}

export function validateScenarioExamStatus(value: unknown): "open" | "locked" | "closed" {
  if (value !== "open" && value !== "locked" && value !== "closed") {
    throw new ScenarioExamValidationError("Trạng thái kỳ thi không hợp lệ.");
  }
  return value;
}
