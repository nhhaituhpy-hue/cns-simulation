"use client";

import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { FloppyDisk } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type {
  Scenario,
  ScenarioHardwareFault,
  SensorMonitoringData,
  SensorState,
} from "@/lib/types";
import { ActionBuilder } from "./action-builder";
import { LoginRoleStep } from "./login-role-step";
import { HardwareFaultStep } from "./hardware-fault-step";
import { ScenarioMetadataStep } from "./scenario-metadata-step";
import {
  createInitialScenarioDraft,
  scenarioToDraft,
  validateScenarioDraft,
  validateScenarioStep,
  type ScenarioDraft,
  type ValidationErrors,
} from "./scenario-form-utils";
import { SiteStateEditor } from "./site-state-editor";

type ScenarioWizardFormProps = {
  initialScenario?: Scenario;
  onSave: (draft: ScenarioDraft) => void | Promise<void>;
};

const steps = [
  { number: 1, label: "Thông tin" },
  { number: 2, label: "Site và cảm biến" },
  { number: 3, label: "Vai trò đăng nhập" },
  { number: 4, label: "Thao tác chuẩn" },
  { number: 5, label: "Sự cố phần cứng" },
] as const;

function findTargetSensor(draft: ScenarioDraft): SensorState | null {
  for (const site of draft.sites) {
    for (const sensor of [site.sensorA, site.sensorB]) {
      if (sensor?.id === draft.targetSensorId) {
        return sensor;
      }
    }
  }

  return null;
}

function firstInvalidStep(errors: ValidationErrors): number {
  const keys = Object.keys(errors);
  if (keys.some((key) => key === "title" || key === "description")) return 1;
  if (
    keys.some(
      (key) =>
        key === "sites" ||
        key === "targetSensorId" ||
        key.startsWith("site.") ||
        key.startsWith("sensor."),
    )
  ) {
    return 2;
  }
  if (keys.includes("targetLoginUser")) return 3;
  if (keys.includes("hardwareFault")) return 5;
  return 4;
}

