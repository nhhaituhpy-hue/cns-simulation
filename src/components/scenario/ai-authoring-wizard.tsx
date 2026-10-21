"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSimulatorModule } from "@/modules/core/registry";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { AuthoringSessionDto, AuthoringMutation, JsonValue, AuthoringIssue } from "@/lib/ai/scenario-authoring/types";
import { AiAuthoringSummary } from "./ai-authoring-summary";
import { AiAuthoringAssistant } from "./ai-authoring-assistant";
import {
  AiAuthoringField,
  authoringInputClass,
  authoringCardClass,
  authoringBtnOrangeClass,
  authoringBtnBlueClass,
  authoringBtnGrayClass,
  valueLabel,
  sourceLabel,
} from "./ai-authoring-field";
const api = "/api/ai/scenario-authoring";
export function AiAuthoringWizard({
  moduleId,
  initialMode,
  onClose,
  onCompleted,
  registerClose,
}: {
  moduleId: ScenarioParametersModuleId;
  initialMode?: "documents" | "native";
  onCompleted?: (session: AuthoringSessionDto) => void | Promise<void>;
  onClose?: () => void;
  registerClose?: (handler: (() => Promise<boolean>) | null) => void;
}) {
  const fileInputId = useId();
  const uploadAttempt = useRef<{ key: string; body: FormData; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeAutoStarted = useRef(false);
  const [uploadUncertain, setUploadUncertain] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const finalizeAttempt = useRef<{ key: string; body: string } | null>(null);
  const [finalUncertain, setFinalUncertain] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [context, setContext] = useState("");
  const [session, setSession] = useState<AuthoringSessionDto | null>(null);
  const current = useRef<AuthoringSessionDto | null>(null);
  const [dirty, setDirty] = useState<Record<string, JsonValue>>({});
  const dirtyRef = useRef<Record<string, JsonValue>>({});
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState("documents");
  const [history, setHistory] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [listError, setListError] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [question, setQuestion] = useState("");
  const [paused, setPaused] = useState(false);
  const [pollToken, setPollToken] = useState(0);
  const pending = session?.analysis?.status === "queued" || session?.analysis?.status === "running";
  const sessionId = session?.id;
  const analysisId = session?.analysis?.id;
  useEffect(() => {
    if (!pending || !sessionId) return;
    let stopped = false; let count = 0;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    setPaused(false);
    async function poll() {
      if (stopped) return;
      if (lock.current) { timer = setTimeout(() => void poll(), 3000); return; }
      controller = new AbortController();
      const deadline = setTimeout(() => controller?.abort(), 15000);
      try {
        const response = await fetch(`${api}/${encodeURIComponent(sessionId!)}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("poll");
        const payload = await response.json();
        const next: AuthoringSessionDto = payload.session;
        if (!stopped && next?.id === current.current?.id && next.moduleId === moduleId && next.revision >= current.current.revision && !lock.current) { current.current = next; setSession(next); }
        if (next?.analysis && !["queued", "running"].includes(next.analysis.status)) return;
      } catch { if (!stopped) setError("Chưa tải được tiến độ AI. Công việc vẫn ở máy chủ; bản chỉnh được giữ lại."); }
      finally { clearTimeout(deadline); }
      if (stopped) return;
      count += 1;
      if (count >= 200) { setPaused(true); return; }
      timer = setTimeout(() => void poll(), 3000);
    }
    timer = setTimeout(() => void poll(), 3000);
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
  }, [pending, sessionId, analysisId, moduleId, pollToken]);
  useEffect(() => {
    const node = fileInputRef.current;
    if (!node) return;
    const onNativeCancel = (event: Event) => {
      event.stopPropagation();
      const dlg = node.closest("dialog");
      if (dlg) setTimeout(() => { delete dlg.dataset.filePickerActive; }, 400);
    };
    node.addEventListener("cancel", onNativeCancel);
    return () => node.removeEventListener("cancel", onNativeCancel);
  }, [step, session?.status]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${api}?moduleId=${encodeURIComponent(moduleId)}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("history");
      const payload = await response.json();
      if (!controller.signal.aborted) setHistory(payload.sessions ?? []);
    }).catch(() => { if (!controller.signal.aborted) setListError(true); });
    return () => controller.abort();
  }, [moduleId]);
  const accept = (next: AuthoringSessionDto) => { current.current = next; setSession(next); };
  function edit(id: string, value: JsonValue) { dirtyRef.current = { ...dirtyRef.current, [id]: value }; setDirty(dirtyRef.current); setSaved(false); }
  async function request(url: string, init: RequestInit): Promise<AuthoringSessionDto> {
    let response: Response;
    try { response = await fetch(url, init); } catch { throw new Error("Chưa nhận được xác nhận từ máy chủ. Hãy gửi lại yêu cầu; bản chỉnh và mã yêu cầu được giữ nguyên."); }
    const payload = await response.json();
    if (!response.ok && response.status >= 400 && response.status < 500 && response.status !== 408) { finalizeAttempt.current = null; setFinalUncertain(false); uploadAttempt.current = null; setUploadUncertain(false); }
    if (response.status === 409) { setConflict(true); throw new Error("Có phiên khác đã thay đổi bản nháp. Tải lại phiên mới trước khi lưu; bản chỉnh của bạn vẫn được giữ."); }
    if (!response.ok) {
      const issues = Array.isArray(payload.issues) ? payload.issues.filter((issue: AuthoringIssue) => typeof issue.message === "string") as AuthoringIssue[] : [];
      throw new Error(issues.length ? issues.map((issue) => issue.message.slice(0, 400)).join(" · ") : response.status === 401 || response.status === 403 ? "Phiên đăng nhập hoặc quyền tạo kịch bản không còn hợp lệ. Kiểm tra đăng nhập; bản chỉnh vẫn được giữ." : payload.code === "PROVIDER_NOT_CONFIGURED" || payload.code === "PROVIDER_CONFIGURATION" ? "AI chưa được cấu hình. Liên hệ quản trị viên; bản nháp và tài liệu vẫn được giữ." : "Không lưu được bản nháp. Kiểm tra thông tin và thử lại; phần chỉnh sửa vẫn được giữ.");
    }
    if (!payload.session || payload.session.moduleId !== moduleId) throw new Error("Phản hồi không đúng thiết bị. Hãy tải lại.");
    accept(payload.session); return payload.session;
  }
  async function run(task: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(null);
    try { await task(); } catch (problem) { setError(problem instanceof Error ? problem.message : "Chưa kết nối được máy chủ. Hãy thử lại."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function patch(mutation: AuthoringMutation) {
    return request(`${api}/${encodeURIComponent(current.current!.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: current.current!.revision, mutation }) });
  }
  async function save(ids?: string[]) {
    if (conflict || finalUncertain || uploadUncertain) throw new Error("Tải lại phiên mới trước khi lưu. Bản chỉnh của bạn vẫn được giữ.");
    const changes = Object.entries(dirtyRef.current).filter(([id]) => !ids || ids.includes(id)).map(([fieldId, value]) => ({ fieldId, value }));
    if (changes.length) {
      if(pending)throw new Error("AI đang đọc bản nháp hiện tại. Chờ kết quả rồi lưu phần chỉnh sửa để không làm mất ngữ cảnh.");
      await patch({ action: "edit", changes });
      const remaining = { ...dirtyRef.current }; for (const change of changes) delete remaining[change.fieldId]; dirtyRef.current = remaining; setDirty(remaining);
    }
    setSaved(true);
  }
  async function navigate(next: string, confirm = false) {
    if (conflict || finalUncertain || uploadUncertain || pending) return;
    await save();
    if (confirm) await patch({ action: "confirm", sectionId: step });
    await patch({ action: "navigate", sectionId: next }); setStep(next);
  }
  function selectFiles(selected: File[]) {
    setFiles(selected);
    setFileError(selected.some((file) => !file.size) ? "Không thể dùng tệp trống." : selected.length > 5 ? "Chỉ chọn tối đa 5 tệp." : selected.some((file) => !/\.(pdf|docx|txt|md)$/i.test(file.name)) ? "Chỉ dùng PDF, DOCX, TXT hoặc MD." : selected.some((file) => file.size > 10 * 1024 * 1024) ? "Mỗi tệp tối đa 10 MiB." : selected.reduce((sum, file) => sum + file.size, 0) > 25 * 1024 * 1024 ? "Tổng tài liệu tối đa 25 MiB." : null);
  }
  async function submitUpload() {
    const attempt = uploadAttempt.current!;
    setUploadUncertain(true);
    const next = await request(attempt.url, { method: "POST", headers: { "Idempotency-Key": attempt.key }, body: attempt.body });
    uploadAttempt.current = null; setUploadUncertain(false); setFiles([]);
    return next;
  }
  async function create(native = false) {
    if (!uploadAttempt.current) {
      const body = new FormData(); body.set("moduleId", moduleId); body.set("context", context);
      if (!native) for (const file of files) body.append("files", file);
      uploadAttempt.current = { url: api, key: crypto.randomUUID(), body };
    }
    const next = await submitUpload(); setStep(next.currentStep);
  }
  useEffect(() => {
    if (initialMode === "native" && !nativeAutoStarted.current && !current.current) {
      nativeAutoStarted.current = true;
      void run(() => create(true));
    }
  });
  async function analyze(kind: "baseline" | "guidance", prompt?: string) {
    if (!uploadAttempt.current) {
      await save();
      const body = new FormData(); body.set("expectedRevision", String(current.current!.revision)); body.set("kind", kind);
      body.set("question", kind === "guidance" ? prompt ?? question : context);
      if (kind === "guidance") body.set("sectionId", step);
      if (kind === "baseline") for (const file of files) body.append("files", file);
      uploadAttempt.current = { url: `${api}/${encodeURIComponent(current.current!.id)}/analysis`, key: crypto.randomUUID(), body };
    }
    await submitUpload();
  }
  async function applySelectedProposal(ids: string[]) {
    const proposal=current.current?.proposal;if(!proposal)return;
    const fieldsToKeep=Object.entries(dirtyRef.current).filter(([id])=>!ids.includes(id));
    // The explicit diff approval takes precedence over only the selected local edits.
    await patch({action:"apply-proposal",proposalId:proposal.id,fieldIds:ids});
    dirtyRef.current=Object.fromEntries(fieldsToKeep);setDirty(dirtyRef.current);
    if(fieldsToKeep.length)await save();
  }
  async function dismissProposal() {
    const proposal=current.current?.proposal;if(!proposal)return;
    await patch({action:"dismiss-proposal",proposalId:proposal.id});
    await save();
  }
  useEffect(()=>{
    registerClose?.(async()=>{
      if(lock.current||uploadUncertain||finalUncertain)return false;
      let ready=false;await run(async()=>{if(current.current?.status==="editing")await save();ready=true;});return ready;
    });
    return()=>registerClose?.(null);
  });
  async function resetField(fieldId: string) {
    if (conflict || uploadUncertain) return;
    await patch({ action: "reset-field", fieldId });
    const remaining = { ...dirtyRef.current }; delete remaining[fieldId]; dirtyRef.current = remaining; setDirty(remaining);
  }
  function resetToCleanStart() {
    current.current = null;
    setSession(null);
    dirtyRef.current = {};
    setDirty({});
    uploadAttempt.current = null;
    setUploadUncertain(false);
    finalizeAttempt.current = null;
    setFinalUncertain(false);
    setFiles([]);
    setFileError(null);
    setContext("");
    setQuestion("");
    setConflict(false);
    setSaved(false);
    setPaused(false);
    setError(null);
    setStep("documents");
  }
  async function deleteSession(targetId: string) {
    const response = await fetch(`${api}/${encodeURIComponent(targetId)}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      throw new Error("Không xóa được phiên tạo kịch bản. Hãy thử lại.");
    }
    setHistory((prev) => prev.filter((item) => item.id !== targetId));
    if (current.current?.id === targetId) {
      resetToCleanStart();
    }
  }
  async function finalize() {
    if (!current.current || step !== "confirmation" || pending || conflict || Object.keys(dirtyRef.current).length || current.current.issues.some((issue) => issue.severity === "error") || current.current.preview.status === "invalid" || !current.current.form.sections.every((section) => current.current!.confirmedSections.includes(section.id))) return;
    if (!finalizeAttempt.current) finalizeAttempt.current = { key: crypto.randomUUID(), body: JSON.stringify({ expectedRevision: current.current.revision }) };
    setFinalUncertain(true);
    const next = await request(`${api}/${encodeURIComponent(current.current.id)}/finalize`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": finalizeAttempt.current.key }, body: finalizeAttempt.current.body });
    if (next.status !== "completed") throw new Error("Máy chủ chưa xác nhận hoàn tất. Thử lại cùng yêu cầu.");
    setFinalUncertain(false); finalizeAttempt.current = null;
    try { await onCompleted?.(next); } catch { setError("Kịch bản đã tạo nhưng danh sách chưa tải lại. Hãy tải lại trang; không tạo lại kịch bản."); }
  }
  if (session?.status === "completed") {
    const route = getSimulatorModule(moduleId)?.routes.simulator;
    const href = moduleId === "ads-b" ? session.scenarioId ? `/authoring/ads-b/edit?id=${encodeURIComponent(session.scenarioId)}` : null : route && session.scenarioRowId ? `${route}?scenarioId=${encodeURIComponent(session.scenarioRowId)}` : null;
    return <section aria-label="Kịch bản đã tạo" className={`${authoringCardClass} grid gap-3`}><h3 className="font-semibold">Đã tạo kịch bản · Chưa xuất bản</h3><p className="text-sm">Giám khảo kiểm tra kịch bản trước khi đưa vào Ôn tập hoặc Kỳ thi. Chưa tự áp dụng vào simulator.</p>{error ? <p role="alert">{error}</p> : null}<div className="flex flex-wrap items-center gap-2 text-xs"><a className={`${authoringBtnBlueClass} inline-flex items-center no-underline`} href={`${api}/${encodeURIComponent(session.id)}/download`} download>Tải JSON đầy đủ</a>{href ? <a className={`${authoringBtnOrangeClass} inline-flex items-center no-underline`} href={href}>Mở trong simulator</a> : null}<Button size="sm" className={authoringBtnGrayClass} disabled={busy} onClick={() => void run(() => deleteSession(session.id))}>Xóa & tạo lại từ đầu</Button>{onClose ? <Button size="sm" className={authoringBtnGrayClass} onClick={onClose}>Đóng</Button> : null}</div></section>;
  }
  const sections = session?.form.sections ?? [];
  const section = sections.find((item) => item.id === step);
  const fields = session?.form.fields.filter((field) => field.sectionId === step) ?? [];
  const groups = [...new Set(fields.map((field) => field.group))];
  const steps = ["documents", ...sections.map((item) => item.id), "confirmation"];
  return (
    <section aria-label="Trình tạo kịch bản từng bước" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 text-[var(--cns-text-primary)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cns-border-subtle)] pb-2.5">
        <div>
          <h3 className="text-base font-semibold">{session ? session.form.label : "Tải tài liệu để AI chuẩn bị thông số"}</h3>
          <p className="mt-0.5 text-xs text-[var(--cns-text-secondary)]">
            {session ? saved ? "Đã lưu nháp trên máy chủ" : Object.keys(dirty).length ? "Có thay đổi chưa lưu" : "Bản nháp trên máy chủ · Chưa tạo kịch bản" : getSimulatorModule(moduleId)?.name ?? moduleId}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {session ? (
            <Button size="sm" className={authoringBtnGrayClass} disabled={busy || uploadUncertain || finalUncertain} onClick={() => void run(() => deleteSession(session.id))}>
              Xóa & tạo lại từ đầu
            </Button>
          ) : null}
          {onClose ? <Button size="sm" className={authoringBtnGrayClass} disabled={busy} onClick={() => void run(async () => { if (current.current) await save(); onClose(); })}>Đóng</Button> : null}
        </div>
      </header>

      <div
        data-testid="authoring-wizard-columns"
        className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]"
      >
        <aside role="region" aria-label="Menu tính năng tạo kịch bản" className="grid min-w-0 gap-3 lg:sticky lg:top-2">
          <div className={`${authoringCardClass} grid gap-2`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cns-text-secondary)]">
              Menu tính năng
            </p>
            {session ? (
              <nav aria-label="Các bước tạo kịch bản" className="grid gap-1.5">
                {steps.map((id) => {
                  const isCurrent = step === id;
                  const isSection = sections.some((item) => item.id === id);
                  const hasError = isSection && session.issues.some((issue) => issue.sectionId === id && issue.severity === "error");
                  const isConfirmed = isSection && session.confirmedSections.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={busy || pending || uploadUncertain || finalUncertain}
                      aria-current={isCurrent ? "step" : undefined}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                        isCurrent
                          ? "border-[#0369a1] bg-[#0369a1] font-semibold text-white shadow-2xs"
                          : "border-[#cbd5e1] bg-[#f8fafc] text-[#334155] hover:bg-[#e2e8f0]"
                      } disabled:opacity-50`}
                      onClick={() => void run(() => navigate(id))}
                    >
                      <span>{id === "documents" ? "Tài liệu" : id === "confirmation" ? "Xác nhận" : sections.find((item) => item.id === id)?.title}</span>
                      {isSection ? (
                        <span
                          className={`mt-0.5 block text-[11px] font-normal ${
                            isCurrent
                              ? "text-sky-100"
                              : hasError
                                ? "text-[#ea580c]"
                                : isConfirmed
                                  ? "text-emerald-700"
                                  : "text-[var(--cns-text-secondary)]"
                          }`}
                        >
                          {hasError ? "Cần bổ sung" : isConfirmed ? "Đã xác nhận" : "Chưa xác nhận"}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            ) : (
              <div className="grid gap-1.5">
                <div className="rounded-lg border border-[#0369a1] bg-[#0369a1] px-2.5 py-2 text-xs font-semibold text-white">
                  1. Tài liệu & Khởi tạo
                </div>
                <p className="text-[11px] leading-relaxed text-[var(--cns-text-secondary)]">
                  Các mục thông số thiết bị, lỗi giả lập, quyền chỉnh sửa và tiêu chí hoàn thành sẽ hiển thị tại đây sau khi khởi tạo bản nháp.
                </p>
              </div>
            )}
          </div>

          {listError ? <p role="status" className="text-xs text-[var(--cns-text-secondary)]">Chưa tải được lịch sử bản nháp. Đóng và mở lại để thử lại.</p> : null}
          {!session && history.length ? (
            <details open aria-label="Bản nháp đã lưu" className={authoringCardClass}>
              <summary className="cursor-pointer text-xs font-semibold">Tiếp tục bản nháp trên máy chủ</summary>
              <ul className="mt-2 grid gap-2">
                {history.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-[var(--cns-border-subtle)] bg-[var(--cns-surface-card-subtle)] p-2 text-xs">
                    <span className="break-words">{item.name} · {item.status === "completed" ? "Đã tạo, chưa xuất bản" : "Bản nháp"}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button size="sm" className={authoringBtnBlueClass} aria-label={`Tiếp tục: ${item.name}`} disabled={busy} onClick={() => void run(async () => { const next = await request(`${api}/${encodeURIComponent(item.id)}`, { cache: "no-store" }); setStep(next.currentStep); })}>Tiếp tục</Button>
                      <Button size="sm" className={authoringBtnGrayClass} aria-label={`Xóa bản nháp: ${item.name}`} disabled={busy} onClick={() => void run(() => deleteSession(item.id))}>Xóa</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {session?.form.notices.length ? (
            <details className={`${authoringCardClass} text-xs text-[var(--cns-text-secondary)]`}>
              <summary className="cursor-pointer font-medium text-[var(--cns-text-primary)]">Phạm vi mô phỏng và trường được bảo vệ</summary>
              <ul className="mt-2 grid gap-1 break-words">{session.form.notices.map((notice, index) => <li key={index}>{notice}</li>)}</ul>
            </details>
          ) : null}
        </aside>

        <div role="region" aria-label="Nội dung tính năng" className="grid min-w-0 gap-3">
          {error || fileError ? <p role="alert" className="rounded-lg border border-red-300 bg-red-50/80 p-2.5 text-xs text-red-900">{fileError ?? error}</p> : null}
          {uploadUncertain ? <Button size="sm" className={`${authoringBtnOrangeClass} w-fit`} disabled={busy} onClick={() => void run(async () => { const next = await submitUpload(); if (!session) setStep(next.currentStep); })}>Gửi lại yêu cầu</Button> : null}
          {conflict ? <Button size="sm" className={`${authoringBtnBlueClass} w-fit`} disabled={busy} onClick={() => void run(async () => { await request(`${api}/${encodeURIComponent(current.current!.id)}`, { cache: "no-store" }); setConflict(false); })}>Tải lại phiên mới, giữ bản chỉnh</Button> : null}

          {step === "documents" ? (
            <div className={`${authoringCardClass} grid gap-3.5`}>
              <p className="text-xs leading-relaxed">Dùng manual hoặc tài liệu thông số của đúng thiết bị. Tài liệu chỉ chuẩn bị giá trị nền cho bản nháp này, không thay mặc định toàn hệ thống.</p>
              <div className="grid gap-1.5">
                <label htmlFor={fileInputId} className="text-xs font-semibold text-[var(--cns-text-primary)]">
                  Tài liệu thông số nền
                </label>
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.md"
                  className="sr-only"
                  disabled={busy || uploadUncertain}
                  onClick={(event) => {
                    const dlg = event.currentTarget.closest("dialog");
                    if (dlg) dlg.dataset.filePickerActive = "true";
                  }}
                  onChange={(event) => {
                    const dlg = event.currentTarget.closest("dialog");
                    if (dlg) setTimeout(() => { delete dlg.dataset.filePickerActive; }, 400);
                    selectFiles(Array.from(event.currentTarget.files ?? []));
                  }}
                />
                <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                  <button
                    type="button"
                    disabled={busy || uploadUncertain}
                    onClick={(event) => {
                      const dlg = event.currentTarget.closest("dialog");
                      if (dlg) dlg.dataset.filePickerActive = "true";
                      fileInputRef.current?.click();
                    }}
                    className={`${authoringBtnBlueClass} cursor-pointer select-none shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0.5 active:scale-95 active:brightness-90`}
                  >
                    Chọn tệp
                  </button>
                  <div
                    role="status"
                    aria-live="polite"
                    data-testid="selected-files-status"
                    className="min-w-[14rem] flex-1 rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-3 py-1.5 text-xs text-[var(--cns-text-secondary)]"
                  >
                    {files.length
                      ? `Đã chọn ${files.length} tệp: ${files.map((file) => file.name).join(", ")}`
                      : "Không có tệp nào được chọn"}
                  </div>
                </div>
              </div>
              {session?.documents.length ? <ul aria-label="Tài liệu đã lưu" className="grid gap-1 text-xs">{session.documents.map((document, index) => <li key={index}>{document.name}</li>)}</ul> : null}
              {files.length ? <ul className="text-xs">{files.map((file, i) => <li key={i} className="break-all">{file.name}</li>)}</ul> : null}
              <label className="grid gap-1 text-xs font-medium">Phạm vi tài liệu (không bắt buộc)<input value={context} maxLength={2000} className={authoringInputClass} disabled={busy || uploadUncertain} onChange={(event) => setContext(event.currentTarget.value)} /></label>
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--cns-border-subtle)]/70 pt-3">
                <a className="text-xs font-medium text-[#0369a1] underline" href={`/templates/ai-scenario-${moduleId}.docx`} download>Tải mẫu thông số nền (.docx)</a>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="primary" className={authoringBtnOrangeClass} disabled={busy || uploadUncertain || pending || conflict || !!session?.proposal || !!fileError || !files.length} onClick={() => void run(() => session ? analyze("baseline") : create())}>
                    {session ? "Phân tích lại tài liệu" : "Phân tích tài liệu và điền biểu mẫu"}
                  </Button>
                  {!session && !initialMode ? (
                    <Button size="sm" className={authoringBtnGrayClass} disabled={busy || uploadUncertain} onClick={() => void run(() => create(true))}>
                      Dùng mặc định simulator
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="text-[11px] text-[var(--cns-text-secondary)]">Nếu dùng mặc định simulator, các giá trị chưa được đối chiếu với tài liệu.</p>
            </div>
          ) : null}

          {section ? (
            <>
              {groups.map((group) => (
                <details key={group} open={groups.length <= 2 || group === groups[0]} aria-label={group} className={`${authoringCardClass} grid gap-3.5`}>
                  <summary className="cursor-pointer text-sm font-semibold">
                    {group} <span className="text-xs font-normal text-[var(--cns-text-secondary)]">· {fields.filter(field => field.group === group).length} trường</span>
                  </summary>
                  {fields.filter((field) => field.group === group).map((field) => (
                    <div key={field.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-lg border border-[var(--cns-border-subtle)]/80 bg-[var(--cns-surface-card-subtle)]/50 p-3">
                      <AiAuthoringField schema={field.schema} value={Object.hasOwn(dirty, field.id) ? dirty[field.id] : field.value} disabled={busy} onChange={(value) => edit(field.id, value)} />
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cns-border-subtle)]/60 pt-2">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-[11px] text-[var(--cns-text-secondary)]">{Object.hasOwn(dirty, field.id) ? "Bạn đã chỉnh · Chưa lưu" : sourceLabel(session!.sources[field.id])}</p>
                          <p className="break-words text-[11px] text-[var(--cns-text-secondary)]">Giá trị nền: {valueLabel(session!.baselineValues[field.id], field.schema)}</p>
                        </div>
                        <Button
                          size="sm"
                          disabled={busy || pending || uploadUncertain || conflict || field.schema.readOnly}
                          aria-label={`Khôi phục nền: ${field.schema.label}`}
                          title={`Khôi phục nền: ${field.schema.label}`}
                          className={authoringBtnGrayClass}
                          onClick={() => void run(async () => { await resetField(field.id); })}
                        >
                          Khôi phục nền
                        </Button>
                      </div>
                      {session!.sources[field.id]?.quote ? <blockquote className="break-words border-l-2 border-[#0284c7] pl-2.5 text-[11px] text-[var(--cns-text-secondary)]">{session!.sources[field.id].quote!.slice(0, 600)}</blockquote> : null}
                    </div>
                  ))}
                  <div className="mt-0.5 flex justify-end border-t border-[var(--cns-border-subtle)]/70 pt-2.5">
                    <Button size="sm" className={authoringBtnBlueClass} disabled={busy || pending} onClick={() => void run(() => save(fields.filter((field) => field.group === group).map((field) => field.id)))}>
                      Lưu nhóm {group}
                    </Button>
                  </div>
                </details>
              ))}
            </>
          ) : null}

          {session && step === "confirmation" ? <AiAuthoringSummary session={session} /> : null}

          {session ? (
            <footer className="mt-0.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[var(--cns-border-subtle)] bg-[var(--cns-surface-card)] px-4 py-3 shadow-2xs">
              <Button size="sm" className={authoringBtnGrayClass} disabled={busy || pending || finalUncertain || step === "documents"} onClick={() => void run(() => navigate(steps[Math.max(0, steps.indexOf(step) - 1)]))}>
                Quay lại
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className={authoringBtnBlueClass} disabled={busy || pending || conflict || finalUncertain} onClick={() => void run(() => save())}>
                  Lưu nháp
                </Button>
                {section ? (
                  <Button size="sm" variant="primary" className={authoringBtnOrangeClass} disabled={busy || pending || uploadUncertain || conflict} onClick={() => void run(() => navigate(steps[steps.indexOf(step) + 1], true))}>
                    Xác nhận bước và tiếp tục
                  </Button>
                ) : step === "confirmation" ? (
                  <Button size="sm" variant="primary" className={authoringBtnOrangeClass} disabled={busy || pending || conflict || !!session.proposal || Object.keys(dirty).length > 0 || session.issues.some((issue) => issue.severity === "error") || session.preview.status === "invalid" || !sections.every((item) => session.confirmedSections.includes(item.id))} onClick={() => void run(finalize)}>
                    Hoàn tất tạo kịch bản
                  </Button>
                ) : null}
              </div>
            </footer>
          ) : null}
        </div>

        <aside role="region" aria-label="Mô tả và gợi ý từ AI" className="grid min-w-0 gap-3 lg:sticky lg:top-2">
          <div className={`${authoringCardClass} grid gap-1.5`}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0369a1]">
              {section ? section.title : step === "confirmation" ? "Kiểm tra & Xác nhận" : "Hướng dẫn tài liệu"}
            </h4>
            {section ? (
              <>
                <p className="text-xs leading-relaxed text-[var(--cns-text-secondary)]">{section.help}</p>
                <p className="text-[11px] text-[var(--cns-text-muted)]">Trợ giúp trường bên dưới có sẵn từ biểu mẫu simulator, không phải câu trả lời AI.</p>
              </>
            ) : step === "confirmation" ? (
              <p className="text-xs leading-relaxed text-[var(--cns-text-secondary)]">
                Đối chiếu toàn bộ thông số nền, trạng thái lỗi và tiêu chí chấm trước khi lưu kịch bản vào danh sách nguồn chưa xuất bản.
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-[var(--cns-text-secondary)]">
                Ghi trạm, phiên bản hoặc mục cần đọc. PDF có văn bản, DOCX, TXT, MD; tối đa 5 tệp, 10 MiB/tệp, 25 MiB tổng. Scan cần OCR. Tài liệu được gửi tới dịch vụ AI bên ngoài đã cấu hình.
              </p>
            )}
          </div>

          {session?.analysis ? (
            <div className={`${authoringCardClass} border-[#0284c7]/30 bg-[#f0f9ff]/60`}>
              <p role="status" aria-live="polite" className="text-xs font-medium text-[#0369a1]">
                {session.analysis.status === "queued"
                  ? "AI đang chờ xử lý"
                  : session.analysis.status === "running"
                    ? "AI đang phân tích tài liệu hoặc câu hỏi"
                    : session.analysis.status === "failed"
                      ? "AI chưa phân tích được. Kiểm tra tài liệu (scan cần OCR) hoặc rút gọn câu hỏi rồi thử lại; bản chỉnh không mất."
                      : session.analysis.status === "stale"
                        ? "Kết quả AI đã cũ do bản nháp thay đổi. Hãy phân tích lại."
                        : "AI đã xử lý xong. Xem nguồn và duyệt đề xuất bên dưới."}
              </p>
            </div>
          ) : null}

          {paused ? (
            <div className={`${authoringCardClass} grid gap-2 text-xs`}>
              <p>Đã tạm dừng cập nhật tự động. Công việc vẫn tiếp tục trên máy chủ.</p>
              <Button size="sm" className={authoringBtnBlueClass} onClick={() => setPollToken((token) => token + 1)}>Tiếp tục cập nhật</Button>
            </div>
          ) : null}

          {session?.proposal ? (
            <AiAuthoringAssistant
              key={session.proposal.id}
              session={session}
              dirty={dirty}
              disabled={busy || uploadUncertain || conflict || pending}
              onApply={(ids) => void run(() => applySelectedProposal(ids))}
              onDismiss={() => void run(dismissProposal)}
            />
          ) : null}

          {section ? (
            <div className={`${authoringCardClass} grid gap-2.5`}>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--cns-text-primary)]">AI hướng dẫn bước này</h5>
              <p className="text-xs leading-relaxed text-[var(--cns-text-secondary)]">
                {section.id === "faults"
                  ? "Bạn muốn học viên phát hiện hoặc khắc phục lỗi gì? AI sẽ hướng dẫn chọn các trường liên quan, không bắt bạn biết mã tham số."
                  : section.id === "criteria" || section.id === "success-criteria"
                    ? "Học viên cần đạt kết quả nào? Để AI giải thích các lựa chọn trước khi bạn xác nhận."
                    : section.id === "permissions"
                      ? "Học viên cần được phép sửa gì để làm bài? AI giúp đối chiếu quyền với mục tiêu, bạn quyết định trước khi lưu."
                      : "Bạn có thể giữ các giá trị đã điền. Nếu chưa rõ, nhờ AI giải thích mục này và chỉ ra thông tin cần xác nhận."}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <Button
                  size="sm"
                  className={authoringBtnBlueClass}
                  disabled={busy || pending || uploadUncertain || conflict || !!session?.proposal}
                  onClick={() => void run(() => analyze("guidance", `Hướng dẫn người mới điền bước ${section.title}, giải thích các nhóm và những giá trị có thể giữ mặc định. Chỉ giải thích, không thay đổi dữ liệu.`))}
                >
                  Hướng dẫn tôi điền bước này
                </Button>
                <Button
                  size="sm"
                  className={authoringBtnGrayClass}
                  disabled={busy || pending || uploadUncertain || conflict || !!session?.proposal}
                  onClick={() => void run(() => analyze("guidance", `Dựa vào cấu hình bản nháp và mục tiêu bài, đề xuất cách điền bước ${section.title}. Chỉ đề xuất các thay đổi có thể thực hiện trong simulator; hỏi rõ khi thiếu mục tiêu.`))}
                >
                  Gợi ý giá trị phù hợp
                </Button>
              </div>
              <label className="grid gap-1 text-xs font-medium">
                Câu hỏi cho AI
                <textarea rows={2} value={question} maxLength={2000} className={authoringInputClass} disabled={busy || uploadUncertain || pending} onChange={(event) => setQuestion(event.currentTarget.value)} />
              </label>
              <p className="text-[11px] text-[var(--cns-text-secondary)]">Ví dụ: Giá trị này có ý nghĩa gì? Hãy đề xuất theo tài liệu. Câu hỏi được gửi tới AI; mọi thay đổi cần bạn duyệt.</p>
              <div className="flex justify-end border-t border-[var(--cns-border-subtle)]/60 pt-2">
                <Button size="sm" className={authoringBtnOrangeClass} disabled={busy || pending || uploadUncertain || conflict || !!session?.proposal || !question.trim()} onClick={() => void run(() => analyze("guidance"))}>
                  Hỏi AI về bước này
                </Button>
              </div>
            </div>
          ) : null}

          {session?.issues.length ? (
            <details open={session.issues.some(i => i.severity === "error")} className={`${authoringCardClass} text-xs`}>
              <summary className="cursor-pointer font-semibold">
                Mục cần kiểm tra · {session.issues.filter(i => i.severity === "error").length} cần sửa, {session.issues.filter(i => i.severity === "warning").length} lưu ý
              </summary>
              <ul aria-label="Mục cần kiểm tra" className="mt-2 grid gap-1.5">
                {session.issues.map((issue, i) => (
                  <li key={i} className={issue.severity === "error" ? "text-[#ea580c]" : "text-[var(--cns-text-secondary)]"}>
                    {issue.severity === "error" ? "Cần sửa" : "Lưu ý"}: {issue.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
