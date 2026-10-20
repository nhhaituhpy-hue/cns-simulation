/** Framework-independent worker loop. Queue, documents and AI are injected. */
export interface ClaimedGeneration<Input, Documents> {
  id: string;
  attemptToken: string;
  input: Input;
  documents: Documents;
}

export interface GenerationWorkerDependencies<Input, Documents, Extracted, Result> {
  claim: () => Promise<ClaimedGeneration<Input, Documents> | null>;
  heartbeat: (job: ClaimedGeneration<Input, Documents>, phase: string) => Promise<boolean>;
  loadDocuments: (documents: Documents, signal: AbortSignal) => Promise<Extracted>;
  generate: (input: Input, documents: Extracted, signal: AbortSignal) => Promise<Result>;
  complete: (job: ClaimedGeneration<Input, Documents>, result: Result) => Promise<boolean>;
  fail: (job: ClaimedGeneration<Input, Documents>, error: { code: string; message: string }) => Promise<unknown>;
  heartbeatMs?: number;
  signal?: AbortSignal;
}

export type GenerationWorkerOutcome = "idle" | "completed" | "failed" | "stale" | "stopped";

export async function processNextGeneration<Input, Documents, Extracted, Result>(
  deps: GenerationWorkerDependencies<Input, Documents, Extracted, Result>,
): Promise<GenerationWorkerOutcome> {
  if (deps.signal?.aborted) return "stopped";
  const job = await deps.claim();
  if (!job) return "idle";
  const controller = new AbortController();
  const stop = () => controller.abort();
  deps.signal?.addEventListener("abort", stop, { once: true });
  if (deps.signal?.aborted) stop();
  let stale = false;
  let phase = "extracting";
  let pendingHeartbeat: Promise<void> | undefined;
  function heartbeat(): Promise<void> {
    // Interval callbacks share the same operation instead of queuing a second
    // renewal after it resolves. Otherwise several waiters can fan out at once.
    if (pendingHeartbeat) return pendingHeartbeat;
    if (controller.signal.aborted) return Promise.resolve();
    const work = (async () => {
      try {
        if (!await deps.heartbeat(job!, phase)) { stale = true; controller.abort(); }
      } catch { stale = true; controller.abort(); }
    })().finally(() => { if (pendingHeartbeat === work) pendingHeartbeat = undefined; });
    pendingHeartbeat = work;
    return work;
  }
  const timer = setInterval(() => { void heartbeat(); }, deps.heartbeatMs ?? 15_000);
  try {
    await heartbeat();
    if (stale) return "stale";
    if (controller.signal.aborted) return "stopped";
    const documents = await deps.loadDocuments(job.documents, controller.signal);
    phase = "generating";
    await heartbeat();
    if (stale) return "stale";
    if (controller.signal.aborted) return "stopped";
    const result = await deps.generate(job.input, documents, controller.signal);
    phase = "validating";
    await heartbeat();
    if (stale) return "stale";
    if (controller.signal.aborted) return "stopped";
    clearInterval(timer);
    return await deps.complete(job, result) ? "completed" : "stale";
  } catch (error) {
    if (stale) return "stale";
    if (deps.signal?.aborted) return "stopped";
    // Provider/parser errors can contain document text and credentials; persist
    // only a known public code/message, not arbitrary thrown error messages.
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
      && /^[A-Z][A-Z0-9_]{1,63}$/.test(error.code) ? error.code : "GENERATION_FAILED";
    clearInterval(timer);
    if (pendingHeartbeat) await pendingHeartbeat;
    if (stale) return "stale";
    await deps.fail(job, { code, message: "Không thể hoàn tất tạo kịch bản. Vui lòng xem lại yêu cầu hoặc thử lại." });
    return "failed";
  } finally {
    clearInterval(timer);
    if (pendingHeartbeat) await pendingHeartbeat;
    deps.signal?.removeEventListener("abort", stop);
    controller.abort();
  }
}
