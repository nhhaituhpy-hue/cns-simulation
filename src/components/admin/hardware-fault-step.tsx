"use client";

import { useState } from "react";
import { ComponentInspector } from "@/components/hardware/component-inspector";
import { SignalPathDiagram } from "@/components/hardware/signal-path-diagram";
import {
  CON_SON_FAULT_SCENARIOS,
  findFaultPreset,
} from "@/lib/fault-scenarios";
import {
  CON_SON_HARDWARE,
  CON_SON_SIGNAL_PATHS,
  type HardwareComponent,
  type HardwareFaultScenario,
  type HardwareFaultType,
} from "@/lib/hardware-model";
import {
  SENSOR_STATUSES,
  type ScenarioHardwareFault,
  type SensorStatus,
} from "@/lib/types";
import { SENSOR_STATUS_DETAILS } from "@/components/qcms/qcms-utils";

type HardwareFaultStepProps = {
  value: ScenarioHardwareFault | undefined;
  error?: string;
  onChange: (value: ScenarioHardwareFault | undefined) => void;
};

const FAULT_TYPES: Array<{ value: HardwareFaultType; label: string }> = [
  { value: "open", label: "Hở mạch" },
  { value: "short", label: "Ngắn mạch" },
  { value: "degraded", label: "Suy giảm" },
  { value: "disconnected", label: "Mất kết nối" },
  { value: "overheated", label: "Quá nhiệt" },
];

export function createScenarioHardwareFault(
  preset: HardwareFaultScenario,
): ScenarioHardwareFault {
  return {
    faultyComponentIds: [preset.faultyComponentId],
    faultType: preset.faultType,
    faultDescription: preset.faultDescription,
    expectedSensorStatus: preset.expectedSensorStatus,
    terminalSymptoms: [...preset.terminalSymptoms],
    qcmsSymptoms: [...preset.qcmsSymptoms],
    diagnosticSteps: [...preset.diagnosticSteps],
    hardwareLayout: structuredClone(CON_SON_HARDWARE),
    signalPaths: structuredClone(CON_SON_SIGNAL_PATHS),
  };
}

function inferredStatus(component: HardwareComponent): SensorStatus {
  if (
    ["lan_cable", "lan_switch", "power_cable_ac", "power_cable_dc"].includes(
      component.type,
    )
  ) {
    return "red";
  }
  if (
    [
      "gps_receiver",
      "gps_cable",
      "site_monitor_antenna",
      "site_monitor_tx",
      "earth_cable",
    ].includes(component.type)
  ) {
    return "green";
  }
  if (component.type === "sensor_unit") return "orange";
  return "yellow";
}

