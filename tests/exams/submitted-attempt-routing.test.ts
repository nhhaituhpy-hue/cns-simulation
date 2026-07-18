import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  getOfficialExamScenario: vi.fn(),
  getStudentAttemptItem: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/profile", () => ({
  getCurrentProfile: mocks.getCurrentProfile,
}));

vi.mock("@/lib/exams/queries", () => ({
  getOfficialExamScenario: mocks.getOfficialExamScenario,
  getStudentAttemptItem: mocks.getStudentAttemptItem,
}));

vi.mock("@/components/dme/student/dme-student-session", () => ({ DmeStudentSession: () => null }));
vi.mock("@/components/qcms/scenario-monitor-view", () => ({ ScenarioMonitorView: () => null }));
vi.mock("@/components/terminal/terminal-session", () => ({ TerminalSession: () => null }));
vi.mock("@/components/vor/student/vor-student-session", () => ({ VorStudentSession: () => null }));

import OfficialExamScenarioPage from "@/app/student/exams/[examId]/subjects/[candidateSubjectId]/scenarios/[attemptItemId]/page";
import OfficialExamTerminalPage from "@/app/student/exams/[examId]/subjects/[candidateSubjectId]/scenarios/[attemptItemId]/terminal/page";

const examId = "10000000-0000-4000-8000-000000000001";
const candidateSubjectId = "20000000-0000-4000-8000-000000000001";
const attemptItemId = "30000000-0000-4000-8000-000000000001";
const returnHref = `/student/exams/${examId}/subjects/${candidateSubjectId}`;

function submittedItem(moduleCode: "vor" | "ads-b") {
  return {
    id: attemptItemId,
    examId,
    candidateSubjectId,
    moduleCode,
    status: "submitted",
    returnHref,
  };
}

describe("submitted official exam routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentProfile.mockResolvedValue({ id: "student-id", role: "student" });
    mocks.redirect.mockImplementation((href: string) => {
      throw new Error(`NEXT_REDIRECT:${href}`);
    });
  });

  it("returns a submitted VOR/DME scenario to the subject progress page", async () => {
    mocks.getStudentAttemptItem.mockResolvedValue(submittedItem("vor"));

    await expect(OfficialExamScenarioPage({
      params: Promise.resolve({ examId, candidateSubjectId, attemptItemId }),
      searchParams: Promise.resolve({}),
    })).rejects.toThrow(`NEXT_REDIRECT:${returnHref}`);

    expect(mocks.redirect).toHaveBeenCalledWith(returnHref);
    expect(mocks.getOfficialExamScenario).not.toHaveBeenCalled();
  });

  it("returns a submitted ADS-B terminal attempt to the subject progress page", async () => {
    mocks.getStudentAttemptItem.mockResolvedValue(submittedItem("ads-b"));

    await expect(OfficialExamTerminalPage({
      params: Promise.resolve({ examId, candidateSubjectId, attemptItemId }),
      searchParams: Promise.resolve({}),
    })).rejects.toThrow(`NEXT_REDIRECT:${returnHref}`);

    expect(mocks.redirect).toHaveBeenCalledWith(returnHref);
    expect(mocks.getOfficialExamScenario).not.toHaveBeenCalled();
  });
});
