"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GradingResult } from "@/components/grading/grading-result";
import { completeExamAttemptItemAction } from "@/lib/exams/actions";
import type { OfficialExamScenarioContext } from "@/lib/exams/client-types";
import {
  buildTerminalSessionCacheKey,
  fingerprintTerminalBaseline,
} from "@/lib/terminal-session-cache";
import type { Scenario, SensorState } from "@/lib/types";
import { useRecordingStore } from "@/stores/recording-store";
import { useScenarioStore } from "@/stores/scenario-store";
import { useTerminalStore } from "@/stores/terminal-store";
import { ActionPanel } from "./action-panel";
import { TerminalWindow } from "./terminal-window";

function findSensor(
  sites: ReturnType<typeof useScenarioStore.getState>["scenarios"][number]["sites"],
  sensorId: string,
): SensorState | undefined {
  for (const site of sites) {
    if (site.sensorA?.id === sensorId) return site.sensorA;
    if (site.sensorB?.id === sensorId) return site.sensorB;
  }
  return undefined;
}

function SessionSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] animate-pulse px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-7 w-64 rounded bg-neutral-200" />
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(20rem,3fr)]">
        <div className="min-h-[600px] rounded-lg bg-neutral-900" />
        <div className="min-h-[600px] rounded-lg bg-neutral-200" />
      </div>
    </div>
  );
}

