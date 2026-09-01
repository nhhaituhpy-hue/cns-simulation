"use client";

import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Circle } from "@phosphor-icons/react/dist/csr/Circle";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { HardwareReview } from "@/components/hardware/hardware-review";
import { ScenarioActionTimeline } from "@/components/scenario/scenario-action-timeline";
import { VOR_EQUIPMENT_DIAGRAMS } from "@/lib/vor-hardware-model";
import { useVorScenarioStore } from "@/stores/vor-scenario-store";
import { useVorSubmissionStore } from "@/stores/vor-submission-store";
import { getSidebarInteractionTargets } from "@/lib/vor-sidebar-fields";

interface VorSubmissionReviewProps {
  submissionId: string;
}

export function VorSubmissionReview({ submissionId }: VorSubmissionReviewProps) {
  const submissions = useVorSubmissionStore((state) => state.submissions);
  const submissionsHydrated = useVorSubmissionStore((state) => state.isHydrated);
  const hydrateSubmissions = useVorSubmissionStore((state) => state.hydrate);
  const reviewSubmission = useVorSubmissionStore((state) => state.reviewSubmission);
  const scenarios = useVorScenarioStore((state) => state.scenarios);
  const hydrateScenarios = useVorScenarioStore((state) => state.hydrate);
  const submission = submissions.find((item) => item.id === submissionId);
  const scenario = scenarios.find((item) => item.id === submission?.scenarioId);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void hydrateSubmissions();
    void hydrateScenarios();
  }, [hydrateScenarios, hydrateSubmissions]);

  const visitedViews = useMemo(
    () => new Set(
      submission?.events
        .filter((event) => event.eventType !== "sidebar")
        .map((event) => event.viewId) ?? [],
    ),
    [submission?.events],
  );
  const sidebarTargets = useMemo(
    () => getSidebarInteractionTargets(scenario?.overrides ?? []),
    [scenario?.overrides],
  );

  if (!submissionsHydrated) {
    return <div role="status" className="grid min-h-[calc(100dvh-4rem)] place-items-center text-sm text-[var(--text-secondary)]">Đang tải bài nộp VOR…</div>;
  }

  if (!submission) {
    return (
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-[var(--surface-muted)] px-4">
        <div className="max-w-md rounded-xl border border-[var(--border)] bg-white p-8 text-center">
          <WarningCircle aria-hidden size={38} className="mx-auto text-[#d97706]" />
          <h1 className="mt-4 text-xl font-bold text-[var(--text-primary)]">Không tìm thấy bài nộp</h1>
          <Link href="/admin/vor/submissions" className="mt-5 inline-flex h-10 items-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white">Về danh sách</Link>
        </div>
      </main>
    );
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const numericScore = Number(formData.get("score"));
    const examinerComment = String(formData.get("comment") ?? "");
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
      setMessage("Điểm phải nằm trong khoảng 0 đến 100.");
      return;
    }
    await reviewSubmission(submissionId, numericScore, examinerComment);
    setMessage("Đã lưu đánh giá của giám khảo.");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <header className="border-b border-[var(--border)] pb-6">
        <Link href="/admin/vor/submissions" className="text-sm font-semibold text-[var(--accent)] hover:underline">← Danh sách bài nộp VOR</Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{submission.studentName} | {submission.workUnit}</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{scenario?.title ?? "Kịch bản VOR không còn tồn tại"}</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${submission.status === "reviewed" ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fef3c7] text-[#92400e]"}`}>{submission.status === "reviewed" ? "Đã chấm" : "Chờ chấm"}</span>
        </div>
      </header>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <div className="space-y-6">
          <ReviewSection title="Nhật ký thao tác PMDT">
            <ol className="space-y-3">
              {submission.events.map((item) => (
                <li key={item.id} className="rounded border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <div className="flex gap-3">
                    <span className="font-mono text-xs font-bold text-[var(--accent)]">{String(item.sequence).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text-primary)]">{item.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{item.menuPath.join(" › ")}</p>
                      {item.eventType === "sidebar" ? (
                        <p className="mt-2 font-mono text-xs font-semibold text-[#a16207]">
                          Kết quả: {String(item.resultValue)} · {item.resultStatus}
                        </p>
                      ) : null}
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{item.annotation || "Không có chú thích."}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </ReviewSection>
          {submission.actionHistory?.length ? <ScenarioActionTimeline events={submission.actionHistory} title="Timeline kỹ thuật / cách xử lý cảnh báo" /> : null}
          {submission.resolution ? <ReviewSection title="Kết quả kỹ thuật của scenario"><p className="text-sm font-semibold text-[var(--text-primary)]">{submission.resolution.solved ? "SOLVED" : "IN PROGRESS"}</p><ul className="mt-3 space-y-2 text-sm">{submission.resolution.finalChecks.map((check) => <li key={check.id} className={check.passed ? "text-[#166534]" : "text-[#991b1b]"}>{check.passed ? "✓" : "✕"} {check.label}: {check.detail}</li>)}</ul></ReviewSection> : null}

          <ReviewSection title="Câu trả lời của học viên">
            <Answer title="Vị trí / sự cố nghi ngờ" value={submission.answer.suspectedFault} />
            <Answer title="Căn cứ chẩn đoán" value={submission.answer.reasoning} />
            <Answer title="Hướng khắc phục" value={submission.answer.remediation} />
          </ReviewSection>
          {scenario?.hardwareTask ? (
            <ReviewSection title="Bước 2 · Đối chiếu phần cứng">
              <HardwareReview diagrams={VOR_EQUIPMENT_DIAGRAMS} task={scenario.hardwareTask} answer={submission.hardwareAnswer} />
            </ReviewSection>
          ) : null}
        </div>

        <div className="space-y-6">
          <ReviewSection title="Đối chiếu checkpoint">
            <p className="mb-4 text-xs leading-5 text-[var(--text-muted)]">Thông tin hỗ trợ giám khảo, không phải điểm tự động.</p>
            {scenario?.expectedCheckpoints.length ? (
              <ul className="space-y-3">
                {scenario.expectedCheckpoints.map((checkpoint) => {
                  const visited = visitedViews.has(checkpoint.viewId);
                  return (
                    <li key={checkpoint.id} className="flex gap-3 rounded border border-[var(--border)] p-3">
                      {visited ? <CheckCircle aria-label="Đã kiểm tra" size={19} weight="fill" className="shrink-0 text-[#16a34a]" /> : <Circle aria-label="Chưa kiểm tra" size={19} className="shrink-0 text-[var(--text-muted)]" />}
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{checkpoint.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{checkpoint.guidance}</p>
                        <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">Trọng số tham khảo: {checkpoint.points}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-[var(--text-muted)]">Không còn dữ liệu checkpoint của kịch bản.</p>}

            {sidebarTargets.length > 0 ? (
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Thao tác sidebar</h3>
                <ul className="mt-3 space-y-3">
                  {sidebarTargets.map((target) => {
                    const lastInteraction = submission.events
                      .filter((event) =>
                        event.eventType === "sidebar" && event.fieldId === target.fieldId,
                      )
                      .at(-1);
                    const completed =
                      lastInteraction?.resultValue === target.value &&
                      lastInteraction.resultStatus === (target.status ?? "yellow");
                    return (
                      <li key={target.fieldId} className="flex gap-3 rounded border border-[var(--border)] p-3">
                        {completed ? <CheckCircle aria-label="Đã thao tác" size={19} weight="fill" className="shrink-0 text-[#16a34a]" /> : <Circle aria-label="Chưa thao tác" size={19} className="shrink-0 text-[var(--text-muted)]" />}
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{target.label}</p>
                          <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">Đích: {String(target.value)} · {target.status ?? "yellow"}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </ReviewSection>

          <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Đánh giá của giám khảo</h2>
            <form onSubmit={saveReview} className="mt-4 space-y-4">
              <label className="grid gap-2 text-sm font-semibold text-[var(--text-primary)]">Điểm (0–100)<input name="score" type="number" min="0" max="100" step="0.5" defaultValue={submission.score ?? ""} className="h-11 rounded border border-[var(--border-strong)] px-3 font-mono font-normal outline-none focus:border-[var(--accent)]" /></label>
              <label className="grid gap-2 text-sm font-semibold text-[var(--text-primary)]">Nhận xét<textarea name="comment" rows={6} defaultValue={submission.examinerComment ?? ""} className="resize-y rounded border border-[var(--border-strong)] p-3 font-normal leading-6 outline-none focus:border-[var(--accent)]" /></label>
              {message ? <p role="status" className="text-sm font-medium text-[var(--text-secondary)]">{message}</p> : null}
              <button type="submit" className="inline-flex h-11 w-full items-center justify-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Lưu điểm và nhận xét</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]"><h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">{title}</h2>{children}</section>;
}

function Answer({ title, value }: { title: string; value: string }) {
  return <div className="border-t border-[var(--border)] py-4 first:border-t-0 first:pt-0 last:pb-0"><h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)]">{value}</p></div>;
}
