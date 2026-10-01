"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExamPageFrame, primaryButtonClassName, secondaryButtonClassName, textareaClassName } from "@/components/exams/shared";
import { getScenarioParametersModule } from "@/lib/scenario-parameters";
import type { CandidateScenarioExamItem, ScenarioExamAnswer } from "@/lib/scenario-exams/types";
import { CandidateExamTimer, useScenarioExamRemainingTime } from "./candidate-exam-timer";
import { ScenarioExamSnapshotProvider, type ScenarioExamResultReader } from "./scenario-exam-snapshot-context";
import { saveScenarioExamItemAction, submitScenarioExamItemAction, type ScenarioExamActionResult } from "@/lib/scenario-exams/actions";
import { buildCandidateScenarioExamResult, cacheCandidateScenarioExamResult, cacheCandidateAnswer, readCandidateAnswer } from "@/lib/scenario-exams/browser-results";
import { ScenarioExamLiveStatus } from "./scenario-exam-live-status";
import styles from "./candidate-exam-item.module.css";

const loading = () => <p role="status" className="p-5 text-sm text-[var(--text-secondary)]">Đang mở simulator…</p>;
const Dvor1150 = dynamic(() => import("@/components/dvor1150/pmdt-layout").then((module) => module.Dvor1150PmdtLayout), { loading, ssr: false });
const Dvor1150a = dynamic(() => import("@/components/vor/pmdt-layout").then((module) => module.PmdtLayout), { loading, ssr: false });
const Dme1119a = dynamic(() => import("@/components/dme/pmdt-layout").then((module) => module.PmdtLayout), { loading, ssr: false });
const Dvor220 = dynamic(() => import("@/modules/operations/dvor-220/dvor220-simulator").then((module) => module.Dvor220Simulator), { loading, ssr: false });
const Dme320 = dynamic(() => import("@/modules/operations/dme-320/dme320-simulator").then((module) => module.Dme320Simulator), { loading, ssr: false });
const Adsb = dynamic(() => import("./candidate-adsb-runtime").then((module) => module.CandidateAdsbRuntime), { loading, ssr: false });

function AssignedSimulator({ item }: { item: CandidateScenarioExamItem }) {
  switch (item.moduleId) {
    case "dvor-1150": return <Dvor1150 mode="student" />;
    case "dvor-1150a": return <Dvor1150a mode="student" sessionUserId={item.sessionId} />;
    case "dme-1119a": return <Dme1119a mode="student" sessionUserId={item.sessionId} />;
    case "dvor-220": return <Dvor220 />;
    case "dme-320": return <Dme320 />;
    case "ads-b": return <Adsb item={item} />;
  }
}