export function ScenarioWizardForm({
  initialScenario,
  onSave,
}: ScenarioWizardFormProps) {
  const [draft, setDraft] = useState<ScenarioDraft>(() =>
    initialScenario
      ? scenarioToDraft(initialScenario)
      : createInitialScenarioDraft(),
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editing = Boolean(initialScenario);
  const targetSensor = findTargetSensor(draft);

  function updateDraft(changes: Partial<ScenarioDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
    setErrors({});
    setSaveError(null);
  }

  function updateHardwareFault(hardwareFault: ScenarioHardwareFault | undefined) {
    const updateTargetSensor = (sensor: SensorState | null): SensorState | null => {
      if (!sensor || sensor.id !== draft.targetSensorId) return sensor;
      const status = hardwareFault?.expectedSensorStatus ?? "green";
      if (!hardwareFault) return { ...sensor, status };

      const now = new Date();
      const monitoring: SensorMonitoringData = {
        lastSnmpResponseAt: now.toISOString(),
        temperatureC: 43,
        cpuLoadPercent: 20,
        voltages: { v3_3: 3.3, v5: 5, v12: 12 },
        receiverConfidencePercent: 96,
        crcErrorCount: 0,
        gpsStatus: "synchronized",
      };
      const adjusted = {
        ...monitoring,
        voltages: { ...monitoring.voltages },
      };

      if (["red", "magenta", "grey"].includes(status)) {
        adjusted.lastSnmpResponseAt = new Date(
          now.getTime() - 5 * 60_000,
        ).toISOString();
        adjusted.receiverConfidencePercent = 0;
        adjusted.gpsStatus = "unavailable";
      } else if (status === "yellow") {
        adjusted.receiverConfidencePercent = 0;
        adjusted.crcErrorCount = 0;
      } else if (status === "orange") {
        adjusted.temperatureC = 62;
        adjusted.cpuLoadPercent = 76;
        adjusted.receiverConfidencePercent = 72;
      }

      if (hardwareFault.faultyComponentIds.includes("gps-cable-1")) {
        adjusted.gpsStatus = "unsynchronized";
      }

      return { ...sensor, status, monitoring: adjusted };
    };

    const sites = draft.sites.map((site) => ({
      ...site,
      sensorA: updateTargetSensor(site.sensorA),
      sensorB: updateTargetSensor(site.sensorB),
    }));
    updateDraft({ hardwareFault, sites });
  }

  function goNext() {
    const nextErrors = validateScenarioStep(draft, currentStep);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setCurrentStep((step) => Math.min(step + 1, 5));
      window.scrollTo({ top: 0 });
    }
  }

  function goBack() {
    setErrors({});
    setCurrentStep((step) => Math.max(step - 1, 1));
    window.scrollTo({ top: 0 });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (currentStep < 5) {
      goNext();
      return;
    }

    const allErrors = validateScenarioDraft(draft);
    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      setCurrentStep(firstInvalidStep(allErrors));
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave({
        ...draft,
        title: draft.title.trim(),
        description: draft.description.trim(),
      });
    } catch {
      setSaveError("Không thể lưu kịch bản. Hãy kiểm tra dữ liệu và thử lại.");
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <nav aria-label="Các bước tạo kịch bản" className="pb-1">
        <ol className="grid grid-cols-5 border-b border-[var(--border)]">
          {steps.map((step) => {
            const active = currentStep === step.number;
            const complete = currentStep > step.number;

            return (
              <li
                key={step.number}
                aria-current={active ? "step" : undefined}
                className={`border-b-2 px-1 pb-3 text-center text-sm sm:px-3 sm:text-left ${
                  active
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : complete
                      ? "border-[var(--border-strong)] text-[var(--text-primary)]"
                      : "border-transparent text-[var(--text-muted)]"
                }`}
              >
                <span className="font-mono text-xs tabular-nums sm:mr-2">
                  {step.number}
                </span>
                <span className="sr-only">{step.label}</span>
                <span aria-hidden className="hidden font-semibold sm:inline">
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:p-6 lg:p-8">
        <header className="mb-7 border-b border-[var(--border)] pb-5">
          <p className="text-sm font-medium text-[var(--accent)]">
            Bước {currentStep} trong 5
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
            {currentStep === 1 ? "Thông tin kịch bản" : null}
            {currentStep === 2 ? "Cấu hình trạng thái ban đầu" : null}
            {currentStep === 3 ? "Chọn vai trò đăng nhập" : null}
            {currentStep === 4 ? "Xây dựng đáp án thao tác" : null}
            {currentStep === 5 ? "Kịch bản sự cố phần cứng" : null}
          </h2>
        </header>

        {currentStep === 1 ? (
          <ScenarioMetadataStep
            draft={draft}
            errors={errors}
            onChange={updateDraft}
          />
        ) : null}

        {currentStep === 2 ? (
          <SiteStateEditor
            sites={draft.sites}
            targetSensorId={draft.targetSensorId}
            errors={errors}
            onChange={(sites, targetSensorId) =>
              updateDraft({ sites, targetSensorId })
            }
          />
        ) : null}

        {currentStep === 3 ? (
          <LoginRoleStep
            value={draft.targetLoginUser}
            errors={errors}
            hasRecordedActions={draft.expectedActions.length > 0}
            onChange={(targetLoginUser) =>
              updateDraft({
                targetLoginUser,
                expectedActions:
                  targetLoginUser === draft.targetLoginUser
                    ? draft.expectedActions
                    : [],
              })
            }
          />
        ) : null}

        {currentStep === 4 ? (
          <ActionBuilder
            key={`${draft.targetLoginUser}-${draft.targetSensorId}`}
            loginUser={draft.targetLoginUser}
            sensorName={targetSensor?.name ?? "Quadrant ADS-B sensor"}
            sensorDataProfile={targetSensor?.dataProfile}
            actions={draft.expectedActions}
            error={errors.expectedActions}
            onChange={(expectedActions) => updateDraft({ expectedActions })}
          />
        ) : null}

        {currentStep === 5 ? (
          <HardwareFaultStep
            value={draft.hardwareFault}
            error={errors.hardwareFault}
            onChange={updateHardwareFault}
          />
        ) : null}
      </section>

      {saveError ? (
        <p
          role="alert"
          className="rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]"
        >

          {saveError}
        </p>
      ) : null}

      <footer className="flex flex-col-reverse gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/ads-b"
          className="inline-flex h-10 items-center justify-center rounded px-4 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          Hủy
        </Link>

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CaretLeft aria-hidden size={17} weight="regular" />
              Quay lại
            </button>
          ) : null}

          {currentStep < 5 ? (
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:bg-[var(--accent-active)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Tiếp tục
              <CaretRight aria-hidden size={17} weight="regular" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:bg-[var(--accent-active)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FloppyDisk aria-hidden size={18} weight="regular" />
              {isSaving
                ? "Đang lưu"
                : editing
                  ? "Lưu thay đổi"
                  : "Tạo kịch bản"}
            </button>
          )}
        </div>
      </footer>
    </form>
  );
}
