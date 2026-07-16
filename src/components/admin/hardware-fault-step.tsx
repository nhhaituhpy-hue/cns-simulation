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
import type { ScenarioHardwareFault, SensorStatus } from "@/lib/types";

type HardwareFaultStepProps = {
  value: ScenarioHardwareFault | undefined;
  error?: string;
  onChange: (value: ScenarioHardwareFault | undefined) => void;
};

const FAULT_TYPES: HardwareFaultType[] = [
  "open",
  "short",
  "degraded",
  "disconnected",
  "overheated",
];

export function createScenarioHardwareFault(
  preset: HardwareFaultScenario,
): ScenarioHardwareFault {
  return {
    faultyComponentId: preset.faultyComponentId,
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
  if (["lan_cable", "lan_switch", "power_cable_ac", "power_cable_dc"].includes(component.type)) {
    return "red";
  }
  if (["gps_receiver", "gps_cable", "site_monitor_antenna", "site_monitor_tx", "earth_cable"].includes(component.type)) {
    return "green";
  }
  if (component.type === "sensor_unit") return "orange";
  return "yellow";
}

function faultForComponent(
  component: HardwareComponent,
  current: ScenarioHardwareFault,
): ScenarioHardwareFault {
  const preset = findFaultPreset(component.id);
  if (preset) return createScenarioHardwareFault(preset);

  const expectedSensorStatus = inferredStatus(component);
  return {
    ...current,
    faultyComponentId: component.id,
    faultType: "degraded",
    faultDescription: component.name + " is degraded.",
    expectedSensorStatus,
    terminalSymptoms: ["Inspect terminal status for symptoms related to " + component.name],
    qcmsSymptoms: ["QCMS status reflects a " + expectedSensorStatus + " sensor state"],
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
    value?.faultyComponentId ?? null,
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
      setSelectedComponentId(fault.faultyComponentId);
    }
  }

  function selectComponent(component: HardwareComponent) {
    setSelectedComponentId(component.id);
    if (value) onChange(faultForComponent(component, value));
  }

  function changeFaultType(faultType: HardwareFaultType) {
    if (!value) return;
    const preset = findFaultPreset(value.faultyComponentId, faultType);
    onChange(
      preset
        ? createScenarioHardwareFault(preset)
        : {
            ...value,
            faultType,
            faultDescription:
              value.hardwareLayout.find(
                (component) => component.id === value.faultyComponentId,
              )?.name +
              " fault: " +
              faultType,
          },
    );
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
        Kich ban co su co phan cung
      </label>

      {value ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <SignalPathDiagram
              components={value.hardwareLayout}
              signalPaths={value.signalPaths}
              faultyComponentId={value.faultyComponentId}
              selectedComponentId={selectedComponentId}
              onSelectComponent={selectComponent}
              readOnly
            />
            <ComponentInspector
              component={selectedComponent}
              components={value.hardwareLayout}
              status={
                selectedComponent?.id === value.faultyComponentId
                  ? "failed"
                  : selectedComponent?.status
              }
              markedAsFaulty={
                selectedComponent?.id === value.faultyComponentId
              }
              onMarkedAsFaultyChange={(marked) => {
                if (marked && selectedComponent) selectComponent(selectedComponent);
              }}
            />
          </div>

          <section className="grid gap-4 rounded border border-[var(--border)] bg-white p-4 lg:grid-cols-2">
            <label className="text-sm font-semibold text-[var(--text-primary)]">
              Fault type
              <select
                value={value.faultType}
                onChange={(event) =>
                  changeFaultType(event.target.value as HardwareFaultType)
                }
                className="mt-1.5 block h-11 w-full rounded border border-[var(--border-strong)] bg-white px-3 font-mono text-sm"
              >
                {FAULT_TYPES.map((faultType) => (
                  <option key={faultType} value={faultType}>
                    {faultType}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <p className="text-xs text-[var(--text-secondary)]">Expected QCMS status</p>
              <p className="mt-1 font-mono text-sm font-bold uppercase text-[var(--text-primary)]">
                {value.expectedSensorStatus}
              </p>
            </div>
            <label className="lg:col-span-2 text-sm font-semibold text-[var(--text-primary)]">
              Fault description
              <input
                value={value.faultDescription}
                onChange={(event) =>
                  onChange({ ...value, faultDescription: event.target.value })
                }
                className="mt-1.5 block h-11 w-full rounded border border-[var(--border-strong)] px-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-[var(--text-primary)]">
              Terminal symptoms (one per line)
              <textarea
                value={value.terminalSymptoms.join("\n")}
                onChange={(event) =>
                  onChange({ ...value, terminalSymptoms: lines(event.target.value) })
                }
                rows={6}
                className="mt-1.5 block w-full rounded border border-[var(--border-strong)] p-3 font-mono text-xs"
              />
            </label>
            <label className="text-sm font-semibold text-[var(--text-primary)]">
              QCMS symptoms (one per line)
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
          Enable hardware fault training to select a component and symptoms.
        </p>
      )}

      {error ? <p role="alert" className="text-sm font-medium text-[#b91c1c]">{error}</p> : null}
    </div>
  );
}
