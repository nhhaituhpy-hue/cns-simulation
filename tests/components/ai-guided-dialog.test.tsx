import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AiScenarioDialog } from "@/components/scenario/ai-scenario-dialog";
import { authoringStateDto, createAuthoringState, applyAnalysisProposal, mutateAuthoringState, validateFinalAuthoring } from "@/lib/ai/scenario-authoring/state";
import type { AuthoringSession } from "@/lib/ai/scenario-authoring/types";
import { nativeBlueprintFixture } from "../helpers/native-blueprint";

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
const reply = (payload: unknown) => new Response(JSON.stringify(payload));
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
  vi.stubGlobal("fetch", vi.fn(async () => reply({ jobs: [], sessions: [] })));
});
afterEach(() => {
  cleanup(); vi.unstubAllGlobals();
  for (const [key, descriptor] of [["showModal", originalShowModal], ["close", originalClose]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});

it("opens the real document-first guided wizard, not the old one-shot prompt form", async () => {
  const user = userEvent.setup();
  render(<AiScenarioDialog moduleId="dme-320" />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Mô tả tình huống" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Tải tài liệu" }));
  expect(screen.getByRole("heading", { name: "Tải tài liệu" })).toBeVisible();
  expect(screen.getByRole("button", { name: "AI soạn kịch bản" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Bắt đầu tạo" })).not.toBeInTheDocument();
  expect(vi.mocked(fetch).mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
});

it("only notifies the workspace after real blueprint confirmation and final source validation", async () => {
  let saved: AuthoringSession = { id: "draft-1", actorId: "test-admin", moduleId: "dme-320", status: "editing", revision: 3, documents: [], scenarioRowId: null, scenarioId: null, createdAt: "now", updatedAt: "now", state: { ...createAuthoringState("dme-320", "scenario-1"), mode: "description" } };
  saved.state = applyAnalysisProposal(saved.state, { id: "p1", baseRevision: 2, kind: "blueprint", blueprint: nativeBlueprintFixture("dme-320"), message: "Test fixture verified by native replay.", changes: [], issues: [], coverage: { documents: 1, charactersRead: 100, charactersAvailable: 100, truncated: false } });
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("scenario-jobs")) return reply({ jobs: [] });
    if (url.includes("?moduleId=")) return reply({ sessions: [] });
    if (init?.method === "POST" && !url.endsWith("/finalize")) saved.state.context = String((init.body as FormData).get("context") ?? saved.state.context);
    if (init?.method === "PATCH") {
      const body = JSON.parse(init.body as string);
      expect(body.expectedRevision).toBe(saved.revision);
      saved = { ...saved, revision: saved.revision + 1, state: mutateAuthoringState(saved.state, body.mutation) };
    }
    if (url.endsWith("/finalize")) {
      expect(JSON.parse(init!.body as string).expectedRevision).toBe(saved.revision);
      validateFinalAuthoring(saved.state);
      saved = { ...saved, status: "completed", scenarioRowId: "source-1", scenarioId: "scenario-1" };
    }
    return reply({ session: authoringStateDto(saved, null) });
  });
  vi.stubGlobal("fetch", fetcher);
  const done = vi.fn(); const user = userEvent.setup();
  render(<AiScenarioDialog moduleId="dme-320" onCompleted={done} />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.click(screen.getByRole("button", { name: "Mô tả tình huống" }));
  fireEvent.change(screen.getByLabelText("Mô tả tình huống"), { target: { value: "Luyện khôi phục máy phát." } });
  await user.click(screen.getByRole("button", { name: "AI soạn kịch bản" }));
  expect(done).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Lưu kịch bản" }));
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  expect(done).toHaveBeenCalledWith(expect.objectContaining({ name: "Bài tập kiểm chứng dme-320", status: "completed", scenarioRowId: "source-1" }));
  expect(screen.getByText("Đã tạo kịch bản · Chưa xuất bản")).toBeVisible();
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(1);
  expect(fetcher.mock.calls.some(([url]) => /publish|library/.test(url))).toBe(false);
});

it("keeps old job history read-only inside the modal and restores focus when closed", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => reply(url.includes("scenario-authoring") ? { sessions: [] } : { jobs: [{ id: "old-job", moduleId: "dme-320", name: "Historical draft", status: "completed", phase: "completed", scenarioRowId: "old-source", createdAt: "now", updatedAt: "now" }] })));
  const user = userEvent.setup();
  render(<AiScenarioDialog moduleId="dme-320" />);
  const trigger = screen.getByRole("button", { name: "Tạo kịch bản bằng AI" });
  trigger.focus();
  await user.click(trigger);
  await user.click(screen.getByRole("button", { name: "Tải tài liệu" }));
  await user.click(screen.getByText("Lịch sử yêu cầu AI trước đây"));
  expect(await screen.findByText("Historical draft")).toBeVisible();
  expect(within(screen.getByRole("dialog")).getByRole("link", { name: "Mở kịch bản cũ để kiểm tra" })).toHaveAttribute("href", "/simulator/software/dme-320?scenarioId=old-source");
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
  expect(screen.queryByText("Historical draft")).not.toBeInTheDocument();
  expect(vi.mocked(fetch).mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
});
