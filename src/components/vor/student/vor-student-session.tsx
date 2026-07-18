"use client";

import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HardwareDiagnosisStep } from "@/components/hardware/hardware-diagnosis-step";
import type { HardwareDiagnosisAnswer } from "@/lib/equipment-diagram-types";
import { completeExamAttemptItemAction } from "@/lib/exams/actions";
import type { OfficialExamScenarioContext } from "@/lib/exams/client-types";
import type { VorScenario } from "@/lib/vor-types";
import { VOR_EQUIPMENT_DIAGRAMS } from "@/lib/vor-hardware-model";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { useVorScenarioStore } from "@/stores/vor-scenario-store";
import { useVorSubmissionStore } from "@/stores/vor-submission-store";
import { PmdtLayout } from "../pmdt-layout";
import { VorStudentJournal } from "./vor-student-journal";

interface VorStudentSessionProps {
  scenarioId: string;
  officialExam?: OfficialExamScenarioContext;
  officialScenario?: VorScenario;
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

export function VorStudentSession({ scenarioId, identity: authIdentity, officialExam, officialScenario }: VorStudentSessionProps) {
  const scenarios = useVorScenarioStore((state) => state.scenarios);
  const isHydrated = useVorScenarioStore((state) => state.isHydrated);
  const hydrateScenarios = useVorScenarioStore((state) => state.hydrate);
  const hydrateSubmissions = useVorSubmissionStore((state) => state.hydrate);
  const createSubmission = useVorSubmissionStore((state) => state.createSubmission);
  const initializeSession = useVorPmdtStore((state) => state.initializeSession);
  const activeSessionMode = useVorPmdtStore((state) => state.mode);
  const activeScenarioId = useVorPmdtStore((state) => state.scenarioId);
  const activeSessionKey = useVorPmdtStore((state) => state.sessionKey);
  const activeUserId = useVorPmdtStore((state) => state.userId);
  const [startedAt] = useState(() => new Date().toISOString());
  const identity: ActiveIdentity = { ...authIdentity, startedAt: officialExam?.startedAt ?? startedAt };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stage, setStage] = useState<"pmdt" | "hardware">("pmdt");
  const scenario = officialScenario ?? scenarios.find((item) => item.id === scenarioId);
  const sessionInitialized =
    activeSessionMode === "student" &&
    activeScenarioId === scenarioId &&
    activeSessionKey === (officialExam?.sessionKey ?? scenarioId) &&
    activeUserId === authIdentity.userId;

  useEffect(() => {
    if (!officialScenario) void hydrateScenarios();
    if (!officialExam) void hydrateSubmissions();
  }, [hydrateScenarios, hydrateSubmissions, officialExam, officialScenario]);

  useEffect(() => {
    if (!scenario || sessionInitialized) return;
    initializeSession({
      mode: "student",
      scenarioId: scenario.id,
      sessionKey: officialExam?.sessionKey ?? scenario.id,
      userId: identity.userId,
      studentName: identity.studentName,
      workUnit: identity.workUnit,
      overrides: scenario.overrides,
      expectedCheckpoints: scenario.expectedCheckpoints,
    });
  }, [identity.studentName, identity.userId, identity.workUnit, initializeSession, officialExam?.sessionKey, scenario, sessionInitialized]);

  if (!officialScenario && !isHydrated) {
    return <div role="status" className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-[var(--surface-muted)] text-sm text-[var(--text-secondary)]">Đang tải kịch bản VOR…</div>;
  }

  if (!scenario) {
    return (
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-[var(--surface-muted)] px-4">
        <div className="max-w-md rounded-xl border border-[var(--border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <WarningCircle aria-hidden size={38} className="mx-auto text-[#d97706]" />
          <h1 className="mt-4 text-xl font-bold text-[var(--text-primary)]">Không tìm thấy kịch bản VOR</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Kịch bản có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.</p>
          <Link href={officialExam?.returnHref ?? "/student/vor"} className="mt-5 inline-flex h-10 items-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white">Quay lại danh sách</Link>
        </div>
      </main>
    );
  }

  if (submittedId) {
    return (
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-[var(--surface-muted)] px-4">
        <div className="max-w-lg rounded-xl border border-[var(--border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <CheckCircle aria-hidden size={44} weight="fill" className="mx-auto text-[#16a34a]" />
          <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Đã nộp bài VOR</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Bài làm đã được lưu để giám khảo đọc nhật ký thao tác, nhận xét câu trả lời và nhập điểm chính thức.</p>
          <p className="mt-3 font-mono text-xs text-[var(--text-muted)]">Mã bài nộp: {submittedId}</p>
          <Link href={officialExam?.returnHref ?? "/student/vor"} className="mt-6 inline-flex h-10 items-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white">{officialExam ? "Về tiến độ môn thi" : "Về danh sách bài thực hành"}</Link>
        </div>
      </main>
    );
  }

  if (!sessionInitialized) {
    return <div role="status" className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-[var(--surface-muted)] text-sm text-[var(--text-secondary)]">Đang chuẩn bị phiên thực hành VOR…</div>;
  }

  async function submit(hardwareAnswer?: HardwareDiagnosisAnswer) {
    if (!scenario) return;
    setIsSubmitting(true);
    setSubmitError(null);
    const state = useVorPmdtStore.getState();
    if (officialExam) {
      const submittedAt = new Date().toISOString();
      const result = await completeExamAttemptItemAction(officialExam.attemptItemId, {
        result: {
          moduleCode: "vor",
          startedAt: identity.startedAt,
          submittedAt,
          events: state.attemptEvents,
          answer: state.answer,
          ...(hardwareAnswer ? { hardwareAnswer } : {}),
        },
      });
      if (!result.ok) {
        setSubmitError(result.message);
        setIsSubmitting(false);
        return;
      }
      setSubmittedId(officialExam.attemptItemId);
      setIsSubmitting(false);
      return;
    }
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
        equipmentName="VOR"
        scenarioTitle={scenario.title}
        diagrams={VOR_EQUIPMENT_DIAGRAMS}
        isSubmitting={isSubmitting}
        onBack={() => setStage("pmdt")}
        onSubmit={submit}
      />
    );
  }

  return (
    <div className="bg-[#070a12]">
      {submitError ? <div role="alert" className="min-w-[1024px] border-b border-red-800 bg-red-950 px-4 py-2 text-sm text-red-100">{submitError}</div> : null}
      <div className="min-w-[1024px] border-b border-[#334155] bg-[#111827] px-4 py-2 text-xs text-[#cbd5e1]">
        <span className="font-bold text-white">{scenario.title}</span>
        <span className="mx-2 text-[#475569]">|</span>
        <span>{identity.studentName} | {identity.workUnit}</span>
      </div>
      <PmdtLayout
        mode="student"
        sidePanel={<VorStudentJournal scenario={scenario} isSubmitting={isSubmitting} onSubmit={submit} onContinue={scenario.hardwareTask ? () => setStage("hardware") : undefined} />}
      />
    </div>
  );
}
