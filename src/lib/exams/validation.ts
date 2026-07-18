import type {
  CandidateResultInput,
  CompleteAttemptItemInput,
  ExamCandidateInput,
  ExamExaminerInput,
  ExamInput,
  ExamLocation,
  ExamModuleCode,
  ExamSetInput,
  ExamStatus,
} from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ATTECH_EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@attech\.com\.vn$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MODULES = new Set<ExamModuleCode>(["vor", "dme", "ads-b"]);
const LOCATIONS = new Set<ExamLocation>(["ha_noi", "da_nang", "tp_hcm"]);
const EXAM_STATUSES = new Set<ExamStatus>(["open", "locked", "archived"]);

export class ExamValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExamValidationError";
  }
}

function object(value: unknown, message = "Dữ liệu không hợp lệ."): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ExamValidationError(message);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") throw new ExamValidationError(`${label} không hợp lệ.`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new ExamValidationError(`${label} phải có từ ${min} đến ${max} ký tự.`);
  }
  return normalized;
}

export function validateUuid(value: unknown, label = "Mã dữ liệu"): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new ExamValidationError(`${label} không hợp lệ.`);
  return value.toLowerCase();
}

export function validateExamSetInput(value: unknown): ExamSetInput {
  const input = object(value);
  if (!Array.isArray(input.subjects) || input.subjects.length === 0) {
    throw new ExamValidationError("Bộ đề phải có ít nhất một môn thi.");
  }

  const subjectIds = new Set<string>();
  const subjects = input.subjects.map((rawSubject) => {
    const subject = object(rawSubject);
    const subjectId = validateUuid(subject.subjectId, "Mã môn thi");
    if (subjectIds.has(subjectId)) throw new ExamValidationError("Một môn thi không thể xuất hiện hai lần trong bộ đề.");
    subjectIds.add(subjectId);
    if (!Array.isArray(subject.papers) || subject.papers.length === 0) {
      throw new ExamValidationError("Mỗi môn phải có ít nhất một đề thi.");
    }

    const paperNumbers = new Set<number>();
    const papers = subject.papers.map((rawPaper) => {
      const paper = object(rawPaper);
      const paperNumber = Number(paper.paperNumber);
      if (!Number.isInteger(paperNumber) || paperNumber < 1 || paperNumber > 999) {
        throw new ExamValidationError("Số đề thi không hợp lệ.");
      }
      if (paperNumbers.has(paperNumber)) throw new ExamValidationError("Số đề thi trong cùng môn không được trùng nhau.");
      paperNumbers.add(paperNumber);
      if (!Array.isArray(paper.scenarios) || paper.scenarios.length === 0) {
        throw new ExamValidationError(`Đề số ${paperNumber} phải có ít nhất một kịch bản.`);
      }

      const scenarioKeys = new Set<string>();
      const scenarios = paper.scenarios.map((rawScenario, index) => {
        const scenario = object(rawScenario);
        if (typeof scenario.moduleCode !== "string" || !MODULES.has(scenario.moduleCode as ExamModuleCode)) {
          throw new ExamValidationError("Module kịch bản không hợp lệ.");
        }
        const moduleCode = scenario.moduleCode as ExamModuleCode;
        const scenarioId = text(scenario.scenarioId, "Mã kịch bản", 1, 200);
        const key = `${moduleCode}:${scenarioId}`;
        if (scenarioKeys.has(key)) throw new ExamValidationError("Một kịch bản không thể lặp lại trong cùng đề.");
        scenarioKeys.add(key);
        const position = scenario.position === undefined ? index + 1 : Number(scenario.position);
        if (!Number.isInteger(position) || position < 1 || position > 999) {
          throw new ExamValidationError("Thứ tự kịch bản không hợp lệ.");
        }
        return { moduleCode, scenarioId, position };
      });

      return {
        ...(paper.id === undefined ? {} : { id: validateUuid(paper.id, "Mã đề thi") }),
        paperNumber,
        title: text(paper.title, "Tên đề thi", 1, 200),
        scenarios,
      };
    });
    return { subjectId, papers };
  });

  return {
    ...(input.id === undefined ? {} : { id: validateUuid(input.id, "Mã bộ đề") }),
    name: text(input.name, "Tên bộ đề", 3, 200),
    description: typeof input.description === "string" ? input.description.trim().slice(0, 1000) : "",
    subjects,
  };
}

