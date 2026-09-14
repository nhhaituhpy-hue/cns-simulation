"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  MopiensBeveledButton,
  MopiensModal,
  MopiensStatusIndicator,
} from "@/modules/operations/mopiens-pmdt";
import { previewDme320Scenario, rebaseChannelDependentMonitorLimits } from "../domain/engine";
import { DME320_FAULT_CATALOG } from "../domain/faults";
import {
  DME320_BUILT_IN_SCENARIOS,
  DME320_SCENARIO_CHANNELS,
  DME320_SCENARIO_MONITORS,
  DME320_SCENARIO_TRANSPONDERS,
  createDefaultDme320ScenarioDefinition,
  dme320ScenarioFaultTargets,
  evaluateDme320Scenario,
  parseDme320ScenarioDefinition,
  setDme320ScenarioFault,
  setDme320ScenarioOverride,
  validateDme320ScenarioDefinition,
} from "../domain/scenario";
import {
  DME320_MONITOR_PARAMETERS,
  type Dme320Command,
  type Dme320CommandResult,
  type Dme320FaultKind,
  type Dme320MonitorChannel,
  type Dme320MonitorId,
  type Dme320MonitorParameter,
  type Dme320ScenarioDefinition,
  type Dme320ScenarioEvaluation,
  type Dme320SimulationState,
} from "../domain/types";
import { DME320_PARAMETER_LABELS, formatReading, toneForServiceStatus } from "./presentation";
import styles from "../dme320.module.css";

type Mutate = (mutator: (next: Dme320ScenarioDefinition) => void) => void;
interface EditorProps {
  scenario: Dme320ScenarioDefinition;
  update: Mutate;
}
const tabs = [
  { id: "overview", label: "Overview" },
  { id: "signal", label: "Signal & Channel" },
  { id: "monitor", label: "Monitor & Limits" },
  { id: "plant", label: "Power / Thermal" },
  { id: "faults", label: "Faults" },
  { id: "raw", label: "Advanced Raw" },
] as const;
type ScenarioTab = (typeof tabs)[number]["id"];
const criteriaLabels: Record<keyof Dme320ScenarioDefinition["successCriteria"], string> = {
  requireServiceNormal: "Require Service Status Normal",
  requireMonitorChannelsNormal: "Require monitor channels Normal",
  requireNoPrimaryAlarm: "Require primary alarms clear",
  requireNoActiveFaults: "Require all injected faults clear",
};

function Field({
  label,
  unit,
  helper,
  children,
}: {
  label: string;
  unit?: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.scenarioField}>
      <span>
        {label}
        {unit ? <small>{unit}</small> : null}
      </span>
      {children}
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

// Read the event value synchronously; React state updaters may run later.
function TextInput({
  value,
  onChange,
  area = false,
}: {
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
}) {
  return area ? (
    <textarea value={value} onChange={(event) => onChange(event.currentTarget.value)} />
  ) : (
    <input value={value} onChange={(event) => onChange(event.currentTarget.value)} />
  );
}

function NumberInput({
  value,
  min,
  max,
  step = "any",
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number | "any";
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={Number.isFinite(value) ? value : ""}
      aria-invalid={
        !Number.isFinite(value) || (min !== undefined && value < min) || (max !== undefined && value > max)
      }
      onChange={(event) =>
        onChange(event.currentTarget.value === "" ? Number.NaN : event.currentTarget.valueAsNumber)
      }
    />
  );
}

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.currentTarget.value as T)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className={styles.scenarioCheck}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      {children}
    </label>
  );
}

function Evaluation({ title, evaluation }: { title: string; evaluation: Dme320ScenarioEvaluation | null }) {
  return (
    <div className={styles.scenarioCheckList}>
      <strong>{title}</strong>
      {evaluation?.checks.map((check) => (
        <span key={check.id} data-passed={check.passed}>
          {check.passed ? "Pass" : "Pending"} — {check.label}: {check.detail}
        </span>
      ))}
      {evaluation?.blockers.map((blocker) => (
        <span key={blocker} data-passed="false">
          {blocker}
        </span>
      ))}
      {!evaluation?.checks.length ? <span>No result available.</span> : null}
    </div>
  );
}

