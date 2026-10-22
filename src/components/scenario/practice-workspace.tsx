"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { usePracticeSubmission } from "./attempt-feedback-client";
import { PracticeAiFeedbackButton } from "./practice-ai-feedback-button";
import { PracticeAiHints } from "./practice-ai-hints";
import styles from "./practice-workspace.module.css";

export interface PracticeWorkspaceProps {
  enabled?: boolean;
  moduleId: ScenarioParametersModuleId;
  scenario: { id: string; name: string; description: string; difficulty?: string; membershipId?: string } | null;
  attemptKey?: string | number | null;
  getPayload: () => Record<string, unknown> | null;
  onRestart?: () => boolean | void;
  hardware?: { available: boolean; reason?: string; onOpen?: () => void };
  children: ReactNode;
}
const LockedContext = createContext(false);
export function usePracticeLocked() { return useContext(LockedContext); }

/** Children keep the same position when the async scenario becomes ready. */
export function PracticeWorkspace({ enabled = true, ...props }: PracticeWorkspaceProps) {
  const active = enabled && Boolean(props.scenario);
  const submission = usePracticeSubmission({ moduleId: props.moduleId, scenarioId: props.scenario?.id ?? "", libraryMembershipId: props.scenario?.membershipId, attemptKey: props.attemptKey, getPayload: props.getPayload, enabled: active });
  const locked = enabled && (!active || submission.pending || Boolean(submission.submissionId));
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled) return;
    const stopNativeHotkey = (event: KeyboardEvent) => {
      if (!/^F[5-8]$/.test(event.key)) return;
      const target = event.target;
      if (locked || (target instanceof Element && (target.closest("[data-practice-assistant]") || !rootRef.current?.contains(target)))) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    };
    document.addEventListener("keydown", stopNativeHotkey, true);
    return () => document.removeEventListener("keydown", stopNativeHotkey, true);
  }, [enabled, locked]);
  const scenario = props.scenario;
  return <LockedContext.Provider value={locked}>
    <div ref={rootRef} className={active ? styles.workspace : styles.inactive} data-practice-workspace={active ? props.moduleId : undefined} data-locked={locked ? "true" : undefined}
      onKeyDownCapture={event => {
        // Native simulators listen at document level: side-panel typing and a
        // submitted attempt must not trigger F5/F7/F8 outside the center.
        if (active && (locked || (event.target instanceof Element && event.target.closest("[data-practice-assistant]")))) event.stopPropagation();
      }}>
      {active && scenario ? <section aria-label="Mô tả tình huống" className={styles.description}>
        <Link href={`/review/${props.moduleId}`} className={styles.back}>← Danh sách ôn tập</Link>
        <p className={styles.eyebrow}>Tình huống thực hành</p>
        <h1>{scenario.name}</h1>
        {scenario.difficulty ? <span className={styles.badge}>{({ basic: "Cơ bản", intermediate: "Trung bình", advanced: "Nâng cao", easy: "Cơ bản", medium: "Trung bình", hard: "Nâng cao" } as Record<string, string>)[scenario.difficulty] ?? scenario.difficulty}</span> : null}
        <h2>Mô tả tình huống</h2>
        <p className={styles.situation}>{scenario.description || "Thực hiện kiểm tra và xử lý tình huống trên simulator."}</p>
        <div className={styles.note}>Thao tác trên thiết bị ở giữa. Khi hoàn tất, nộp bài một lần để hệ thống đối chiếu barem và tự hiển thị đánh giá.</div>
      </section> : null}
      <div className={active ? styles.center : styles.inactive} data-practice-center={enabled ? "true" : undefined} role={active ? "region" : undefined} aria-label={active ? "Simulator thao tác" : undefined} inert={locked || undefined}>
        <div className={active ? styles.nativeSurface : styles.inactive}>{props.children}</div>
      </div>
      {active && scenario ? <aside aria-label="Trợ giúp và nộp bài" data-practice-assistant className={styles.assistant}>
        <div className={styles.hints}><PracticeAiHints moduleId={props.moduleId} scenarioId={scenario.id} libraryMembershipId={scenario.membershipId} attemptKey={props.attemptKey} getPayload={props.getPayload} disabled={locked} /></div>
        <div className={styles.actions}>
          <button type="button" onClick={props.hardware?.onOpen} disabled={locked || !props.hardware?.available || !props.hardware.onOpen} className={styles.hardware}>Bước 2 · Xác định phần cứng</button>
          {props.hardware?.reason ? <p className={styles.help}>{props.hardware.reason}</p> : !props.hardware ? <p className={styles.help}>Kịch bản này chưa hỗ trợ bước xác định phần cứng.</p> : null}
          <p className={styles.help}>{submission.submissionId ? "Bài đã được lưu. Nhận xét tự cập nhật bên dưới." : "Nộp bài để AI diễn giải kết quả đối chiếu thao tác với barem đã công bố."}</p>
          <PracticeAiFeedbackButton moduleId={props.moduleId} scenarioId={scenario.id} scenarioName={scenario.name} attemptKey={props.attemptKey} getPayload={props.getPayload} onRestart={props.onRestart} submission={submission} buttonClassName={styles.submit} />
        </div>
      </aside> : null}
    </div>
  </LockedContext.Provider>;
}