export function TerminalSession({
  scenarioId,
  sensorId,
  officialExam,
  officialScenario,
  cacheOwnerId,
}: {
  scenarioId: string;
  sensorId?: string;
  officialExam?: OfficialExamScenarioContext;
  officialScenario?: Scenario;
  cacheOwnerId: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedSensorId = sensorId ?? searchParams.get("sensorId");
  const scenarios = useScenarioStore((state) => state.scenarios);
  const isHydrated = useScenarioStore((state) => state.isHydrated);
  const storageError = useScenarioStore((state) => state.storageError);
  const hydrate = useScenarioStore((state) => state.hydrate);

  const terminal = useTerminalStore();
  const recording = useRecordingStore();
  const initializedKey = useRef<string | null>(null);
  const [officialSubmitted, setOfficialSubmitted] = useState(false);
  const [officialSaving, setOfficialSaving] = useState(false);
  const [officialError, setOfficialError] = useState<string | null>(null);

  const scenario = useMemo(
    () => officialScenario ?? scenarios.find((item) => item.id === scenarioId),
    [officialScenario, scenarioId, scenarios],
  );
  const selectedSensor = useMemo(() => {
    if (!scenario) return undefined;
    return findSensor(
      scenario.sites,
      requestedSensorId ?? scenario.targetSensorId,
    );
  }, [requestedSensorId, scenario]);
  const isTargetSensor = selectedSensor?.id === scenario?.targetSensorId;
  const terminalCacheKey = useMemo(() => {
    if (!scenario || !selectedSensor) return undefined;

    return buildTerminalSessionCacheKey({
      ownerId: cacheOwnerId,
      sessionKey: officialExam?.sessionKey ?? scenario.id,
      sensorId: selectedSensor.id,
      baselineRevision: `${scenario.updatedAt ?? scenario.createdAt}:${fingerprintTerminalBaseline(
        selectedSensor.dataProfile,
      )}`,
    });
  }, [cacheOwnerId, officialExam?.sessionKey, scenario, selectedSensor]);

  useEffect(() => {
    if (!officialScenario) hydrate();
  }, [hydrate, officialScenario]);

  useEffect(() => {
    if (!scenario || !selectedSensor || !isTargetSensor || !terminalCacheKey) return;
    const key = `${officialExam?.sessionKey ?? scenario.id}:${selectedSensor.id}:${terminalCacheKey}`;
    if (initializedKey.current === key) return;

    recording.beginAttempt(scenario.id, officialExam?.sessionKey ?? scenario.id);
    recording.startTerminal();
    terminal.initialize({
      targetLoginUser: scenario.targetLoginUser,
      targetIpAddress: selectedSensor.ipAddress,
      header: { sensorName: selectedSensor.name },
      sensorDataProfile: selectedSensor.dataProfile,
      sensorMonitoring: selectedSensor.monitoring,
      persistenceKey: terminalCacheKey,
    });
    initializedKey.current = key;
  }, [isTargetSensor, officialExam?.sessionKey, recording, scenario, selectedSensor, terminal, terminalCacheKey]);

  const retry = useCallback(() => {
    if (!scenario || !selectedSensor || !terminalCacheKey) return;
    terminal.clearPersistedSession();
    recording.resetAttempt();
    recording.beginAttempt(scenario.id, officialExam?.sessionKey ?? scenario.id);
    recording.startTerminal();
    terminal.initialize({
      targetLoginUser: scenario.targetLoginUser,
      targetIpAddress: selectedSensor.ipAddress,
      header: { sensorName: selectedSensor.name },
      sensorDataProfile: selectedSensor.dataProfile,
      sensorMonitoring: selectedSensor.monitoring,
      persistenceKey: terminalCacheKey,
    });
  }, [officialExam?.sessionKey, recording, scenario, selectedSensor, terminal, terminalCacheKey]);

  if (!officialScenario && !isHydrated) return <SessionSkeleton />;

  if (!scenario) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <WarningCircle aria-hidden size={40} className="mx-auto text-amber-700" />
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
          Không tìm thấy bài thực hành
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Kịch bản có thể đã bị xóa hoặc địa chỉ không còn hợp lệ.
        </p>
        <Link
          href={officialExam?.returnHref ?? "/student"}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          Về danh sách bài thực hành
        </Link>
      </section>
    );
  }

  if (!selectedSensor || !isTargetSensor) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <WarningCircle aria-hidden size={40} className="mx-auto text-red-700" />
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
          Chưa chọn đúng cảm biến
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Cảm biến vừa mở không phải thiết bị cần xử lý trong kịch bản này. Hãy quay lại QCMS và kiểm tra dấu hiệu cảnh báo.
        </p>
        <Link
          href={officialExam?.scenarioHref ?? `/student/simulation?id=${scenario.id}`}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          <ArrowLeft aria-hidden size={18} />
          Quay lại QCMS
        </Link>
      </section>
    );
  }

  if (officialSubmitted && officialExam) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Đã nộp kịch bản ADS-B</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Dữ liệu thao tác đã được lưu. Điểm chính thức sẽ do giám khảo nhập.</p>
        <Link href={officialExam.returnHref} className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white">Về tiến độ môn thi</Link>
      </section>
    );
  }

  if (!officialExam && recording.gradingResult) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        <GradingResult
          result={recording.gradingResult}
          onRetry={retry}
          backHref="/student"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={officialExam?.scenarioHref ?? `/student/simulation?id=${scenario.id}`}
            className="inline-flex min-h-9 items-center gap-2 rounded text-sm font-semibold text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <ArrowLeft aria-hidden size={17} />
            QCMS
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl">
            Terminal bảo trì
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {scenario.title}. Cảm biến {selectedSensor.sensorLabel} tại {selectedSensor.ipAddress}.
          </p>
        </div>
        <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2">
          <p className="text-xs text-blue-700">Địa chỉ IP thiết bị</p>
          <p className="mt-0.5 font-mono text-sm font-bold text-blue-950">
            {selectedSensor.ipAddress}
          </p>
          <p className="mt-1 font-mono text-[11px] text-blue-800">
            Định dạng: &lt;tài khoản&gt;@{selectedSensor.ipAddress}
          </p>
        </div>
      </div>

      {!officialScenario && storageError ? (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Dữ liệu cục bộ có lỗi. Phiên này đang dùng kịch bản mặc định.
        </div>
      ) : null}
      {officialError ? <div role="alert" className="mb-4 rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">{officialError}</div> : null}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(20rem,3fr)]">
        <TerminalWindow
          ipAddress={selectedSensor.ipAddress}
          output={terminal.output}
          pendingPrompt={terminal.pendingPrompt}
          pendingSensitive={terminal.pendingSensitive}
          isExited={terminal.isExited}
          onSubmit={terminal.processInput}
        />
        <ActionPanel
          actions={recording.allActions}
          selectedActions={recording.selectedActions}
          isRecording={recording.isRecording}
          onToggleRecording={recording.toggleRecording}
          onToggleSelected={recording.toggleSelectAction}
          onSelectAll={recording.selectAll}
          onClearSelection={recording.clearSelection}
          submitLabel={
            scenario.hardwareFault
              ? "Hoàn tất Terminal và tiếp tục"
              : "Nộp bài"
          }
          canSubmit={
            recording.selectedActions.length > 0 &&
            (!scenario.hardwareFault || recording.authenticatedCorrectly)
          }
          onSubmit={() => {
            if (scenario.hardwareFault) {
              recording.completeTerminal();
              router.push(officialExam?.scenarioHref
                ? `${officialExam.scenarioHref}?stage=hardware`
                : `/student/simulation?id=${encodeURIComponent(scenario.id)}&stage=hardware`);
              return;
            }
            if (officialExam) {
              setOfficialSaving(true);
              setOfficialError(null);
              void completeExamAttemptItemAction(officialExam.attemptItemId, {
                result: {
                  moduleCode: "ads-b",
                  startedAt: officialExam.startedAt,
                  submittedAt: new Date().toISOString(),
                  selectedActions: recording.selectedActions,
                  allActions: recording.allActions,
                  authenticatedCorrectly: recording.authenticatedCorrectly,
                  qcmsMonitoringOpened: recording.qcmsMonitoringOpened,
                  diagnosedComponentIds: [],
                  inspectedComponentIds: [],
                },
              }).then((result) => {
                setOfficialSaving(false);
                if (!result.ok) {
                  setOfficialError(result.message);
                  return;
                }
                terminal.clearPersistedSession();
                setOfficialSubmitted(true);
              });
              return;
            }
            recording.submitForGrading(scenario.expectedActions);
          }}
        />
      </div>
      {officialSaving ? <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-4 z-[80] mx-auto w-fit rounded-md bg-[#172033] px-4 py-2 text-sm font-semibold text-white shadow-lg">Đang lưu bài thi...</div> : null}
    </div>
  );
}
