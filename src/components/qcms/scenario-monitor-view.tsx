"use client";

import Link from "next/link";
import { ArrowLeft, Warning, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { HardwareDiagnosisWorkspace } from "@/components/hardware/hardware-diagnosis-workspace";
import { GeneralSettingsDialog } from "./general-settings-dialog";
import { HardwareGradingResult } from "@/components/grading/hardware-grading-result";
import {
  gradeHardwareDiagnosis,
  type HardwareGradingResult as HardwareGradingData,
} from "@/lib/grading";
import { useScenarioStore } from "@/stores/scenario-store";
import { DIFFICULTY_DETAILS } from "./qcms-utils";
import { ElapsedTimer } from "./elapsed-timer";
import { LogWindow } from "./log-window";
import { QcmsToolbar, type QcmsPanel } from "./qcms-toolbar";
import { ReplayDialog } from "./replay-dialog";
import { ScenarioMonitorLoading } from "./student-loading";
import { SiteMonitor } from "./site-monitor";

type ScenarioMonitorViewProps = {
  scenarioId: string;
};

export function ScenarioMonitorView({ scenarioId }: ScenarioMonitorViewProps) {
  const [activePanel, setActivePanel] = useState<QcmsPanel>("sites");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showHardwareDiagnosis, setShowHardwareDiagnosis] = useState(false);
  const [hardwareResult, setHardwareResult] =
    useState<HardwareGradingData | null>(null);
  const [hardwareActions, setHardwareActions] = useState({
    openedTerminal: false,
    openedMonitoring: false,
    inspectedComponents: [] as string[],
  });
  const {
    isHydrated,
    storageError,
    hydrate,
    getScenarioById,
  } = useScenarioStore();
  const scenario = getScenarioById(scenarioId);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          <ArrowLeft aria-hidden size={17} weight="regular" />
          Về danh sách bài
        </Link>

      </section>
    );
  }

  const expectedHardwareComponent = scenario.hardwareFault?.hardwareLayout.find(
    (component) =>
      component.id === scenario.hardwareFault?.faultyComponentId,
  );

  const difficulty = DIFFICULTY_DETAILS[scenario.difficulty];

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/student"
            className="inline-flex min-h-9 items-center gap-2 rounded px-1 text-sm font-semibold text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <ArrowLeft aria-hidden size={17} weight="regular" />
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
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={
              "/student/terminal?id=" +
              encodeURIComponent(scenario.id) +
              "&sensorId=" +
              encodeURIComponent(scenario.targetSensorId)
            }
            onClick={() =>
              setHardwareActions((current) => ({
                ...current,
                openedTerminal: true,
              }))
            }
            className="inline-flex min-h-10 items-center rounded border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--surface-muted)]"
          >
            Open Terminal
          </Link>
          <button
            type="button"
            onClick={() => setShowHardwareDiagnosis(true)}
            className="inline-flex min-h-10 items-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            Hardware Diagram
          </button>
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
              onMonitoringOpened={() =>
                setHardwareActions((current) => ({
                  ...current,
                  openedMonitoring: true,
                }))
              }
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

      {showHardwareDiagnosis && scenario.hardwareFault ? (
        <HardwareDiagnosisWorkspace
          hardwareFault={scenario.hardwareFault}
          onClose={() => setShowHardwareDiagnosis(false)}
          onSubmit={(diagnosis) => {
            setHardwareActions((current) => ({
              ...current,
              inspectedComponents: diagnosis.inspectedComponents,
            }));
            const result = gradeHardwareDiagnosis(
              { componentId: scenario.hardwareFault?.faultyComponentId ?? "" },
              { componentId: diagnosis.componentId },
              { ...hardwareActions, inspectedComponents: diagnosis.inspectedComponents },
            );
            setHardwareResult(result);
            setShowHardwareDiagnosis(false);
          }}
        />
      ) : null}


      {hardwareResult &&
      scenario.hardwareFault &&
      expectedHardwareComponent ? (
        <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#172033]/60 p-4">
          <HardwareGradingResult
            result={hardwareResult}
            expectedComponent={expectedHardwareComponent}
            hardwareFault={scenario.hardwareFault}
            onRetry={() => {
              setHardwareResult(null);
              setShowHardwareDiagnosis(true);
              setHardwareActions((current) => ({
                ...current,
                inspectedComponents: [],
              }));
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
              {"Tho\u00e1t QCMS?"}
            </h2>
            <p
              id="qcms-exit-description"
              className="mt-2 text-sm leading-6 text-[var(--text-secondary)]"
            >
              {
                "\u0110\u00e2y l\u00e0 thao t\u00e1c m\u00f4 ph\u1ecfng. Phi\u00ean th\u1ef1c h\u00e0nh v\u00e0 d\u1eef li\u1ec7u hi\u1ec7n t\u1ea1i s\u1ebd \u0111\u01b0\u1ee3c gi\u1eef nguy\u00ean."
              }
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="h-10 rounded border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                {"Kh\u00f4ng"}
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="h-10 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                {"X\u00e1c nh\u1eadn m\u00f4 ph\u1ecfng"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
