"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ExamPageFrame, secondaryButtonClassName } from "@/components/exams/shared";
import { getScenarioParametersModule } from "@/lib/scenario-parameters";
import type { CandidateScenarioExamItem } from "@/lib/scenario-exams/types";
import { CandidateExamTimer, useScenarioExamRemainingTime } from "./candidate-exam-timer";
import { ScenarioExamSnapshotProvider } from "./scenario-exam-snapshot-context";

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
  const remaining = useScenarioExamRemainingTime(item.deadlineAt);
  const moduleLabel = getScenarioParametersModule(item.moduleId)?.label ?? item.moduleId;
  return (
    <div className="grid gap-4 pb-6">
      <ExamPageFrame>
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="min-w-0">
            <Link href="/student/scenario-exams/session" className={secondaryButtonClassName}><ArrowLeft aria-hidden size={17} />Quay lại phiên thi</Link>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">{item.examName} · {item.candidateName} · {item.candidateUnit}</p>
            <h1 className="mt-1 text-xl font-bold text-[var(--text-primary)]">{moduleLabel} · {item.scenarioName}</h1>
            {item.definition.description ? <p className="mt-2 max-w-4xl text-sm text-[var(--text-secondary)]">{item.definition.description}</p> : null}
          </div>
          <CandidateExamTimer remaining={remaining} />
        </header>
      </ExamPageFrame>
      {remaining === 0 ? (
        <p role="alert" className="mx-4 rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">Phiên thi đã hết thời gian. Hãy quay lại phiên thi để xem trạng thái các môn.</p>
      ) : (
        <ScenarioExamSnapshotProvider snapshot={{ moduleId: item.moduleId, definition: item.definition, sessionKey: `scenario-exam:${item.sessionId}:${item.id}`, revisionKey: `exam:${item.id}:${item.revision}` }}>
          <AssignedSimulator item={item} />
        </ScenarioExamSnapshotProvider>
      )}
    </div>
  );
}
