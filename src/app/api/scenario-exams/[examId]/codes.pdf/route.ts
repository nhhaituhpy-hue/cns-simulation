import { getCurrentProfile } from "@/lib/auth/profile";
import { queryDatabase } from "@/lib/db";
import { SCENARIO_PARAMETERS_MODULES, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import {
  decryptScenarioExamCode,
  isScenarioExamCodeEncryptionKeyConfigured,
} from "@/lib/scenario-exams/code-encryption";
import { isScenarioExamCode } from "@/lib/scenario-exams/codes";
import { buildScenarioExamCodesPdf, type ScenarioExamPdfRow } from "@/lib/scenario-exams/pdf";
import { ScenarioExamValidationError, validateScenarioExamUuid } from "@/lib/scenario-exams/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const noStoreHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
};

const codeStatuses = new Set<ScenarioExamPdfRow["status"]>([
  "issued", "redeemed", "in_progress", "submitted", "timed_out", "revoked",
]);

function row(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.map(row) : [];
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function number(value: unknown): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

function moduleLabel(moduleId: string): string {
  return SCENARIO_PARAMETERS_MODULES.find((module) => module.moduleId === moduleId)?.label ?? moduleId;
}

function errorCode(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : "unknown";
}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: noStoreHeaders });
}

export async function GET(_request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return errorResponse("Bạn chưa đăng nhập.", 401);
  if (profile.role !== "admin") return errorResponse("Không có quyền xuất danh sách mã kỳ thi.", 403);

  let examId: string;
  try {
    examId = validateScenarioExamUuid((await params).examId, "Mã kỳ thi");
  } catch (error) {
    return errorResponse(error instanceof ScenarioExamValidationError ? error.message : "Mã kỳ thi không hợp lệ.", 400);
  }

  try {
    const [examResult, codeResult] = await Promise.all([
      queryDatabase(`select name, description, opens_at, closes_at, duration_minutes
                       from public.scenario_exams
                      where id = $1`, [examId]),
      queryDatabase(`select c.code_hash, c.code_ciphertext, c.code_hint, c.candidate_name, c.candidate_unit, c.status,
                            coalesce(jsonb_agg(jsonb_build_object(
                              'moduleId', cs.module_id,
                              'position', cs.position
                            ) order by cs.position) filter (where cs.id is not null), '[]'::jsonb) as subjects,
                            (count(cs.id) filter (where cs.status in ('submitted', 'timed_out')))::int as completed_modules
                       from public.scenario_exam_codes c
                       left join public.scenario_exam_code_subjects cs on cs.code_id = c.id
                      where c.exam_id = $1
                      group by c.id
                      order by c.created_at asc, c.id`, [examId]),
    ]);
    const exam = row(examResult.rows[0]);
    if (!exam.id && examResult.rows.length === 0) return errorResponse("Không tìm thấy kỳ thi Scenario.", 404);
    const codeRows = codeResult.rows.map((raw) => row(raw));
    if (codeRows.some((code) => nullableString(code.code_ciphertext) !== null) && !isScenarioExamCodeEncryptionKeyConfigured()) {
      return errorResponse("Máy chủ chưa cấu hình khóa bảo mật để xuất mã đầy đủ.", 503);
    }

    let unavailableCount = 0;
    const pdfRows: ScenarioExamPdfRow[] = codeRows.map((code) => {
      const codeHash = string(code.code_hash);
      const encrypted = nullableString(code.code_ciphertext);
      let plaintext: string | null = null;
      if (encrypted) {
        try {
          const candidate = decryptScenarioExamCode(encrypted, examId, codeHash);
          plaintext = isScenarioExamCode(candidate) ? candidate : null;
        } catch {
          plaintext = null;
        }
      }
      if (!plaintext) unavailableCount += 1;
      const moduleIds = rows(code.subjects)
        .sort((left, right) => number(left.position) - number(right.position))
        .map((subject) => string(subject.moduleId) as ScenarioParametersModuleId);
      return {
        candidateName: string(code.candidate_name),
        candidateUnit: string(code.candidate_unit),
        code: plaintext,
        codeHint: string(code.code_hint),
        moduleNames: moduleIds.map(moduleLabel),
        completedModules: number(code.completed_modules),
        status: codeStatuses.has(string(code.status) as ScenarioExamPdfRow["status"])
          ? string(code.status) as ScenarioExamPdfRow["status"]
          : "issued",
      };
    });

    const pdf = await buildScenarioExamCodesPdf({
      exam: {
        name: string(exam.name),
        description: string(exam.description),
        opensAt: nullableString(exam.opens_at),
        closesAt: nullableString(exam.closes_at),
        durationMinutes: number(exam.duration_minutes),
      },
      exportedAt: new Date().toISOString(),
      rows: pdfRows,
    });

    await queryDatabase(
      `insert into public.scenario_exam_audit_events
         (exam_id, actor_user_id, event_type, event_json)
       values ($1, $2, 'code_exported', jsonb_build_object(
         'rowCount', $3::int,
         'recoverableCount', $4::int,
         'unavailableCount', $5::int
       ))`,
      [examId, profile.id, pdfRows.length, pdfRows.length - unavailableCount, unavailableCount],
    );

    const responseBody = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    return new Response(responseBody, {
      headers: {
        ...noStoreHeaders,
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="scenario-exam-${examId}-codes.pdf"`,
        "content-length": String(pdf.byteLength),
      },
    });
  } catch (error) {
    console.error("Scenario Exam PDF export failed", { operation: "export_codes_pdf", code: errorCode(error) });
    return errorResponse("Không thể xuất danh sách mã PDF. Vui lòng thử lại hoặc liên hệ giám khảo.", 500);
  }
}