function faultForComponent(
  component: HardwareComponent,
  current: ScenarioHardwareFault,
): ScenarioHardwareFault {
  const faultyComponentIds = Array.from(
    new Set([...current.faultyComponentIds, component.id]),
  );
  const preset = findFaultPreset(component.id);

  if (preset) {
    return {
      ...createScenarioHardwareFault(preset),
      faultyComponentIds,
    };
  }

  const expectedSensorStatus = inferredStatus(component);
  return {
    ...current,
    faultyComponentIds,
    faultType: "degraded",
    faultDescription: component.name + " is degraded.",
    expectedSensorStatus,
    terminalSymptoms: [
      "Inspect terminal status for symptoms related to " + component.name,
    ],
    qcmsSymptoms: [
      "QCMS status reflects a " + expectedSensorStatus + " sensor state",
    ],
    diagnosticSteps: [
      "Inspect " + component.name,
      "Measure inputs and outputs",
      "Substitute a known-good component",
    ],
  };
}

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function HardwareFaultStep({
  value,
  error,
  onChange,
}: HardwareFaultStepProps) {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    value?.faultyComponentIds[0] ?? null,
  );
  const components = value?.hardwareLayout ?? CON_SON_HARDWARE;
  const selectedComponent =
    components.find((component) => component.id === selectedComponentId) ?? null;

  function enableFault(enabled: boolean) {
    if (!enabled) {
      onChange(undefined);
      setSelectedComponentId(null);
      return;
    }

    const defaultPreset = CON_SON_FAULT_SCENARIOS[0];
    if (defaultPreset) {
      const fault = createScenarioHardwareFault(defaultPreset);
      onChange(fault);
      setSelectedComponentId(fault.faultyComponentIds[0] ?? null);
    }
  }

  function changeFaultType(faultType: HardwareFaultType) {
    if (!value) return;
    const primaryComponentId =
      (selectedComponentId &&
      value.faultyComponentIds.includes(selectedComponentId)
        ? selectedComponentId
        : value.faultyComponentIds[0]) ?? "";
    const preset = findFaultPreset(primaryComponentId, faultType);

    onChange(
      preset
        ? {
            ...createScenarioHardwareFault(preset),
            faultyComponentIds: value.faultyComponentIds,
          }
        : {
            ...value,
            faultType,
            faultDescription:
              value.hardwareLayout.find(
                (component) => component.id === primaryComponentId,
              )?.name +
              " fault: " +
              faultType,
          },
    );
  }

  function markSelectedComponent(marked: boolean) {
    if (!value || !selectedComponent) return;

    if (marked) {
      onChange(faultForComponent(selectedComponent, value));
      return;
    }

    onChange({
      ...value,
      faultyComponentIds: value.faultyComponentIds.filter(
        (componentId) => componentId !== selectedComponent.id,
      ),
    });
  }

  return (
    <div className="grid gap-5">
      <label className="flex min-h-12 items-center gap-3 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-primary)]">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => enableFault(event.target.checked)}
          className="size-4 accent-[var(--accent)]"
        />
        Kịch bản sự cố phần cứng
      </label>

      {value ? (
        <>
          <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Đã đánh dấu {value.faultyComponentIds.length} phần cứng sự cố. Chọn
            linh kiện trên sơ đồ rồi dùng ô đánh dấu ở bảng chi tiết.
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <SignalPathDiagram
              components={value.hardwareLayout}
              signalPaths={value.signalPaths}
              faultyComponentIds={value.faultyComponentIds}
              selectedComponentId={selectedComponentId}
              onSelectComponent={(component) =>
                setSelectedComponentId(component.id)
              }
              readOnly
            />
            <ComponentInspector
              component={selectedComponent}
              components={value.hardwareLayout}
              status={
                selectedComponent &&
                value.faultyComponentIds.includes(selectedComponent.id)
                  ? "failed"
                  : selectedComponent?.status
              }
              markedAsFaulty={Boolean(
                selectedComponent &&
                  value.faultyComponentIds.includes(selectedComponent.id),
              )}
              onMarkedAsFaultyChange={markSelectedComponent}
            />
          </div>

          <section className="grid gap-4 rounded border border-[var(--border)] bg-white p-4 lg:grid-cols-2">
            <label className="text-sm font-semibold text-[var(--text-primary)]">
              Loại sự cố
              <select
                value={value.faultType}
                onChange={(event) =>
                  changeFaultType(event.target.value as HardwareFaultType)
                }
                className="mt-1.5 block h-11 w-full rounded border border-[var(--border-strong)] bg-white px-3 font-mono text-sm"
              >
                {FAULT_TYPES.map((faultType) => (
                  <option key={faultType.value} value={faultType.value}>
                    {faultType.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-[var(--text-primary)]">
              Trạng thái QCMS dự kiến
              <select
                value={value.expectedSensorStatus}
                onChange={(event) =>
                  onChange({
                    ...value,
                    expectedSensorStatus: event.target.value as SensorStatus,
                  })
                }
                className="mt-1.5 block h-11 w-full rounded border border-[var(--border-strong)] bg-white px-3 text-sm"
              >
                {SENSOR_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SENSOR_STATUS_DETAILS[status].label} ({status.toUpperCase()})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-[var(--text-primary)] lg:col-span-2">
              Mô tả sự cố
              <input
                value={value.faultDescription}
                onChange={(event) =>
                  onChange({ ...value, faultDescription: event.target.value })
                }
                className="mt-1.5 block h-11 w-full rounded border border-[var(--border-strong)] px-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-[var(--text-primary)]">
              Triệu chứng trên Terminal (mỗi dòng một triệu chứng)
              <textarea
                value={value.terminalSymptoms.join("\n")}
                onChange={(event) =>
                  onChange({
                    ...value,
                    terminalSymptoms: lines(event.target.value),
                  })
                }
                rows={6}
                className="mt-1.5 block w-full rounded border border-[var(--border-strong)] p-3 font-mono text-xs"
              />
            </label>
            <label className="text-sm font-semibold text-[var(--text-primary)]">
              Triệu chứng trên QCMS (mỗi dòng một triệu chứng)
              <textarea
                value={value.qcmsSymptoms.join("\n")}
                onChange={(event) =>
                  onChange({ ...value, qcmsSymptoms: lines(event.target.value) })
                }
                rows={6}
                className="mt-1.5 block w-full rounded border border-[var(--border-strong)] p-3 font-mono text-xs"
              />
            </label>
          </section>
        </>
      ) : (
        <p className="rounded border border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-[var(--text-secondary)]">
          Bật kịch bản sự cố phần cứng để chọn linh kiện và cấu hình triệu chứng.
        </p>
      )}

      {error ? (
        <p role="alert" className="text-sm font-medium text-[#b91c1c]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
