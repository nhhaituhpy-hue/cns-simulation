"use client";

import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { FloppyDisk } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
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
        <ol className="grid grid-cols-5 border-b border-white/[0.08]">
          {steps.map((step) => {
            const active = currentStep === step.number;
            const complete = currentStep > step.number;

            return (
              <li
                key={step.number}
                aria-current={active ? "step" : undefined}
                className={`border-b-2 px-1 pb-3 text-center text-sm sm:px-3 sm:text-left transition-colors ${
                  active
                    ? "border-[#0284c7] text-[#38a3dc] font-semibold"
                    : complete
                      ? "border-white/20 text-[#E6EDF5]"
                      : "border-transparent text-[#9AA9BC]/50"
                }`}
              >
                <span className="font-mono text-xs tabular-nums sm:mr-2">
                  {step.number}
                </span>
                <span className="sr-only">{step.label}</span>
                <span aria-hidden className="hidden font-medium sm:inline">
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="rounded-[12px] border border-white/[0.08] bg-[#141f2a] p-4 shadow-sm sm:p-6 lg:p-8">
        <header className="mb-7 border-b border-white/[0.08] pb-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#38a3dc]">
            Bước {currentStep} trong 5
          </p>
          <h2 className="mt-1 text-[20px] sm:text-[22px] font-semibold tracking-tight text-[#E6EDF5]">
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
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[8px] border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] leading-5 text-red-200"
        >
          <WarningCircle aria-hidden size={18} className="mt-0.5 shrink-0 text-red-400" />
          <span>{saveError}</span>
        </div>
      ) : null}

      <footer className="flex flex-col-reverse gap-3 rounded-[12px] border border-white/[0.08] bg-[#101922] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <ButtonLink
          href="/authoring/ads-b"
          variant="secondary"
          size="md"
        >
          Hủy
        </ButtonLink>

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={goBack}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5"
            >
              <CaretLeft aria-hidden size={16} weight="bold" />
              <span>Quay lại</span>
            </Button>
          ) : null}

          {currentStep < 5 ? (
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="inline-flex items-center gap-1.5"
            >
              <span>Tiếp tục</span>
              <CaretRight aria-hidden size={16} weight="bold" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5"
            >
              <FloppyDisk aria-hidden size={16} weight="bold" />
              <span>
                {isSaving
                  ? "Đang lưu"
                  : editing
                    ? "Lưu thay đổi"
                    : "Tạo kịch bản"}
              </span>
            </Button>
          )}
        </div>
      </footer>
    </form>
  );
}
