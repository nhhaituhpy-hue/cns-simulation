"use client";

import Link from "next/link";
import { ArrowLeft, Warning, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { HardwareDiagnosisWorkspace } from "@/components/hardware/hardware-diagnosis-workspace";
import { HardwareGradingResult } from "@/components/grading/hardware-grading-result";
import { useRecordingStore } from "@/stores/recording-store";
import { useScenarioStore } from "@/stores/scenario-store";
import { GeneralSettingsDialog } from "./general-settings-dialog";
import { DIFFICULTY_DETAILS } from "./qcms-utils";
import { ElapsedTimer } from "./elapsed-timer";
import { LogWindow } from "./log-window";
import { QcmsToolbar, type QcmsPanel } from "./qcms-toolbar";
import { ReplayDialog } from "./replay-dialog";
import { ScenarioMonitorLoading } from "./student-loading";
import { SiteMonitor } from "./site-monitor";

type ScenarioMonitorViewProps = {
  scenarioId: string;
  autoOpenHardware?: boolean;
};

export function ScenarioMonitorView({
  scenarioId,
  autoOpenHardware = false,
}: ScenarioMonitorViewProps) {
  const recording = useRecordingStore();
  const [activePanel, setActivePanel] = useState<QcmsPanel>("sites");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hardwareDiagnosisRequested, setHardwareDiagnosisRequested] =
    useState(false);
  const [hardwareDiagnosisClosed, setHardwareDiagnosisClosed] = useState(false);
  const { isHydrated, storageError, hydrate, getScenarioById } =
    useScenarioStore();
  const scenario = getScenarioById(scenarioId);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (scenario) {
      recording.beginAttempt(scenario.id);
    }
  }, [recording, scenario]);

  const showHardwareDiagnosis =
    hardwareDiagnosisRequested ||
    (!hardwareDiagnosisClosed &&
      (autoOpenHardware || recording.phase === "hardware"));

  function openHardwareDiagnosis() {
    setHardwareDiagnosisClosed(false);
    setHardwareDiagnosisRequested(true);
  }

  function closeHardwareDiagnosis() {
    setHardwareDiagnosisRequested(false);
    setHardwareDiagnosisClosed(true);
  }


  if (!isHydrated) {
    return <ScenarioMonitorLoading />;
  }

  if (!scenario) {
    return (
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-2xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
        <WarningCircle
          aria-hidden
          size={38}
          weight="regular"
          className="text-[var(--text-muted)]"
        />
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
          Không tìm thấy bài thực hành
        </h1>
        <p className="mt-2 max-w-[52ch] text-sm leading-6 text-[var(--text-secondary)]">
          Kịch bản có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.
        </p>
        <Link
          href="/student"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
        >
          <ArrowLeft aria-hidden size={17} />
          Về danh sách bài thực hành
        </Link>
      </section>
    );
  }

  const expectedHardwareComponents =
    scenario.hardwareFault?.hardwareLayout.filter((component) =>
      scenario.hardwareFault?.faultyComponentIds.includes(component.id),
    ) ?? [];
  const difficulty = DIFFICULTY_DETAILS[scenario.difficulty];
  const hardwareAvailable =
    Boolean(scenario.hardwareFault) && recording.phase === "hardware";

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/student"
            className="inline-flex min-h-9 items-center gap-2 rounded px-1 text-sm font-semibold text-[var(--accent)] hover:underline"
          >
            <ArrowLeft aria-hidden size={17} />
            Danh sách bài thực hành
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              {scenario.title}
            </h1>
            <span
              className={`inline-flex rounded border px-2.5 py-1 text-xs font-semibold ${difficulty.className}`}
            >
              {difficulty.label}
            </span>
          </div>
          <p className="mt-2 max-w-[75ch] text-sm leading-6 text-[var(--text-secondary)]">
            {scenario.description}
          </p>
        </div>
        <ElapsedTimer />
      </header>

      {scenario.hardwareFault ? (
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-white p-4">
          <ol
            aria-label="Tiến trình bài thực hành"
            className="grid gap-2 text-xs font-semibold sm:grid-cols-3"
          >
            {[
              ["1", "QCMS"],
              ["2", "Terminal"],
              ["3", "Sơ đồ phần cứng"],
            ].map(([number, label], index) => {
              const phaseIndex = {
                qcms: 0,
                terminal: 1,
                hardware: 2,
                completed: 3,
              }[recording.phase];
              const completed = index < phaseIndex;
              const active = index === phaseIndex;
              return (
                <li
                  key={number}
                  className={`rounded border px-3 py-2 ${
                    active
                      ? "border-blue-400 bg-blue-50 text-blue-900"
                      : completed
                        ? "border-green-300 bg-green-50 text-green-800"
                        : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  {number}. {label}
                </li>
              );
            })}
          </ol>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={
                "/student/terminal?id=" +
                encodeURIComponent(scenario.id) +
                "&sensorId=" +
                encodeURIComponent(scenario.targetSensorId)
              }
              className="inline-flex min-h-10 items-center rounded border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--surface-muted)]"
            >
              Mở Terminal
            </Link>
            <button
              type="button"
              disabled={!hardwareAvailable}
              onClick={openHardwareDiagnosis}
              className="inline-flex min-h-10 items-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)]"
            >
              Sơ đồ phần cứng
            </button>
          </div>
          {!hardwareAvailable && recording.phase !== "completed" ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Hoàn tất phần Terminal trước khi mở sơ đồ phần cứng.
            </p>
          ) : null}
        </div>
      ) : null}

      {storageError ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-3 rounded border border-[#f59e0b] bg-[#fffbeb] p-3 text-[#78350f]"
        >
          <Warning aria-hidden className="mt-0.5 shrink-0" size={18} weight="fill" />
          <p className="text-sm leading-5">
            Dữ liệu lưu cục bộ có lỗi. Màn hình đang dùng kịch bản mẫu.
          </p>
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-[#40566b] bg-white shadow-[var(--shadow-card)]">
        <QcmsToolbar
          activePanel={activePanel}
          onSelect={setActivePanel}
          onExit={() => setShowExitConfirm(true)}
        />

        {activePanel === "sites" ? (
          <div className="p-4 sm:p-5">
            <SiteMonitor
              scenario={scenario}
              onMonitoringOpened={recording.markQcmsMonitoringOpened}
            />
          </div>
        ) : activePanel === "log" ? (
          <LogWindow scenario={scenario} onClose={() => setActivePanel("sites")} />
        ) : activePanel === "replay" ? (
          <ReplayDialog onClose={() => setActivePanel("sites")} />
        ) : (
          <GeneralSettingsDialog onClose={() => setActivePanel("sites")} />
        )}
      </div>

      {showHardwareDiagnosis &&
      recording.phase === "hardware" &&
      scenario.hardwareFault ? (
        <HardwareDiagnosisWorkspace
          hardwareFault={scenario.hardwareFault}
          onClose={closeHardwareDiagnosis}
          onSubmit={(diagnosis) => {
            recording.submitCombinedAttempt(
              scenario.expectedActions,
              scenario.hardwareFault?.faultyComponentIds ?? [],
              diagnosis.componentIds,
              diagnosis.inspectedComponents,
            );
            closeHardwareDiagnosis();
          }}
        />
      ) : null}

      {recording.combinedGradingResult &&
      scenario.hardwareFault &&
      expectedHardwareComponents.length > 0 ? (
        <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#172033]/60 p-4">
          <HardwareGradingResult
            result={recording.combinedGradingResult}
            expectedComponents={scenario.hardwareFault.hardwareLayout}
            hardwareFault={scenario.hardwareFault}
            onRetry={() => {
              recording.resetAttempt();
              recording.beginAttempt(scenario.id);
              closeHardwareDiagnosis();
            }}
          />
        </div>
      ) : null}

      {showExitConfirm ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#17212b]/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setShowExitConfirm(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="qcms-exit-title"
            aria-describedby="qcms-exit-description"
            className="w-full max-w-md rounded-lg border border-[var(--border)] bg-white p-5 shadow-xl"
          >
            <h2
              id="qcms-exit-title"
              className="text-lg font-semibold text-[var(--text-primary)]"
            >
              Thoát QCMS?
            </h2>
            <p
              id="qcms-exit-description"
              className="mt-2 text-sm leading-6 text-[var(--text-secondary)]"
            >
              Đây là thao tác mô phỏng. Phiên thực hành và dữ liệu hiện tại sẽ
              được giữ nguyên.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="h-10 rounded border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
              >
                Không
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="h-10 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                Xác nhận mô phỏng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
