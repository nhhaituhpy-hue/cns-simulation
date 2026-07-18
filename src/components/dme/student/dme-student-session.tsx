"use client";

import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HardwareDiagnosisStep } from "@/components/hardware/hardware-diagnosis-step";
import type { HardwareDiagnosisAnswer } from "@/lib/equipment-diagram-types";
import { DME_EQUIPMENT_DIAGRAMS } from "@/lib/dme-hardware-model";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { useDmeScenarioStore } from "@/stores/dme-scenario-store";
import { useDmeSubmissionStore } from "@/stores/dme-submission-store";
import { PmdtLayout } from "../pmdt-layout";
import { DmeStudentJournal } from "./dme-student-journal";

interface DmeStudentSessionProps {
  scenarioId: string;
  identity: {
    userId: string;
    studentName: string;
    workUnit: string;
  };
}

interface ActiveIdentity {
  userId: string;
  studentName: string;
  workUnit: string;
  startedAt: string;
}

export function DmeStudentSession({ scenarioId, identity: authIdentity }: DmeStudentSessionProps) {
  const scenarios = useDmeScenarioStore((state) => state.scenarios);
  const isHydrated = useDmeScenarioStore((state) => state.isHydrated);
  const hydrateScenarios = useDmeScenarioStore((state) => state.hydrate);
  const hydrateSubmissions = useDmeSubmissionStore((state) => state.hydrate);
  const createSubmission = useDmeSubmissionStore((state) => state.createSubmission);
  const initializeSession = useDmePmdtStore((state) => state.initializeSession);
  const activeSessionMode = useDmePmdtStore((state) => state.mode);
  const activeScenarioId = useDmePmdtStore((state) => state.scenarioId);
  const activeUserId = useDmePmdtStore((state) => state.userId);
  const [startedAt] = useState(() => new Date().toISOString());
  const identity: ActiveIdentity = { ...authIdentity, startedAt };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [stage, setStage] = useState<"pmdt" | "hardware">("pmdt");
  const scenario = scenarios.find((item) => item.id === scenarioId);
  const sessionInitialized =
    activeSessionMode === "student" &&
    activeScenarioId === scenarioId &&
    activeUserId === authIdentity.userId;

  useEffect(() => {
    void hydrateScenarios();
    void hydrateSubmissions();
  }, [hydrateScenarios, hydrateSubmissions]);

  useEffect(() => {
    if (!scenario || sessionInitialized) return;
    initializeSession({
      mode: "student",
      scenarioId: scenario.id,
      userId: identity.userId,
      studentName: identity.studentName,
      workUnit: identity.workUnit,
      overrides: scenario.overrides,
      expectedCheckpoints: scenario.expectedCheckpoints,
    });
  }, [identity.studentName, identity.userId, identity.workUnit, initializeSession, scenario, sessionInitialized]);

  if (!isHydrated) {
    return <div role="status" className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-[var(--surface-muted)] text-sm text-[var(--text-secondary)]">Đang tải kịch bản DME…</div>;
  }

  if (!scenario) {
    return (
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-[var(--surface-muted)] px-4">
        <div className="max-w-md rounded-xl border border-[var(--border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <WarningCircle aria-hidden size={38} className="mx-auto text-[#d97706]" />
          <h1 className="mt-4 text-xl font-bold text-[var(--text-primary)]">Không tìm thấy kịch bản DME</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Kịch bản có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.</p>
          <Link href="/student/dme" className="mt-5 inline-flex h-10 items-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white">Quay lại danh sách</Link>
        </div>
      </main>
    );
  }

  if (submittedId) {
    return (
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-[var(--surface-muted)] px-4">
        <div className="max-w-lg rounded-xl border border-[var(--border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <CheckCircle aria-hidden size={44} weight="fill" className="mx-auto text-[#16a34a]" />
          <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Đã nộp bài DME</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Bài làm đã được lưu để giám khảo đọc nhật ký thao tác, nhận xét câu trả lời và chấm điểm.</p>
          <p className="mt-3 font-mono text-xs text-[var(--text-muted)]">Mã bài nộp: {submittedId}</p>
          <Link href="/student/dme" className="mt-6 inline-flex h-10 items-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white">Về danh sách bài thực hành</Link>
        </div>
      </main>
    );
  }

  if (!sessionInitialized) {
    return <div role="status" className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-[var(--surface-muted)] text-sm text-[var(--text-secondary)]">Đang chuẩn bị phiên thực hành DME…</div>;
  }

  async function submit(hardwareAnswer?: HardwareDiagnosisAnswer) {
    if (!scenario) return;
    setIsSubmitting(true);
    const state = useDmePmdtStore.getState();
    const submission = await createSubmission({
      scenarioId: scenario.id,
      userId: identity.userId,
      studentName: identity.studentName,
      workUnit: identity.workUnit,
      status: "submitted",
      startedAt: identity.startedAt,
      submittedAt: new Date().toISOString(),
      events: state.attemptEvents,
      answer: state.answer,
      ...(hardwareAnswer ? { hardwareAnswer } : {}),
    });
    setSubmittedId(submission.id);
    setIsSubmitting(false);
  }

  if (stage === "hardware" && scenario.hardwareTask) {
    return (
      <HardwareDiagnosisStep
        equipmentName="DME"
        scenarioTitle={scenario.title}
        diagrams={DME_EQUIPMENT_DIAGRAMS}
        isSubmitting={isSubmitting}
        onBack={() => setStage("pmdt")}
        onSubmit={submit}
      />
    );
  }

  return (
    <div className="bg-[#070a12]">
      <div className="min-w-[1024px] border-b border-[#334155] bg-[#111827] px-4 py-2 text-xs text-[#cbd5e1]">
        <span className="font-bold text-white">{scenario.title}</span>
        <span className="mx-2 text-[#475569]">|</span>
        <span>{identity.studentName} | {identity.workUnit}</span>
      </div>
      <PmdtLayout
        mode="student"
        sidePanel={<DmeStudentJournal scenario={scenario} isSubmitting={isSubmitting} onSubmit={submit} onContinue={scenario.hardwareTask ? () => setStage("hardware") : undefined} />}
      />
    </div>
  );
}