export function validateExamInput(value: unknown): ExamInput {
  const input = object(value);
  if (typeof input.examDate !== "string" || !DATE.test(input.examDate) || Number.isNaN(Date.parse(`${input.examDate}T00:00:00Z`))) {
    throw new ExamValidationError("Ngày thi không hợp lệ.");
  }
  if (typeof input.location !== "string" || !LOCATIONS.has(input.location as ExamLocation)) {
    throw new ExamValidationError("Địa điểm tổ chức không hợp lệ.");
  }
  return {
    ...(input.id === undefined ? {} : { id: validateUuid(input.id, "Mã kỳ thi") }),
    name: text(input.name, "Tên kỳ thi", 3, 200),
    examDate: input.examDate,
    location: input.location as ExamLocation,
    decisionBasis: text(input.decisionBasis, "Căn cứ", 3, 500),
    examSetId: validateUuid(input.examSetId, "Mã bộ đề"),
  };
}

export function validateExaminerInput(value: unknown): ExamExaminerInput {
  const input = object(value);
  const position = Number(input.position);
  if (!Number.isInteger(position) || position < 1 || position > 100) throw new ExamValidationError("Thứ tự giám khảo không hợp lệ.");
  return {
    ...(input.id === undefined ? {} : { id: validateUuid(input.id, "Mã giám khảo") }),
    fullName: text(input.fullName, "Tên giám khảo", 2, 160),
    subjectId: validateUuid(input.subjectId, "Mã môn chấm thi"),
    position,
  };
}

export function validateCandidateInput(value: unknown): ExamCandidateInput {
  const input = object(value);
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!ATTECH_EMAIL.test(email)) throw new ExamValidationError("Email thí sinh phải thuộc miền @attech.com.vn.");
  if (!Array.isArray(input.subjects) || input.subjects.length === 0) {
    throw new ExamValidationError("Thí sinh phải được phân ít nhất một môn thi.");
  }
  const seenSubjects = new Set<string>();
  const subjects = input.subjects.map((rawSubject) => {
    const subject = object(rawSubject);
    const subjectId = validateUuid(subject.subjectId, "Mã môn thi");
    if (seenSubjects.has(subjectId)) throw new ExamValidationError("Một thí sinh không thể có hai dòng cùng môn thi.");
    seenSubjects.add(subjectId);
    return {
      ...(subject.id === undefined ? {} : { id: validateUuid(subject.id, "Mã phân môn") }),
      subjectId,
      examPaperId: validateUuid(subject.examPaperId, "Mã đề thi"),
    };
  });
  return {
    ...(input.id === undefined ? {} : { id: validateUuid(input.id, "Mã thí sinh") }),
    examId: validateUuid(input.examId, "Mã kỳ thi"),
    fullName: text(input.fullName, "Tên thí sinh", 2, 160),
    workUnit: text(input.workUnit, "Đơn vị", 2, 200),
    email,
    subjects,
  };
}

export function validateCandidateResultInput(value: unknown): CandidateResultInput {
  const input = object(value);
  const score = input.officialScore;
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) {
    throw new ExamValidationError("Điểm chính thức phải nằm trong khoảng 0-100.");
  }
  return {
    candidateSubjectId: validateUuid(input.candidateSubjectId, "Mã phân môn"),
    officialScore: score,
    examinerComment: typeof input.examinerComment === "string" ? input.examinerComment.trim().slice(0, 4000) : "",
  };
}

export function validateExamStatus(value: unknown): ExamStatus {
  if (typeof value !== "string" || !EXAM_STATUSES.has(value as ExamStatus)) {
    throw new ExamValidationError("Trạng thái kỳ thi không hợp lệ.");
  }
  return value as ExamStatus;
}

export function validateCompleteAttemptItemInput(value: unknown): CompleteAttemptItemInput {
  const input = object(value);
  const result = object(input.result, "Kết quả kịch bản không hợp lệ.");
  const serializedLength = JSON.stringify(result).length;
  if (serializedLength > 750_000) throw new ExamValidationError("Dữ liệu kết quả kịch bản quá lớn.");
  return {
    ...(typeof input.submissionRef === "string" && input.submissionRef.trim()
      ? { submissionRef: input.submissionRef.trim().slice(0, 500) }
      : {}),
    result,
  };
}
