"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { XCircle } from "@phosphor-icons/react/dist/csr/XCircle";
import Link from "next/link";
import type { GradingResult as GradingResultData } from "@/lib/types";
import { StepDiff } from "./step-diff";

export interface GradingResultProps {
  result: GradingResultData;
  onRetry: () => void;
  backHref?: string;
}

export function GradingResult({
  result,
  onRetry,
  backHref = "/student",
}: GradingResultProps) {
  const ResultIcon = result.passed ? CheckCircle : XCircle;

  return (
    <section aria-labelledby="grading-result-title" className="grid gap-5">
      <div
        role="status"
        className={`rounded-lg border p-5 sm:p-6 ${
          result.passed
            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
            : "border-red-300 bg-red-50 text-red-900"
        }`}
      >
        <div className="flex items-start gap-3">
          <ResultIcon aria-hidden className="mt-0.5 shrink-0" size={28} weight="fill" />
          <div>
            <h2 id="grading-result-title" className="text-xl font-bold tracking-tight">
              {result.passed ? "Đạt yêu cầu" : "Chưa đạt yêu cầu"}
            </h2>
            <p className="mt-1 text-sm leading-6">
              Điểm số: <strong>{result.score}%</strong>. Đúng {result.correctSteps}/
              {result.totalExpected} bước chuẩn, đã nộp {result.totalSubmitted} bước.
            </p>
            {!result.passed && result.score === 100 ? (
              <p className="mt-2 text-sm font-medium">
                Chuỗi có đủ bước đúng nhưng còn thao tác thừa, vì vậy bài chưa đạt.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <StepDiff comparisons={result.steps} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center justify-center rounded border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          Về danh sách bài thực hành
        </Link>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          <ArrowCounterClockwise aria-hidden size={18} />
          Thử lại
        </button>
      </div>
    </section>
  );
}
