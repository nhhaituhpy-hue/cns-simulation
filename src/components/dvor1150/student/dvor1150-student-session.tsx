"use client";

import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createDvor1150StudentScenario,
  evaluateDvor1150Scenario,
} from "@/lib/dvor1150";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { Dvor1150PmdtLayout } from "../pmdt-layout";
import { Dvor1150HardwareStage } from "../dvor1150-hardware-stage";
import {
  Dvor1150StudentActivity,
  Dvor1150StudentJournal,
  type Dvor1150StudentAnswer,
  type Dvor1150StudentEvent,
} from "./dvor1150-student-journal";

interface Dvor1150StudentSessionProps {
  scenarioId: string;
  identity: {
    studentName: string;
    workUnit: string;
  };
}

const emptyAnswer: Dvor1150StudentAnswer = {
  suspectedFault: "",
  reasoning: "",
  remediation: "",
};

export function Dvor1150StudentSession({ scenarioId, identity }: Dvor1150StudentSessionProps) {
  const scenario = useMemo(() => createDvor1150StudentScenario(scenarioId), [scenarioId]);
  const initializeStudentScenario = useDvor1150PmdtStore((state) => state.initializeStudentScenario);
  const loginDialogOpen = useDvor1150PmdtStore((state) => state.loginDialogOpen);
  const activeScreen = useDvor1150PmdtStore((state) => state.activeScreen);
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const activeMenuPath = useDvor1150PmdtStore((state) => state.activeMenuPath);
  const lastCommand = useDvor1150PmdtStore((state) => state.lastCommand);
  const runtime = useDvor1150PmdtStore((state) => state.scenario);
  const derived = useDvor1150PmdtStore((state) => state.derived);
  const config = useDvor1150PmdtStore((state) => state.config);
  const scenarioStage = useDvor1150PmdtStore((state) => state.scenarioStage);
  const scenarioVisitedViewIds = useDvor1150PmdtStore((state) => state.scenarioVisitedViewIds);
  const scenarioAcceptedActionControlIds = useDvor1150PmdtStore((state) => state.scenarioAcceptedActionControlIds);
  const scenarioHardwareSelection = useDvor1150PmdtStore((state) => state.scenarioHardwareSelection);
  const scenarioHardwareDispositionConfirmed = useDvor1150PmdtStore((state) => state.scenarioHardwareDispositionConfirmed);
  const setScenarioStage = useDvor1150PmdtStore((state) => state.setScenarioStage);
  const [sessionReady, setSessionReady] = useState(false);
  const [answer, setAnswer] = useState<Dvor1150StudentAnswer>(emptyAnswer);
  const [events, setEvents] = useState<Dvor1150StudentEvent[]>([]);
  const initializedScenarioRef = useRef<string | null>(null);
  const lastRecordedActivityRef = useRef<string | null>(null);

  useEffect(() => {
    if (!scenario || initializedScenarioRef.current === scenarioId) return;
    initializedScenarioRef.current = scenarioId;
    setSessionReady(initializeStudentScenario(scenario));
  }, [initializeStudentScenario, scenario, scenarioId]);

  useEffect(() => {
    if (!sessionReady || loginDialogOpen) return;
    const signature = [activeScreen, activeView, activeMenuPath.join(" › "), lastCommand ?? ""].join("|");
    if (activeScreen === "home" && activeView === "home" && !lastCommand) return;
    if (signature === lastRecordedActivityRef.current) return;
    lastRecordedActivityRef.current = signature;

    const title = activeScreen !== "home"
      ? activeMenuPath.at(-1) ?? activeView
      : lastCommand ?? activeView;
    setEvents((current) => [
      ...current,
      {
        id: `dvor1150-event-${Date.now()}-${current.length}`,
        sequence: current.length + 1,
        title,
        menuPath: activeMenuPath.length > 0 ? [...activeMenuPath] : ["PMDT"],
        detail: lastCommand && title !== lastCommand ? lastCommand : undefined,
        annotation: "",
      },
    ]);
  }, [activeMenuPath, activeScreen, activeView, lastCommand, loginDialogOpen, sessionReady]);

  if (!scenario) {
    return (
      <main className="grid min-h-[calc(100dvh-4.5rem)] place-items-center bg-[var(--surface-muted)] px-4">
        <div className="max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-card)]">
          <WarningCircle aria-hidden size={38} className="mx-auto text-[#d97706]" />
          <h1 className="mt-4 text-xl font-bold text-[var(--text-primary)]">Không tìm thấy kịch bản DVOR 1150</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Kịch bản có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.</p>
          <Link href="/student/dvor-1150" className="mt-5 inline-flex h-10 items-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white">
            Quay lại danh sách
          </Link>
        </div>
      </main>
    );
  }

  if (!sessionReady) {
    return <div role="status" className="grid min-h-[calc(100dvh-4.5rem)] place-items-center bg-[#070a12] text-sm text-[#94a3b8]">Đang chuẩn bị phiên thực hành DVOR 1150…</div>;
  }

  const evaluation = evaluateDvor1150Scenario(runtime, derived, config, {
    visitedViewIds: scenarioVisitedViewIds,
    acceptedActionControlIds: scenarioAcceptedActionControlIds,
    selectedHardwareOccurrenceKeys: scenarioHardwareSelection,
    hardwareDispositionConfirmed: scenarioHardwareDispositionConfirmed,
  });

  if (scenarioStage === "hardware") return <Dvor1150HardwareStage />;

  if (scenarioStage === "complete") {
    return (
      <main className="grid min-h-[calc(100dvh-4.5rem)] place-items-center bg-[var(--surface-muted)] px-4">
        <div className="max-w-lg rounded border border-[#aebbc5] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <CheckCircle aria-hidden size={44} weight="fill" className="mx-auto text-[#16a34a]" />
          <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Đã hoàn thành kịch bản DVOR 1150</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Đã ghi nhận đủ bước PMDT và xác định phần cứng/biện pháp xử lý. Giám khảo có thể xem lại nhật ký thao tác và căn cứ chẩn đoán.</p>
          <Link href="/student/dvor-1150" className="mt-6 inline-flex h-10 items-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white">Về danh sách kịch bản</Link>
        </div>
      </main>
    );
  }

  return (
    <div className="dvor1150-pmdt-page min-w-[1024px] bg-[#070a12]">
      <div className="min-w-[1024px] border-b border-[#334155] bg-[#111827] px-4 py-2 text-center text-xs text-[#cbd5e1]">
        <span className="font-bold text-white">{scenario.name}</span>
        <span className="mx-2 text-[#475569]">|</span>
        <span>{identity.studentName} | {identity.workUnit}</span>
      </div>
      <Dvor1150PmdtLayout
        mode="student"
        leadingPanel={<Dvor1150StudentJournal scenario={scenario} answer={answer} onAnswerChange={(changes) => setAnswer((current) => ({ ...current, ...changes }))} />}
        sidePanel={<Dvor1150StudentActivity events={events} evaluation={evaluation} onContinue={scenario.diagnosis && evaluation.pmdtComplete ? () => setScenarioStage("hardware") : undefined} onUpdateEvent={(eventId, annotation) => setEvents((current) => current.map((event) => event.id === eventId ? { ...event, annotation } : event))} onRemoveEvent={(eventId) => setEvents((current) => current.filter((event) => event.id !== eventId).map((event, index) => ({ ...event, sequence: index + 1 })))} />}
      />
    </div>
  );
}
