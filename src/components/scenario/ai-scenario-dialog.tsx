"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { Button, ButtonLink } from "@/components/ui/button";
import { getSimulatorModule } from "@/modules/core/registry";
import { SCENARIO_PARAMETERS_MODULES, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";

const fieldClass = "w-full rounded-[8px] border border-[var(--cns-btn-ghost-border)] bg-[var(--cns-surface-card)] px-3 py-2 text-[13px] text-[var(--cns-text-primary)] outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20 disabled:opacity-70";

export type AiScenarioJob = {
  id: string;
  moduleId: ScenarioParametersModuleId;
  name: string;
  status: string;
  phase: string;
  errorCode?: string | null;
  scenarioId?: string | null;
  scenarioRowId?: string | null;
  createdAt: string;
  updatedAt: string;
};

const phaseLabels: Record<string, string> = {
  queued: "Đang chờ xử lý", extracting: "Đang đọc tài liệu", generating: "Đang tạo kịch bản",
  validating: "Đang kiểm tra kịch bản", completed: "Hoàn tất · Chưa xuất bản", failed: "Tạo kịch bản thất bại",
};
const failureLabels: Record<string, string> = {
  UNSUPPORTED_REQUEST: "Tình huống này chưa nằm trong các lỗi simulator hỗ trợ. Hãy chọn lỗi phù hợp hoặc tạo thủ công.",
  INVALID_DOCUMENT: "Tài liệu không có lớp văn bản hoặc vượt giới hạn. PDF scan cần OCR trước khi gửi lại.",
  DOCUMENT_TIMEOUT: "Tài liệu quá phức tạp. Hãy tách các trang liên quan rồi gửi lại.",
  DOCUMENT_RESOURCE_LIMIT: "Tài liệu vượt giới hạn xử lý an toàn. Hãy tách nhỏ hoặc chuyển sang văn bản.",
  INVALID_CITATION: "AI chưa dẫn đúng đoạn tài liệu. Hãy cung cấp trang hoặc đoạn liên quan rồi thử lại.",
  PROVIDER_RATE_LIMIT: "Dịch vụ AI đang giới hạn yêu cầu. Vui lòng thử lại sau.",
  PROVIDER_TIMEOUT: "AI quá thời gian xử lý. Hãy rút gọn mô tả hoặc tài liệu rồi thử lại.",
  PROVIDER_AUTH: "Kết nối AI cần quản trị viên kiểm tra cấu hình.",
  ACTOR_FORBIDDEN: "Tài khoản không còn quyền tạo kịch bản.",
};
const isTerminal = (job: AiScenarioJob) => ["completed", "failed"].includes(job.status) || ["completed", "failed"].includes(job.phase);
const phaseLabel = (job: AiScenarioJob) => phaseLabels[isTerminal(job) ? (job.status === "failed" || job.phase === "failed" ? "failed" : "completed") : job.phase] ?? "Đang xử lý";

function readJob(value: unknown, moduleId: ScenarioParametersModuleId): AiScenarioJob | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (item.moduleId !== moduleId || typeof item.id !== "string" || typeof item.name !== "string" ||
    typeof item.status !== "string" || typeof item.phase !== "string" ||
    typeof item.createdAt !== "string" || typeof item.updatedAt !== "string") return null;
  // Only retain public progress metadata; never store source documents/provider details.
  return { id: item.id, moduleId, name: item.name, status: item.status, phase: item.phase,
    createdAt: item.createdAt, updatedAt: item.updatedAt,
    errorCode: typeof item.errorCode === "string" ? item.errorCode : null,
    scenarioId: typeof item.scenarioId === "string" ? item.scenarioId : null,
    scenarioRowId: typeof item.scenarioRowId === "string" ? item.scenarioRowId : null };
}

function resultHref(job: AiScenarioJob) {
  if (job.moduleId === "ads-b") return job.scenarioId ? `/authoring/ads-b/edit?id=${encodeURIComponent(job.scenarioId)}` : null;
  const route = getSimulatorModule(job.moduleId)?.routes.simulator;
  return route && job.scenarioRowId ? `${route}?scenarioId=${encodeURIComponent(job.scenarioRowId)}` : null;
}

