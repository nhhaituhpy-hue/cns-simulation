import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  queryDatabase: vi.fn(),
  buildScenarioExamCodesPdf: vi.fn(),
}));

vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: mocks.getCurrentProfile }));
vi.mock("@/lib/db", () => ({ queryDatabase: mocks.queryDatabase }));
vi.mock("@/lib/scenario-exams/pdf", () => ({ buildScenarioExamCodesPdf: mocks.buildScenarioExamCodesPdf }));

import { encryptScenarioExamCode } from "@/lib/scenario-exams/code-encryption";
import { hashScenarioExamCode } from "@/lib/scenario-exams/codes";
import { GET } from "@/app/api/scenario-exams/[examId]/codes.pdf/route";

const examId = "11111111-1111-4111-8111-111111111111";
const code = "ABCD2345EFGH";
const codeHash = hashScenarioExamCode(code);
const previousKey = process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY;

beforeEach(() => {
  vi.resetAllMocks();
  process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY = "44".repeat(32);
  mocks.getCurrentProfile.mockResolvedValue({ id: "admin-1", role: "admin" });
  mocks.buildScenarioExamCodesPdf.mockResolvedValue(Buffer.from("%PDF-1.7 test"));
});

describe("Scenario Exam roster PDF route", () => {
  it("requires an admin and emits no-store PDF with an export audit", async () => {
    mocks.queryDatabase
      .mockResolvedValueOnce({ rows: [{ name: "Kỳ thi kiểm thử", description: "Mô tả", opens_at: null, closes_at: null, duration_minutes: 60 }] })
      .mockResolvedValueOnce({ rows: [{
        code_hash: codeHash,
        code_ciphertext: encryptScenarioExamCode(code, examId, codeHash),
        code_hint: "EFGH",
        candidate_name: "Thí sinh A",
        candidate_unit: "Đơn vị A",
        status: "issued",
        completed_modules: 0,
        subjects: [{ moduleId: "dvor-1150a", position: 1 }],
      }, {
        code_hash: hashScenarioExamCode("WXYZ2345JKLM"),
        code_ciphertext: null,
        code_hint: "JKLM",
        candidate_name: "Thí sinh B",
        candidate_unit: "Đơn vị B",
        status: "submitted",
        completed_modules: 1,
        subjects: [{ moduleId: "dme-1119a", position: 1 }],
      }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await GET(new Request(`http://localhost/api/scenario-exams/${examId}/codes.pdf`), { params: Promise.resolve({ examId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toContain(`${examId}-codes.pdf`);
    expect(mocks.buildScenarioExamCodesPdf).toHaveBeenCalledWith(expect.objectContaining({
      exam: expect.objectContaining({ name: "Kỳ thi kiểm thử" }),
      rows: [
        expect.objectContaining({ code, candidateName: "Thí sinh A" }),
        expect.objectContaining({ code: null, codeHint: "JKLM", candidateName: "Thí sinh B" }),
      ],
    }));
    expect(mocks.queryDatabase.mock.calls[2]?.[1]).toEqual([examId, "admin-1", 2, 1, 1]);
    expect(JSON.stringify(mocks.queryDatabase.mock.calls[2]?.[1])).not.toContain(code);
  });

  it("rejects non-admin callers before reading roster data", async () => {
    mocks.getCurrentProfile.mockResolvedValue({ id: "student-1", role: "student" });

    const response = await GET(new Request(`http://localhost/api/scenario-exams/${examId}/codes.pdf`), { params: Promise.resolve({ examId }) });

    expect(response.status).toBe(403);
    expect(mocks.queryDatabase).not.toHaveBeenCalled();
  });
});

afterAll(() => {
  if (previousKey === undefined) delete process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY;
  else process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY = previousKey;
});