export function CandidateExamItem({ item }: { item: CandidateScenarioExamItem }) {
  const router = useRouter();
  const remaining = useScenarioExamRemainingTime(item.deadlineAt);
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const [answer, setAnswer] = useState(() => readCandidateAnswer(item.sessionId, item.id));
  const resultReader = useRef<ScenarioExamResultReader | null>(null);
  const inFlight = useRef<Promise<ScenarioExamActionResult<{ id: string }>> | null>(null);
  const active = remaining > 0 && !submitted;
  const registerResultReader = useCallback((reader: ScenarioExamResultReader) => {
    resultReader.current = reader;
    return () => { if (resultReader.current === reader) resultReader.current = null; };
  }, []);
  const persist = useCallback(async (submit = false, automatic = false) => {
    if (inFlight.current) await inFlight.current;
    const payload = resultReader.current?.();
    if (!payload) {
      if (automatic) return null;
      throw new Error("Simulator chưa sẵn sàng. Vui lòng chờ môn thi được nạp xong.");
    }
    const result = buildCandidateScenarioExamResult(item, { ...payload, answer });
    // A blocked browser cache must not prevent saving evidence on the server.
    try { cacheCandidateScenarioExamResult(item.sessionId, result); } catch { /* Server ACK remains authoritative. */ }
    const request = submit ? submitScenarioExamItemAction(item.id, result) : saveScenarioExamItemAction(item.id, result);
    inFlight.current = request;
    try {
      const response = await request;
      if (!response.ok) throw new Error(response.message);
      setFeedback({ message: response.message, error: false });
      if (submit) setSubmitted(true);
      return response;
    } finally {
      if (inFlight.current === request) inFlight.current = null;
    }
  }, [answer, item]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      if (inFlight.current) return;
      void persist(false, true).catch((error: unknown) => setFeedback({ message: error instanceof Error ? error.message : "Không thể lưu bài làm.", error: true }));
    }, 10000);
    return () => window.clearInterval(timer);
  }, [active, persist]);

  function write(submit: boolean, returnToSession: boolean) {
    if (submit && !window.confirm("Nộp môn thi này? Sau khi nộp, bạn không thể sửa bài làm của môn.")) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await persist(submit, returnToSession && !submit);
        if (returnToSession) { router.push("/student/scenario-exams/session"); router.refresh(); }
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Không thể lưu hoặc nộp bài làm.", error: true });
      }
    });
  }
  function changeAnswer(field: keyof ScenarioExamAnswer, value: string) {
    const next = { ...answer, [field]: value };
    setAnswer(next);
    try { cacheCandidateAnswer(item.sessionId, item.id, next); } catch { /* Server save is still available. */ }
  }
  const moduleLabel = getScenarioParametersModule(item.moduleId)?.label ?? item.moduleId;
  return (
    <div className="grid gap-4 pb-6">
      <ExamPageFrame>
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="min-w-0">
            <Link href="/student/scenario-exams/session" className={secondaryButtonClassName} onClick={(event) => { if (active) { event.preventDefault(); if (!pending) write(false, true); } }}><ArrowLeft aria-hidden size={17} />Quay lại phiên thi</Link>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">{item.examName} · {item.candidateName} · {item.candidateUnit}</p>
            <h1 className="mt-1 text-xl font-bold text-[var(--text-primary)]">{moduleLabel} · {item.scenarioName}</h1>
            {item.definition.description ? <p className="mt-2 max-w-4xl text-sm text-[var(--text-secondary)]">{item.definition.description}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CandidateExamTimer remaining={remaining} />
            <button type="button" className={secondaryButtonClassName} disabled={pending || !active} onClick={() => write(false, false)}>Lưu bài làm</button>
            <button type="button" className={primaryButtonClassName} disabled={pending || !active} onClick={() => write(true, true)}>{pending ? "Đang lưu…" : "Nộp môn"}</button>
          </div>
        </header>
        {feedback ? <p role={feedback.error ? "alert" : "status"} className={`mt-3 text-sm ${feedback.error ? "text-[var(--color-danger)]" : "text-[var(--text-secondary)]"}`}>{feedback.message}</p> : null}
        {active ? <div className="mt-3"><ScenarioExamLiveStatus item={item} reader={resultReader} /></div> : null}
      </ExamPageFrame>
      {submitted ? <p role="status" className="mx-4 text-sm text-[var(--color-success)]">Đã nộp môn thi. Bạn có thể quay lại phiên thi để nộp toàn bộ bài.</p> : remaining === 0 ? (
        <p role="alert" className="mx-4 rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">Phiên thi đã hết thời gian. Hãy quay lại phiên thi để xem trạng thái các môn.</p>
      ) : (
        <ScenarioExamSnapshotProvider answer={answer} registerResultReader={registerResultReader} snapshot={{ moduleId: item.moduleId, definition: item.definition, sessionKey: `scenario-exam:${item.sessionId}:${item.id}`, revisionKey: `exam:${item.id}:${item.revision}` }}>
          <section aria-label="Kết luận sự cố" className="mx-auto w-full max-w-7xl px-4 pb-2 sm:px-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Kết luận sự cố</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">{([
              ["suspectedFault", "Vị trí / sự cố nghi ngờ"], ["reasoning", "Căn cứ chẩn đoán"], ["remediation", "Hướng khắc phục"],
            ] as const).map(([key, label]) => <label key={key} className="grid gap-2 text-sm font-semibold text-[var(--text-secondary)]">{label}<textarea rows={4} maxLength={4000} value={answer[key]} onChange={(event) => changeAnswer(key, event.target.value)} disabled={pending} className={textareaClassName} /></label>)}</div>
          </section>
          <div className={styles.simulator} data-testid="exam-simulator"><AssignedSimulator item={item} /></div>
        </ScenarioExamSnapshotProvider>
      )}
    </div>
  );
}
