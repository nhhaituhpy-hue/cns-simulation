// @vitest-environment node
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentProfile } from "@/lib/auth/profile";
import { readPracticeHint } from "@/lib/ai/feedback/practice-hints";
import type { PracticeHintResult } from "@/lib/ai/feedback/practice-hints-worker";
import { GET } from "@/app/api/ai/practice-hints/route";

vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDatabasePool: vi.fn(() => ({})) }));
vi.mock("@/lib/ai/feedback/practice-hints", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/ai/feedback/practice-hints")>(),
  readPracticeHint: vi.fn(),
}));

const jobId = "33333333-3333-4333-8333-333333333333";
const answer = "Monitor đối chiếu giá trị đo với ngưỡng đã cấu hình.";
const nativeAnswer: PracticeHintResult = {
  sourceMode: "knowledge-only", kind: "answer", answer,
  summary: "Nguồn đã đối chiếu", nextSteps: [], notice: "Không phải chấm bài",
  references: [{ id: "reference", documentId: "manual", documentName: "DVOR1150A.pdf", sha256: "a".repeat(64), segmentLabel: "Trang 12", quote: answer, sourceKind: "uploaded" }],
};
const request = (version?: string) => new Request(`http://localhost/api/ai/practice-hints?jobId=${jobId}`, {
  headers: version === undefined ? {} : { "X-CNS-Hint-Version": version },
});

// Faithful validator and answer-bearing render seam from the still-open browser
// at e229d92: it only accepts the old source modes and renders nextSteps, not answer.
function renderLegacyHint(value: unknown) {
  const result = value as PracticeHintResult | undefined;
  if (!result || !["ai-assisted", "deterministic-only"].includes(result.sourceMode)
    || typeof result.summary !== "string" || !Array.isArray(result.nextSteps)
    || !result.nextSteps.every(step => typeof step === "string") || typeof result.notice !== "string") {
    throw Error("Kết quả gợi ý không hợp lệ.");
  }
  return renderToStaticMarkup(createElement("ul", null,
    ...result.nextSteps.map((step, index) => createElement("li", { key: index }, step))));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentProfile).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
  vi.mocked(readPracticeHint).mockResolvedValue({ jobId, status: "completed", result: nativeAnswer });
});

describe("rolling practice hint DTO compatibility", () => {
  it("lets a still-open baseline browser accept and render a new worker's knowledge answer", async () => {
    const response = await GET(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(renderLegacyHint(body.result)).toContain(answer);
    expect(body).toEqual({ jobId, status: "completed", result: {
      sourceMode: "deterministic-only", summary: nativeAnswer.summary,
      nextSteps: [answer], notice: nativeAnswer.notice,
    } });
    expect(readPracticeHint).toHaveBeenCalledWith({}, "11111111-1111-4111-8111-111111111111", jobId);
    expect(nativeAnswer.nextSteps).toEqual([]);
    expect(nativeAnswer.sourceMode).toBe("knowledge-only");
  });

  it("returns the complete native answer only to the exact version 2 capability header", async () => {
    const response = await GET(request("2"));
    expect(await response.json()).toEqual({ jobId, status: "completed", result: nativeAnswer });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it.each(["", "1", "02", "3", "2, 1"])("keeps unsupported version %j on the legacy DTO", async version => {
    const response = await GET(request(version));
    const { result } = await response.json();
    expect(renderLegacyHint(result)).toContain(answer);
    expect(Object.keys(result).sort()).toEqual(["nextSteps", "notice", "sourceMode", "summary"]);
  });

  it("projects an AI-assisted answer into the answer-bearing field the old browser renders", async () => {
    vi.mocked(readPracticeHint).mockResolvedValue({ jobId, status: "completed", result: {
      ...nativeAnswer, sourceMode: "ai-assisted", nextSteps: ["A step is not the answer"],
    } });
    const { result } = await (await GET(request())).json();
    expect(result.sourceMode).toBe("ai-assisted");
    expect(result.nextSteps).toEqual([answer]);
    expect(renderLegacyHint(result)).toContain(answer);
  });

  it.each([undefined, "2"])("keeps an old worker's legacy result valid for capability %j", async version => {
    const legacyResult = { sourceMode: "deterministic-only" as const, summary: "Legacy summary", nextSteps: ["Đối chiếu Monitor"], notice: "Legacy notice" };
    vi.mocked(readPracticeHint).mockResolvedValue({ jobId, status: "completed", result: legacyResult });
    expect(await (await GET(request(version))).json()).toEqual({ jobId, status: "completed", result: legacyResult });
  });

  it.each(["queued", "running", "failed"] as const)("keeps %s jobs free of projected results", async status => {
    vi.mocked(readPracticeHint).mockResolvedValue({ jobId, status });
    expect(await (await GET(request())).json()).toEqual({ jobId, status });
  });

  it("does not add a query/body version field that the old route would reject", async () => {
    const response = await GET(new Request(`http://localhost/api/ai/practice-hints?jobId=${jobId}&hintVersion=2`));
    expect(response.status).toBe(400);
    expect(readPracticeHint).not.toHaveBeenCalled();
  });
});
