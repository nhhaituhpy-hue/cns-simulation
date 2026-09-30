// @vitest-environment node
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildScenarioExamCodesPdf } from "@/lib/scenario-exams/pdf";

describe("Scenario Exam roster PDF", () => {
  it("renders a Vietnamese multi-page roster with the required columns", async () => {
    const pdf = await buildScenarioExamCodesPdf({
      exam: {
        name: "Năng định đợt 2 năm 2026",
        description: "Danh sách phát mã dự thi cho hội đồng kiểm tra.",
        opensAt: "2026-11-20T00:00:00.000Z",
        closesAt: "2026-11-22T10:00:00.000Z",
        durationMinutes: 60,
      },
      exportedAt: "2026-09-30T14:00:00.000Z",
      rows: Array.from({ length: 38 }, (_, index) => ({
        candidateName: index === 0 ? "Nguyễn Hoàng Hải" : `Thí sinh kiểm thử ${index + 1}`,
        candidateUnit: index === 0 ? "Đài DVOR/DME Tuy Hòa" : "Đơn vị kiểm tra có tên dài để kiểm tra xuống dòng trong bảng PDF",
        code: index % 3 === 0 ? "ABCD2345EFGH" : null,
        codeHint: "EFGH",
        moduleNames: ["DVOR 1150A", "DME 1119A"],
        completedModules: index % 3,
        status: index % 4 === 0 ? "issued" : "in_progress",
      })),
    });

    expect(pdf.subarray(0, 8).toString("ascii")).toBe("%PDF-1.3");
    expect(pdf.length).toBeGreaterThan(10_000);
    if (process.env.SCENARIO_EXAM_PDF_QA === "1") {
      const directory = resolve(process.cwd(), "tmp", "pdfs");
      mkdirSync(directory, { recursive: true });
      writeFileSync(resolve(directory, "scenario-exam-roster-test.pdf"), pdf);
    }
  });
});