function OverviewTab({
  scenario,
  update,
  preview,
  live,
  replace,
  exportScenario,
  importScenario,
  canExport,
}: EditorProps & {
  preview: Dme320ScenarioEvaluation | null;
  live: Dme320ScenarioEvaluation;
  replace: (scenario: Dme320ScenarioDefinition) => void;
  exportScenario: () => void;
  importScenario: (event: ChangeEvent<HTMLInputElement>) => void;
  canExport: boolean;
}) {
  const importRef = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.scenarioTwoColumns}>
      <section className={styles.scenarioSection}>
        <h3>Scenario Definition</h3>
        <Field label="Built-in preset">
          <select
            value=""
            onChange={(event) => {
              const preset = DME320_BUILT_IN_SCENARIOS.find((item) => item.id === event.currentTarget.value);
              if (preset) replace(preset.create());
            }}
          >
            <option value="">Choose a preset…</option>
            {DME320_BUILT_IN_SCENARIOS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Scenario ID">
          <TextInput
            value={scenario.id}
            onChange={(value) =>
              update((next) => {
                next.id = value;
              })
            }
          />
        </Field>
        <Field label="Name">
          <TextInput
            value={scenario.name}
            onChange={(value) =>
              update((next) => {
                next.name = value;
              })
            }
          />
        </Field>
        <Field label="Description">
          <TextInput
            area
            value={scenario.description}
            onChange={(value) =>
              update((next) => {
                next.description = value;
              })
            }
          />
        </Field>
        <Field label="Difficulty">
          <Select
            value={scenario.difficulty}
            options={["basic", "intermediate", "advanced"]}
            onChange={(value) =>
              update((next) => {
                next.difficulty = value;
              })
            }
          />
        </Field>
        <div className={styles.scenarioInlineFields}>
          <MopiensBeveledButton disabled={!canExport} onClick={exportScenario}>
            Export JSON
          </MopiensBeveledButton>
          <MopiensBeveledButton onClick={() => importRef.current?.click()}>Import JSON</MopiensBeveledButton>
          <input
            ref={importRef}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={importScenario}
          />
        </div>
        <p className={styles.inlineNotice}>
          Export this definition, then import it into Kịch bản / DME 320 to save it to the shared scenario
          library.
        </p>
      </section>
      <section className={styles.scenarioSection}>
        <h3>Start Policy & Success Criteria</h3>
        <Field label="Main transponder">
          <Select
            value={scenario.runtime.mainTransponder}
            options={DME320_SCENARIO_TRANSPONDERS}
            onChange={(value) =>
              update((next) => {
                next.runtime.mainTransponder = value;
              })
            }
          />
        </Field>
        <Check
          checked={scenario.runtime.startMonitorBypassed}
          onChange={(value) =>
            update((next) => {
              next.runtime.startMonitorBypassed = value;
            })
          }
        >
          Start both monitors in Bypass (MAINT always bypasses)
        </Check>
        {(Object.keys(criteriaLabels) as Array<keyof typeof criteriaLabels>).map((key) => (
          <Check
            key={key}
            checked={scenario.successCriteria[key]}
            onChange={(value) =>
              update((next) => {
                next.successCriteria[key] = value;
              })
            }
          >
            {criteriaLabels[key]}
          </Check>
        ))}
        <p className={styles.inlineNotice}>
          A cold standby is excluded from the required channels. Bypass never hides a failed reading.
        </p>
        <Evaluation title="Draft preview" evaluation={preview} />
        <Evaluation title="Live exercise result" evaluation={live} />
      </section>
    </div>
  );
}