/** Native dialog supplies top-layer placement, Escape and keyboard containment. */
export function AiScenarioDialog({ moduleId, onCompleted, actions }: {
  moduleId: ScenarioParametersModuleId;
  onCompleted?: (job: AiScenarioJob) => void | Promise<void>;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [hasAttempt, setHasAttempt] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<AiScenarioJob[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const completedIds = useRef(new Set<string>());
  const progressRef = useRef<HTMLDivElement>(null);
  const job = jobs.find((item) => item.id === selectedId) ?? null;
  const attemptRef = useRef<{ key: string; body: FormData } | null>(null);
  const submittingRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current!;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) (selectedId ? progressRef.current : nameRef.current)?.focus();
  }, [open, selectedId]);

  useEffect(() => {
    for (const item of jobs) {
      if (item.status !== "completed" || completedIds.current.has(item.id)) continue;
      completedIds.current.add(item.id);
      void Promise.resolve(onCompleted?.(item)).catch(() => {
        setListError("Kịch bản đã tạo xong nhưng chưa tải lại được danh sách. Hãy tải lại trang.");
      });
    }
  }, [jobs, onCompleted]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let polls = 0;
    setPaused(false);
    async function refresh() {
      controller = new AbortController();
      const deadline = setTimeout(() => controller?.abort(), 15000);
      try {
        const response = await fetch(`/api/ai/scenario-jobs?moduleId=${encodeURIComponent(moduleId)}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("list");
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object" || !("jobs" in payload) || !Array.isArray(payload.jobs)) throw new Error("list");
        let incoming = payload.jobs.map((item: unknown) => readJob(item, moduleId)).filter((item): item is AiScenarioJob => item !== null);
        if (open && selectedId) {
          const detail = await fetch(`/api/ai/scenario-jobs/${encodeURIComponent(selectedId)}`, { cache: "no-store", signal: controller.signal });
          if (!detail.ok) throw new Error("detail");
          const body = await detail.json();
          const selected = readJob(body?.job, moduleId);
          if (!selected) throw new Error("detail");
          incoming = [selected, ...incoming.filter((item) => item.id !== selected.id)];
        }
        if (cancelled) return;
        incoming = Array.from(new Map(incoming.map((item) => [item.id, item])).values());
        setJobs(incoming);
        setListError(null);
        if (!open || !incoming.some((item) => !isTerminal(item))) return;
      } catch {
        if (cancelled) return;
        setListError("Chưa tải được tiến độ AI. Yêu cầu đã nhận vẫn tiếp tục trên máy chủ.");
        if (!open) return;
      } finally {
        clearTimeout(deadline);
      }
      // No overlapping requests or background polling; at most 200 refreshes per opening.
      polls += 1;
      if (polls >= 200) { setPaused(true); return; }
      timer = setTimeout(() => void refresh(), 3000);
    }
    void refresh();
    return () => { cancelled = true; clearTimeout(timer); controller?.abort(); };
  }, [moduleId, open, selectedId, refreshToken]);

  function selectFiles(selectedFiles: File[]) {
    setFiles(selectedFiles);
    const problem = selectedFiles.some((file) => file.size === 0) ? "Không thể dùng tệp trống." :
      selectedFiles.length > 5 ? "Chỉ chọn tối đa 5 tệp." :
      selectedFiles.some((file) => !/\.(pdf|docx|txt|md)$/i.test(file.name)) ? "Chỉ chấp nhận PDF có văn bản, DOCX, TXT hoặc MD." :
      selectedFiles.some((file) => file.size > 10 * 1024 * 1024) ? "Mỗi tệp không được vượt quá 10 MiB." :
      selectedFiles.reduce((total, file) => total + file.size, 0) > 25 * 1024 * 1024 ? "Tổng tài liệu không được vượt quá 25 MiB." : null;
    setFileError(problem);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || job || fileError) return;
    if (!name.trim() || !description.trim()) {
      setError("Nhập tên kịch bản và mô tả yêu cầu.");
      return;
    }
    if (!attemptRef.current) {
      const body = new FormData();
      body.set("moduleId", moduleId);
      body.set("name", name.trim());
      body.set("description", description.trim());
      body.set("difficulty", difficulty);
      for (const file of files) body.append("files", file);
      attemptRef.current = { key: crypto.randomUUID(), body };
      setHasAttempt(true);
    }
    submittingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/scenario-jobs", {
        method: "POST",
        headers: { "Idempotency-Key": attemptRef.current.key },
        body: attemptRef.current.body,
      });
      const payload = await response.json();
      const accepted = readJob(payload?.job, moduleId);
      if (!response.ok || !accepted) {
        if (payload?.code === "PROVIDER_NOT_CONFIGURED" || payload?.code === "PROVIDER_CONFIGURATION") {
          attemptRef.current = null;
          setHasAttempt(false);
          setError("Chức năng AI chưa được bật hoặc chưa được cấu hình. Liên hệ quản trị viên; nội dung đã nhập được giữ lại.");
        } else if (response.status >= 400 && response.status < 500 && response.status !== 408) {
          attemptRef.current = null;
          setHasAttempt(false);
          setError(response.status === 401 || response.status === 403
            ? "Phiên đăng nhập hoặc quyền tạo kịch bản không còn hợp lệ. Hãy kiểm tra đăng nhập."
            : response.status === 429
              ? "Đã có quá nhiều yêu cầu AI. Hãy chờ rồi thử lại."
              : "Yêu cầu bị từ chối. Hãy kiểm tra tên, mô tả và tài liệu rồi thử lại.");
        } else {
          setError("Chưa xác nhận được yêu cầu AI. Hãy gửi lại yêu cầu; mã yêu cầu sẽ được giữ nguyên.");
        }
        return;
      }
      setJobs((current) => [accepted, ...current.filter((item) => item.id !== accepted.id)]);
      setSelectedId(accepted.id);
      attemptRef.current = null;
      setHasAttempt(false);
      setRefreshToken((value) => value + 1);
    } catch {
      setError("Chưa xác nhận được yêu cầu. Hãy gửi lại; hệ thống sẽ không tạo trùng yêu cầu đã nhận.");
    } finally {
      submittingRef.current = false;
      setSending(false);
    }
  }

  return (
    <section aria-label="Tạo kịch bản AI" className="mt-5">
      <div className="flex flex-wrap items-center gap-2.5">
      <Button onClick={() => { setSelectedId(null); setOpen(true); }} variant="secondary">
        <Sparkle aria-hidden size={16} /><span>Tạo kịch bản bằng AI</span>
      </Button>
      {actions}
      </div>
      {jobs.length ? (
        <div className="mt-3 rounded-[10px] border border-[var(--cns-border-subtle)] bg-[var(--cns-surface-card)] px-4 py-3">
          <p className="text-[12px] font-medium text-[var(--cns-text-secondary)]">Yêu cầu AI gần đây</p>
          <ul className="mt-2 grid gap-2">
            {jobs.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
              <span className="min-w-0 break-words text-[var(--cns-text-primary)]">{item.name} <span className="text-[var(--cns-text-secondary)]">· {phaseLabel(item)}</span></span>
              <Button size="sm" aria-label={`Xem tiến độ: ${item.name}`} onClick={() => { setSelectedId(item.id); setOpen(true); }}>Xem tiến độ</Button>
            </li>)}
          </ul>
        </div>
      ) : null}
      {!open && listError ? <p role="status" className="mt-2 text-[12px] text-[var(--cns-text-secondary)]">{listError} <button className="underline" onClick={() => setRefreshToken((value) => value + 1)}>Tải lại yêu cầu AI</button></p> : null}
      <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId}
          onCancel={(event) => { event.preventDefault(); setOpen(false); }}
          onClose={() => setOpen(false)}
          onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
          className="m-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100%-2rem))] overflow-y-auto rounded-[16px] border border-[var(--cns-border-subtle)] bg-[var(--cns-surface-card)] p-0 text-[var(--cns-text-primary)] shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
          <div className="p-5 sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div><h2 id={titleId} className="text-[20px] font-semibold">Tạo kịch bản bằng AI</h2>
                <p id={descriptionId} className="mt-1 text-[13px] text-[var(--cns-text-secondary)]">Mô tả tình huống và thêm tài liệu tham khảo nếu có.</p></div>
              <Button size="sm" aria-label="Đóng" onClick={() => setOpen(false)}>Đóng</Button>
            </header>
            {error || fileError ? <p role="alert" className="mt-4 rounded-[8px] bg-red-50 p-3 text-[13px] text-red-800">{fileError ?? error}</p> : null}
            {listError ? <p role="status" className="mt-4 text-[12px] text-[var(--cns-text-secondary)]">{listError}</p> : null}
            {paused ? <div className="mt-4 text-[12px]"><p>Đã tạm dừng cập nhật tự động. Yêu cầu vẫn tiếp tục trên máy chủ.</p><Button size="sm" onClick={() => setRefreshToken((value) => value + 1)}>Tiếp tục cập nhật</Button></div> : null}
            {job ? <div ref={progressRef} tabIndex={-1} className="mt-5 outline-none">
              <h3 className="break-words text-[15px] font-medium">{job.name}</h3>
              <p role="status" aria-live="polite" className="mt-2 text-[13px] text-[var(--cns-text-secondary)]">{phaseLabel(job)}</p>
              <p className="mt-3 text-[12px] leading-relaxed text-[var(--cns-text-secondary)]">Bạn có thể đóng cửa sổ; tiến độ được lưu trên máy chủ. Kịch bản phải được giám khảo kiểm tra trước khi xuất bản vào thư viện.</p>
              {job.status === "failed" || job.phase === "failed" ? <p role="alert" className="mt-3 rounded-[8px] bg-red-50 p-3 text-[13px] text-red-800">{failureLabels[job.errorCode || ""] || "Không thể hoàn tất yêu cầu. Kiểm tra mô tả và tài liệu (PDF scan cần OCR), rồi tạo một yêu cầu mới."}</p> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {job.status === "completed" && resultHref(job) ? <ButtonLink href={resultHref(job)!} variant="primary">Mở kịch bản để kiểm tra</ButtonLink> : null}
                {isTerminal(job) ? <Button onClick={() => { setSelectedId(null); attemptRef.current = null; setHasAttempt(false); setError(null); }}>Tạo yêu cầu mới</Button> : null}
              </div>
            </div> : (
            <form className="mt-5 grid gap-4" onSubmit={(event) => void submit(event)}>
              <label className="grid gap-1.5 text-[13px] font-medium">Thiết bị
                <select disabled value={moduleId} className={fieldClass}>
                  {SCENARIO_PARAMETERS_MODULES.map((module) => <option key={module.moduleId} value={module.moduleId}>{module.label}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-[13px] font-medium">Tên kịch bản
                <input ref={nameRef} required name="name" maxLength={200} value={name} onChange={(event) => setName(event.currentTarget.value)} disabled={sending || hasAttempt} className={fieldClass} />
              </label>
              <label className="grid gap-1.5 text-[13px] font-medium">Mô tả yêu cầu
                <textarea required name="description" rows={4} maxLength={2000} value={description} onChange={(event) => setDescription(event.currentTarget.value)} disabled={sending || hasAttempt} className={fieldClass} />
              </label>
              <label className="grid gap-1.5 text-[13px] font-medium">Độ khó
                <select name="difficulty" value={difficulty} onChange={(event) => setDifficulty(event.currentTarget.value)} disabled={sending || hasAttempt} className={fieldClass}>
                  <option value="basic">Cơ bản</option><option value="intermediate">Trung bình</option><option value="advanced">Nâng cao</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-[13px] font-medium">Tài liệu đính kèm (không bắt buộc)
                <input type="file" name="files" multiple accept=".pdf,.docx,.txt,.md" onChange={(event) => selectFiles(Array.from(event.currentTarget.files ?? []))} disabled={sending || hasAttempt} className={fieldClass} />
              </label>
              {files.length ? <ul aria-label="Tài liệu đã chọn" className="grid gap-1 text-[12px] text-[var(--cns-text-secondary)]">{files.map((file, index) => <li key={`${file.name}-${index}`} className="break-all">{file.name}</li>)}</ul> : null}
              <p className="text-[12px] leading-relaxed text-[var(--cns-text-secondary)]">PDF có văn bản, DOCX, TXT hoặc MD; tối đa 5 tệp, 10 MiB/tệp và 25 MiB tổng. Tài liệu scan cần OCR trước khi tải lên.</p>
              <aside className="rounded-[10px] border border-[var(--cns-border-subtle)] bg-[var(--cns-surface-card-subtle)] p-3 text-[12px] leading-relaxed text-[var(--cns-text-secondary)]">
                Tài liệu đã chọn sẽ được gửi tới dịch vụ AI bên ngoài đã cấu hình. Kịch bản tạo ra chưa được xuất bản; giám khảo phải kiểm tra và duyệt trước khi đưa vào thư viện.
              </aside>
              <div className="flex justify-end"><Button type="submit" variant="primary" disabled={sending || !!fileError}>{sending ? "Đang gửi…" : hasAttempt ? "Gửi lại yêu cầu" : "Bắt đầu tạo"}</Button></div>
            </form>
            )}
          </div>
      </dialog>
    </section>
  );
}
