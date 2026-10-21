"use client";

import { Clock } from "@phosphor-icons/react/dist/csr/Clock";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { expireScenarioExamSessionAction } from "@/lib/scenario-exams/actions";

export function useScenarioExamExpiration(remaining: number, active = true) {
  const router = useRouter();
  const requested = useRef(false);
  useEffect(() => {
    if (!active || remaining > 0 || requested.current) return;
    requested.current = true;
    // Only request server finalization: never upload post-deadline browser data.
    void expireScenarioExamSessionAction().then(result => {
      if (result.ok && result.data?.timedOut) router.refresh();
    }).catch(() => { /* The durable worker retries independently of this page. */ });
  }, [active, remaining, router]);
}

export function useScenarioExamRemainingTime(deadlineAt: string): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return Math.max(0, new Date(deadlineAt).getTime() - now);
}

export function CandidateExamTimer({ remaining }: { remaining: number }) {
  const seconds = Math.floor(remaining / 1000);
  const label = `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div aria-label={`Thời gian còn lại: ${label}`} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-lg font-bold tabular-nums ${remaining < 300000 ? "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]" : "border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent)]"}`}>
      <Clock aria-hidden size={19} /> {label}
    </div>
  );
}
