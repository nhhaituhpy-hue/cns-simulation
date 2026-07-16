"use client";

import { ArrowLeft, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { GradingResult } from "@/components/grading/grading-result";
import type { SensorState } from "@/lib/types";
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

export function TerminalSession({ scenarioId }: { scenarioId: string }) {
  const searchParams = useSearchParams();
  const requestedSensorId = searchParams.get("sensorId");
  const scenarios = useScenarioStore((state) => state.scenarios);
  const isHydrated = useScenarioStore((state) => state.isHydrated);
  const storageError = useScenarioStore((state) => state.storageError);
  const hydrate = useScenarioStore((state) => state.hydrate);

  const terminal = useTerminalStore();
  const recording = useRecordingStore();
  const initializedKey = useRef<string | null>(null);

  const scenario = useMemo(
    () => scenarios.find((item) => item.id === scenarioId),
    [scenarioId, scenarios],
  );
  const selectedSensor = useMemo(() => {
    if (!scenario) return undefined;
    return findSensor(
      scenario.sites,
      requestedSensorId ?? scenario.targetSensorId,
    );
  }, [requestedSensorId, scenario]);
  const isTargetSensor = selectedSensor?.id === scenario?.targetSensorId;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!scenario || !selectedSensor || !isTargetSensor) return;
    const key = `${scenario.id}:${selectedSensor.id}`;
    if (initializedKey.current === key) return;

    recording.beginAttempt(scenario.id);
    terminal.initialize({
      targetLoginUser: scenario.targetLoginUser,
      header: { sensorName: selectedSensor.name },
      sensorDataProfile: selectedSensor.dataProfile,
      sensorMonitoring: selectedSensor.monitoring,
    });
    initializedKey.current = key;
  }, [isTargetSensor, recording, scenario, selectedSensor, terminal]);

  const retry = useCallback(() => {
    if (!scenario || !selectedSensor) return;
    recording.resetAttempt();
    recording.beginAttempt(scenario.id);
    terminal.initialize({
      targetLoginUser: scenario.targetLoginUser,
      header: { sensorName: selectedSensor.name },
      sensorDataProfile: selectedSensor.dataProfile,
      sensorMonitoring: selectedSensor.monitoring,
    });
  }, [recording, scenario, selectedSensor, terminal]);

  if (!isHydrated) return <SessionSkeleton />;

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
          href="/student"
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
          href={`/student/simulation?id=${scenario.id}`}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          <ArrowLeft aria-hidden size={18} />
          Quay lại QCMS
        </Link>
      </section>
    );
  }

  if (recording.gradingResult) {
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
            href={`/student/simulation?id=${scenario.id}`}
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
        <div className="font-mono text-xs text-[var(--text-muted)]">
          Tài khoản yêu cầu: {scenario.targetLoginUser}
        </div>
      </div>

      {storageError ? (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Dữ liệu cục bộ có lỗi. Phiên này đang dùng kịch bản mặc định.
        </div>
      ) : null}

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
          onSubmit={() => recording.submitForGrading(scenario.expectedActions)}
        />
      </div>
    </div>
  );
}