function SignalTab({ scenario, update }: EditorProps) {
  const station = scenario.configuration.station;
  return (
    <div className={styles.scenarioTwoColumns}>
      <section className={styles.scenarioSection}>
        <h3>Station Signal</h3>
        <Field label="Station name">
          <TextInput
            value={station.stationName}
            onChange={(value) =>
              update((next) => {
                next.configuration.station.stationName = value;
              })
            }
          />
        </Field>
        <Field
          label="Channel"
          helper="Frequency, delay and spacing limits follow a channel change, preserving their existing offsets."
        >
          <select
            value={`${station.channel.number}${station.channel.suffix}`}
            onChange={(event) => {
              const value = event.currentTarget.value;
              update((next) => {
                const previous = structuredClone(next.configuration);
                next.configuration.station.channel = {
                  number: Number(value.slice(0, -1)),
                  suffix: value.slice(-1) as "X" | "Y",
                };
                rebaseChannelDependentMonitorLimits(previous, next.configuration);
              });
            }}
          >
            {Array.from({ length: 126 }, (_, i) => i + 1).flatMap((number) =>
              ["X", "Y"].map((suffix) => (
                <option key={`${number}${suffix}`} value={`${number}${suffix}`}>
                  {number}
                  {suffix}
                </option>
              )),
            )}
          </select>
        </Field>
        <Field label="Station output" unit="W">
          <NumberInput
            value={station.powerOutputWatts}
            min={0}
            max={1250}
            onChange={(value) =>
              update((next) => {
                next.configuration.station.powerOutputWatts = value;
              })
            }
          />
        </Field>
        <Field
          label="Delay offset"
          unit="µs"
          helper="This stimulus keeps the authored monitor limits unchanged."
        >
          <NumberInput
            value={station.delayOffsetUs}
            min={-15}
            max={35}
            onChange={(value) =>
              update((next) => {
                next.configuration.station.delayOffsetUs = value;
              })
            }
          />
        </Field>
        <Field label="Minimum pulse rate" unit="pps">
          <NumberInput
            value={station.minimumPulseRatePps}
            min={0}
            max={2700}
            step={1}
            onChange={(value) =>
              update((next) => {
                next.configuration.station.minimumPulseRatePps = value;
              })
            }
          />
        </Field>
        <Field label="IDENT code">
          <TextInput
            value={station.identCode}
            onChange={(value) =>
              update((next) => {
                next.configuration.station.identCode = value.toUpperCase();
              })
            }
          />
        </Field>
      </section>
      <section className={styles.scenarioSection}>
        <h3>Transponder Output</h3>
        {DME320_SCENARIO_TRANSPONDERS.map((id) => (
          <Field key={id} label={`${id.toUpperCase()} output`} unit="%">
            <NumberInput
              value={scenario.configuration.transmitters[id].outputPowerPercent}
              min={0}
              max={100}
              onChange={(value) =>
                update((next) => {
                  next.configuration.transmitters[id].outputPowerPercent = value;
                })
              }
            />
          </Field>
        ))}
        <Field label="Standby mode">
          <Select
            value={station.standbyMode}
            options={["hot", "cold"]}
            onChange={(value) =>
              update((next) => {
                next.configuration.station.standbyMode = value;
              })
            }
          />
        </Field>
        <Check
          checked={station.transmitterOutputOnBoot}
          onChange={(value) =>
            update((next) => {
              next.configuration.station.transmitterOutputOnBoot = value;
            })
          }
        >
          Transmitter output on at start
        </Check>
        <p className={styles.inlineNotice}>
          Peak Power and ERP use the existing engine. ERP retains the fixed training reference 1000 W = 0 dB.
          Limits are edited separately in Monitor & Limits.
        </p>
      </section>
    </div>
  );
}

function ChannelSelector({
  monitor,
  channel,
  setMonitor,
  setChannel,
}: {
  monitor: Dme320MonitorId;
  channel: Dme320MonitorChannel;
  setMonitor: (value: Dme320MonitorId) => void;
  setChannel: (value: Dme320MonitorChannel) => void;
}) {
  return (
    <div className={styles.scenarioInlineFields}>
      <Field label="Monitor">
        <Select value={monitor} options={DME320_SCENARIO_MONITORS} onChange={setMonitor} />
      </Field>
      <Field label="Channel">
        <Select value={channel} options={DME320_SCENARIO_CHANNELS} onChange={setChannel} />
      </Field>
    </div>
  );
}

function MonitorTab({ scenario, update, preview }: EditorProps & { preview: Dme320SimulationState | null }) {
  const [monitor, setMonitor] = useState<Dme320MonitorId>("mon1");
  const [channel, setChannel] = useState<Dme320MonitorChannel>("executive");
  const [parameter, setParameter] = useState<Dme320MonitorParameter>("peakPowerWatts");
  const limit = scenario.configuration.monitor.limits[parameter];
  const delays = [
    ["monitorActionDelayMs", "Monitor action delay", 200, 51000],
    ["identFaultDelayMs", "IDENT fault delay", 0, 100000],
    ["powerOnHoldoffMs", "Power-on holdoff", 0, 100000],
    ["postChangeoverHoldoffMs", "Post-changeover holdoff", 0, 100000],
    ["selfTestHoldoffMs", "Self-test holdoff", 0, 100000],
  ] as const;
  return (
    <div className={styles.scenarioTwoColumns}>
      <section className={styles.scenarioSection}>
        <h3>Monitor Policy</h3>
        <Field label="Voting">
          <Select
            value={scenario.configuration.monitor.votingLogic}
            options={["AND", "OR"]}
            onChange={(value) =>
              update((next) => {
                next.configuration.monitor.votingLogic = value;
              })
            }
          />
        </Field>
        {delays.map(([key, label, min, max]) => (
          <Field key={key} label={label} unit="ms">
            <NumberInput
              value={scenario.configuration.monitor[key]}
              min={min}
              max={max}
              onChange={(value) =>
                update((next) => {
                  next.configuration.monitor[key] = value;
                })
              }
            />
          </Field>
        ))}
        <h3>Preview Measurements</h3>
        <ChannelSelector
          monitor={monitor}
          channel={channel}
          setMonitor={setMonitor}
          setChannel={setChannel}
        />
        <div className={styles.scenarioTableWrap}>
          <table className={styles.scenarioTable}>
            <caption>
              {monitor.toUpperCase()} / {channel} —{" "}
              {preview?.monitors[monitor].channels[channel].sourceTransponder.toUpperCase() ??
                "Invalid preview"}
            </caption>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {DME320_MONITOR_PARAMETERS.map((key) => {
                const data = preview?.monitors[monitor].channels[channel];
                const reading = data?.readings[key];
                return (
                  <tr key={key}>
                    <td>{DME320_PARAMETER_LABELS[key]}</td>
                    <td>
                      {reading?.masked
                        ? "MASKED"
                        : formatReading(
                            reading?.value ?? null,
                            scenario.configuration.monitor.limits[key].unit,
                          )}
                    </td>
                    <td>{data?.alarms[key].phase.toUpperCase() ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className={styles.scenarioSection}>
        <h3>Alarm Band (shared by both monitors)</h3>
        <Field label="Parameter">
          <select
            value={parameter}
            onChange={(event) => setParameter(event.currentTarget.value as Dme320MonitorParameter)}
          >
            {DME320_MONITOR_PARAMETERS.map((key) => (
              <option key={key} value={key}>
                {DME320_PARAMETER_LABELS[key]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nominal" unit={limit.unit}>
          {parameter === "identCode" ? (
            <TextInput
              value={String(limit.nominal)}
              onChange={(value) =>
                update((next) => {
                  next.configuration.monitor.limits.identCode.nominal = value.toUpperCase();
                })
              }
            />
          ) : (
            <NumberInput
              value={Number(limit.nominal)}
              onChange={(value) =>
                update((next) => {
                  next.configuration.monitor.limits[parameter].nominal = value;
                })
              }
            />
          )}
        </Field>
        {parameter !== "identCode"
          ? (
              [
                ["alarmLow", "Lower alarm"],
                ["warningLow", "Lower warning"],
                ["warningHigh", "Upper warning"],
                ["alarmHigh", "Upper alarm"],
              ] as const
            ).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                unit={limit.unit}
                helper="Leave empty to disable this threshold."
              >
                <input
                  type="number"
                  step="any"
                  value={limit[key] ?? ""}
                  onChange={(event) => {
                    const value = event.currentTarget.value === "" ? null : event.currentTarget.valueAsNumber;
                    update((next) => {
                      next.configuration.monitor.limits[parameter][key] = value;
                    });
                  }}
                />
              </Field>
            ))
          : null}
        <Field label="Classification">
          <Select
            value={limit.classification}
            options={["primary", "secondary"]}
            onChange={(value) =>
              update((next) => {
                next.configuration.monitor.limits[parameter].classification = value;
              })
            }
          />
        </Field>
        <Field
          label="Alarm delay"
          unit="ms"
          helper={
            parameter === "identCode" ? "IDENT uses the separate IDENT fault delay instead." : undefined
          }
        >
          <NumberInput
            value={limit.alarmDelayMs}
            min={0}
            max={30000}
            onChange={(value) =>
              update((next) => {
                next.configuration.monitor.limits[parameter].alarmDelayMs = value;
              })
            }
          />
        </Field>
        <p className={styles.inlineNotice}>
          Preview advances only a detached copy of the engine through alarm/action delays. It does not change
          the live exercise clock.
        </p>
      </section>
    </div>
  );
}

function PlantTab({ scenario, update }: EditorProps) {
  return (
    <div className={styles.scenarioTwoColumns}>
      <section className={styles.scenarioSection}>
        <h3>Power & Environment</h3>
        <Check
          checked={scenario.runtime.acAvailable}
          onChange={(value) =>
            update((next) => {
              next.runtime.acAvailable = value;
            })
          }
        >
          AC mains available
        </Check>
        <Check
          checked={scenario.configuration.environment.emuEnabled}
          onChange={(value) =>
            update((next) => {
              next.configuration.environment.emuEnabled = value;
            })
          }
        >
          Enable environment monitoring
        </Check>
        {(["present", "smokeDetected", "intrusionDetected"] as const).map((key) => (
          <Check
            key={key}
            checked={scenario.runtime.environment[key]}
            onChange={(value) =>
              update((next) => {
                next.runtime.environment[key] = value;
              })
            }
          >
            {key === "present"
              ? "EMU present"
              : key === "smokeDetected"
                ? "Smoke detected"
                : "Intrusion detected"}
          </Check>
        ))}
        <Field label="Ambient temperature" unit="°C">
          <NumberInput
            value={scenario.runtime.environment.temperatureC}
            min={-100}
            max={200}
            onChange={(value) =>
              update((next) => {
                next.runtime.environment.temperatureC = value;
              })
            }
          />
        </Field>
        {(["battery1", "battery2"] as const).map((id) => (
          <fieldset className={styles.scenarioSection} key={id}>
            <legend>{id.toUpperCase()}</legend>
            <Check
              checked={scenario.runtime.batteries[id].connected}
              onChange={(value) =>
                update((next) => {
                  next.runtime.batteries[id].connected = value;
                })
              }
            >
              Connected
            </Check>
            <Field label="Voltage" unit="V">
              <NumberInput
                value={scenario.runtime.batteries[id].voltage}
                min={0}
                max={30}
                onChange={(value) =>
                  update((next) => {
                    next.runtime.batteries[id].voltage = value;
                  })
                }
              />
            </Field>
            <Field label="Temperature" unit="°C">
              <NumberInput
                value={scenario.runtime.batteries[id].temperatureC}
                min={-128}
                max={127}
                onChange={(value) =>
                  update((next) => {
                    next.runtime.batteries[id].temperatureC = value;
                  })
                }
              />
            </Field>
          </fieldset>
        ))}
      </section>
      <section className={styles.scenarioSection}>
        <h3>Transponder Runtime</h3>
        {DME320_SCENARIO_TRANSPONDERS.map((id) => (
          <fieldset className={styles.scenarioSection} key={id}>
            <legend>{id.toUpperCase()}</legend>
            <Field label="Temperature" unit="°C">
              <NumberInput
                value={scenario.runtime.temperaturesC[id]}
                min={-100}
                max={200}
                onChange={(value) =>
                  update((next) => {
                    next.runtime.temperaturesC[id] = value;
                  })
                }
              />
            </Field>
            <Field label="Pulse spacing offset" unit="µs">
              <NumberInput
                value={scenario.runtime.spacingOffsetsUs[id]}
                onChange={(value) =>
                  update((next) => {
                    next.runtime.spacingOffsetsUs[id] = value;
                  })
                }
              />
            </Field>
          </fieldset>
        ))}
        <Field label="Thermal fan mode">
          <Select
            value={scenario.configuration.thermal.fanMode}
            options={["auto", "on", "off"]}
            onChange={(value) =>
              update((next) => {
                next.configuration.thermal.fanMode = value;
              })
            }
          />
        </Field>
        {(
          [
            ["fanStartC", "Fan start"],
            ["fanStopC", "Fan stop"],
            ["txuShutdownC", "TXU shutdown"],
            ["txuRestartC", "TXU restart"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label} unit="°C">
            <NumberInput
              value={scenario.configuration.thermal[key]}
              min={-100}
              max={200}
              onChange={(value) =>
                update((next) => {
                  next.configuration.thermal[key] = value;
                })
              }
            />
          </Field>
        ))}
      </section>
    </div>
  );
}

function FaultsTab({ scenario, update }: EditorProps) {
  return (
    <div className={styles.scenarioTwoColumns}>
      <section className={styles.scenarioSection}>
        <h3>Typed Fault Injection</h3>
        {(Object.keys(DME320_FAULT_CATALOG) as Dme320FaultKind[]).map((kind) => (
          <div key={kind} className={styles.scenarioFaultRow}>
            <strong>{DME320_FAULT_CATALOG[kind].component}</strong>
            {dme320ScenarioFaultTargets(kind).map((target) => (
              <Check
                key={target}
                checked={scenario.runtime.faults.some(
                  (fault) => fault.kind === kind && fault.target === target,
                )}
                onChange={(enabled) => update((next) => setDme320ScenarioFault(next, kind, target, enabled))}
              >
                {kind} / {target}
              </Check>
            ))}
            <small>{DME320_FAULT_CATALOG[kind].symptoms.join(" · ")}</small>
          </div>
        ))}
      </section>
      <section className={styles.scenarioSection}>
        <h3>Communication Shutdown Policy</h3>
        {(["shutdownOnRcuFault", "shutdownOnLmiFault", "shutdownOnCspFault"] as const).map((key) => (
          <Check
            key={key}
            checked={scenario.configuration.system[key]}
            onChange={(value) =>
              update((next) => {
                next.configuration.system[key] = value;
              })
            }
          >
            {key === "shutdownOnRcuFault"
              ? "Shutdown on RCU fault"
              : key === "shutdownOnLmiFault"
                ? "Shutdown on LMI fault"
                : "Shutdown on CSP fault"}
          </Check>
        ))}
        <Field label="Shutdown delay" unit="ms">
          <NumberInput
            value={scenario.configuration.system.communicationFaultShutdownDelayMs}
            min={0}
            max={30000}
            onChange={(value) =>
              update((next) => {
                next.configuration.system.communicationFaultShutdownDelayMs = value;
              })
            }
          />
        </Field>
        <p className={styles.inlineNotice}>
          Typed faults are for diagnosis and clear-fault exercises. Use Maintenance / Fault Controls to clear
          a live fault. For adjustable RF exercises, prefer the Signal & Channel setpoints.
        </p>
        <p className={styles.scenarioDangerNotice}>
          Reset / Reboot restores the starting scenario, including faults. End Scenario clears the exercise
          and restores the previous configuration.
        </p>
      </section>
    </div>
  );
}

function RawTab({ scenario, update, preview }: EditorProps & { preview: Dme320SimulationState | null }) {
  const [monitor, setMonitor] = useState<Dme320MonitorId>("mon1");
  const [channel, setChannel] = useState<Dme320MonitorChannel>("executive");
  return (
    <section className={styles.scenarioSection}>
      <h3>Forced Monitor Indication — Non-correctable</h3>
      <p className={styles.scenarioDangerNotice}>
        Overrides take priority over the engine. PMDT corrections cannot normalize a forced value. Changes
        below edit the draft; Apply Scenario restarts the exercise with that draft.
      </p>
      <ChannelSelector monitor={monitor} channel={channel} setMonitor={setMonitor} setChannel={setChannel} />
      <MopiensBeveledButton
        onClick={() =>
          update((next) => {
            next.runtime.measurementOverrides = next.runtime.measurementOverrides.filter(
              (item) => item.monitorId !== monitor || item.channel !== channel,
            );
          })
        }
      >
        Clear Selected Channel Overrides
      </MopiensBeveledButton>
      <div className={styles.scenarioRawGrid}>
        {DME320_MONITOR_PARAMETERS.map((parameter) => {
          const key = { monitorId: monitor, channel, parameter };
          const active = scenario.runtime.measurementOverrides.find(
            (item) => item.monitorId === monitor && item.channel === channel && item.parameter === parameter,
          );
          const reading = preview?.monitors[monitor].channels[channel].readings[parameter];
          const label = DME320_PARAMETER_LABELS[parameter];
          return (
            <div className={styles.scenarioRawField} key={parameter}>
              <Check
                checked={Boolean(active)}
                onChange={(enabled) =>
                  update((next) =>
                    setDme320ScenarioOverride(
                      next,
                      key,
                      enabled
                        ? { value: reading?.value ?? (parameter === "identCode" ? "" : 0), valid: true }
                        : null,
                    ),
                  )
                }
              >
                {label}
              </Check>
              {active ? (
                <>
                  <Field label={`Forced ${label}`}>
                    {parameter === "identCode" ? (
                      <TextInput
                        value={String(active.value ?? "")}
                        onChange={(value) =>
                          update((next) =>
                            setDme320ScenarioOverride(next, key, { ...active, value: value.toUpperCase() }),
                          )
                        }
                      />
                    ) : (
                      <NumberInput
                        value={typeof active.value === "number" ? active.value : Number.NaN}
                        onChange={(value) =>
                          update((next) => setDme320ScenarioOverride(next, key, { ...active, value }))
                        }
                      />
                    )}
                  </Field>
                  <Check
                    checked={active.valid ?? active.value !== null}
                    onChange={(valid) =>
                      update((next) => setDme320ScenarioOverride(next, key, { ...active, valid }))
                    }
                  >
                    Valid reading
                  </Check>
                </>
              ) : (
                <small>
                  Engine preview: {reading?.masked ? "MASKED" : formatReading(reading?.value ?? null)}
                </small>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export interface Dme320SimulationParametersDialogProps {
  open: boolean;
  simulation: Dme320SimulationState;
  dispatch: (command: Dme320Command) => Dme320CommandResult;
  initialScenario?: Dme320ScenarioDefinition | null;
  onClose: () => void;
}

export function Dme320SimulationParametersDialog({
  open,
  simulation,
  dispatch,
  initialScenario,
  onClose,
}: Dme320SimulationParametersDialogProps) {
  const [tab, setTab] = useState<ScenarioTab>("overview");
  const [scenario, setScenario] = useState<Dme320ScenarioDefinition>(() =>
    structuredClone(
      initialScenario ?? simulation.scenario.definition ?? createDefaultDme320ScenarioDefinition(),
    ),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    if (initialScenario) {
      setScenario(structuredClone(initialScenario));
      setMessage(`Loaded: ${initialScenario.name}`);
      setError(null);
    }
  }, [initialScenario]);
  const issues = useMemo(() => validateDme320ScenarioDefinition(scenario), [scenario]);
  const preview = useMemo(() => {
    if (!open || issues.length) return null;
    return previewDme320Scenario(scenario);
  }, [open, scenario, issues.length]);
  const previewEvaluation = preview ? evaluateDme320Scenario(preview) : null;
  const liveEvaluation = evaluateDme320Scenario(simulation);
  const update: Mutate = (mutator) => {
    setMessage(null);
    setError(null);
    setScenario((current) => {
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  };
  function replace(definition: Dme320ScenarioDefinition) {
    setScenario(structuredClone(definition));
    setError(null);
    setMessage(`Loaded draft: ${definition.name}. Apply Scenario to start.`);
  }
  function execute(command: Dme320Command) {
    const result = dispatch(command);
    setError(result.accepted ? null : result.message);
    setMessage(result.accepted ? result.message : null);
    if (result.accepted && command.type === "restart-scenario" && result.state.scenario.definition)
      setScenario(structuredClone(result.state.scenario.definition));
    if (result.accepted && command.type === "end-scenario")
      setScenario(createDefaultDme320ScenarioDefinition());
  }
  function exportScenario() {
    const parsed = parseDme320ScenarioDefinition(scenario);
    if (!parsed) {
      setError("Correct the validation errors before exporting.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(parsed, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${parsed.id.replace(/[^a-z0-9_-]/gi, "_")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Scenario JSON exported.");
  }
  async function importScenario(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 750_000) throw new Error("Scenario JSON must not exceed 750 KB.");
      const parsed = parseDme320ScenarioDefinition(JSON.parse(await file.text()));
      if (!parsed) throw new Error("The file does not match DME 320 scenario schema version 1.");
      replace(parsed);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Scenario JSON could not be imported.");
      setMessage(null);
    }
  }
  return (
    <MopiensModal
      open={open}
      title="Scenario Parameters..."
      ariaLabel="DME 320 scenario parameters"
      brandLabel="MOPIENS 320 DME — Simulator Tools"
      size="large"
      onClose={onClose}
      actions={[
        {
          id: "restart",
          label: "Restore Scenario",
          disabled: !simulation.scenario.active,
          onClick: () => execute({ type: "restart-scenario" }),
        },
        {
          id: "end",
          label: "End Scenario / Restore Previous",
          disabled: !simulation.scenario.active,
          tone: "warning",
          onClick: () => execute({ type: "end-scenario" }),
        },
        {
          id: "apply",
          label: "Apply Scenario",
          disabled: issues.length > 0,
          tone: "primary",
          onClick: () => execute({ type: "apply-scenario", scenario }),
        },
        { id: "close", label: "Close", onClick: onClose },
      ]}
    >
      <div className={styles.scenarioDialog}>
        <div className={styles.scenarioSummaryBar}>
          <MopiensStatusIndicator
            label="SESSION"
            detail={
              simulation.scenario.active
                ? `Active: ${simulation.scenario.definition?.name}`
                : "No active scenario"
            }
            tone={simulation.scenario.active ? "warning" : "inactive"}
          />
          <MopiensStatusIndicator
            label="LIVE RESULT"
            detail={simulation.scenario.active ? (liveEvaluation.solved ? "SOLVED" : "IN PROGRESS") : "—"}
            tone={simulation.scenario.active ? (liveEvaluation.solved ? "normal" : "warning") : "inactive"}
          />
          <MopiensStatusIndicator
            label="PREVIEW"
            detail={preview ? preview.serviceStatus.toUpperCase() : "INVALID"}
            tone={preview ? toneForServiceStatus(preview.serviceStatus) : "alarm"}
          />
          <span className={styles.scenarioIsolationNote}>
            Session-only · Profile Save disabled · Restore Scenario restarts the exercise · End restores
            previous configuration
          </span>
          {simulation.scenario.active ? (
            <div className={styles.scenarioInlineFields}>
              <span>Live exercise clock (manual)</span>
              <MopiensBeveledButton onClick={() => execute({ type: "advance-time", toMs: simulation.nowMs + 1000 })}>Advance 1 s</MopiensBeveledButton>
              <MopiensBeveledButton onClick={() => execute({ type: "advance-time", toMs: simulation.nowMs + 5000 })}>Advance 5 s</MopiensBeveledButton>
            </div>
          ) : null}
        </div>
        {issues.length ? (
          <div className={styles.inlineError} role="alert">
            <strong>Correct these fields before Apply / Export:</strong>
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className={styles.scenarioTabs} role="tablist" aria-label="DME 320 scenario parameter groups">
          {tabs.map((item, index) => (
            <button
              key={item.id}
              id={`dme320-scenario-tab-${item.id}`}
              type="button"
              role="tab"
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              aria-selected={tab === item.id}
              aria-controls="dme320-scenario-panel"
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => {
                const next =
                  event.key === "ArrowRight"
                    ? (index + 1) % tabs.length
                    : event.key === "ArrowLeft"
                      ? (index + tabs.length - 1) % tabs.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? tabs.length - 1
                          : null;
                if (next === null) return;
                event.preventDefault();
                setTab(tabs[next].id);
                tabRefs.current[next]?.focus();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div id="dme320-scenario-panel" role="tabpanel" aria-labelledby={`dme320-scenario-tab-${tab}`}>
          {tab === "overview" ? (
            <OverviewTab
              scenario={scenario}
              update={update}
              preview={previewEvaluation}
              live={liveEvaluation}
              replace={replace}
              exportScenario={exportScenario}
              importScenario={importScenario}
              canExport={!issues.length}
            />
          ) : null}
          {tab === "signal" ? <SignalTab scenario={scenario} update={update} /> : null}
          {tab === "monitor" ? <MonitorTab scenario={scenario} update={update} preview={preview} /> : null}
          {tab === "plant" ? <PlantTab scenario={scenario} update={update} /> : null}
          {tab === "faults" ? <FaultsTab scenario={scenario} update={update} /> : null}
          {tab === "raw" ? <RawTab scenario={scenario} update={update} preview={preview} /> : null}
        </div>
        {error ? (
          <p className={styles.inlineError} role="alert">
            {error}
          </p>
        ) : null}
        <p className={styles.inlineNotice} role="status">
          {message ??
            (issues.length
              ? "Draft is invalid; the live exercise is unchanged."
              : (previewEvaluation?.blockers[0] ??
                "Review the preview before Apply Scenario. Draft edits do not affect the live exercise."))}
        </p>
      </div>
    </MopiensModal>
  );
}
