"use client";

import { useState, type ReactNode } from "react";
import {
  MopiensBeveledButton,
  MopiensPropertyGrid,
  MopiensSlideSwitch,
  MopiensStatusIndicator,
} from "@/modules/operations/mopiens-pmdt";
import { getDme320ChannelAllocation } from "../domain/channel-allocation";
import { canDme320 } from "../domain/permissions";
import {
  DME320_MONITOR_PARAMETERS,
  type Dme320Config,
  type Dme320MonitorParameter,
  type Dme320TransponderId,
} from "../domain/types";
import { validateDme320Config } from "../domain/validation";
import { DME320_SCREEN_LABELS } from "./navigation";
import { DME320_PARAMETER_LABELS } from "./presentation";
import type { Dme320ScreenProps } from "./screen-types";
import styles from "./dme320-ui.module.css";

const TRANSPONDER_IDS = ["tx1", "tx2"] as const;

function Field({ label, unit, helper, children }: { label: string; unit?: string; helper?: string; children: ReactNode }) {
  return (
    <label className={styles.formField}>
      <span className={styles.formLabel}>
        {label}
        {unit ? <small>{unit}</small> : null}
      </span>
      {children}
      {helper ? <small className={styles.formHelper}>{helper}</small> : null}
    </label>
  );
}

function TextInput({ value, onChange, disabled, maxLength }: { value: string; onChange: (value: string) => void; disabled?: boolean; maxLength?: number }) {
  return <input className={styles.textInput} value={value} disabled={disabled} maxLength={maxLength} onChange={(event) => onChange(event.currentTarget.value)} />;
}

function NumberInput({ value, onChange, disabled, min, max, step = "any" }: { value: number; onChange: (value: number) => void; disabled?: boolean; min?: number; max?: number; step?: number | "any" }) {
  return <input type="number" className={styles.numberInput} value={Number.isFinite(value) ? value : ""} disabled={disabled} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.currentTarget.value))} />;
}

function SelectInput<TValue extends string>({ value, options, onChange, disabled }: { value: TValue; options: readonly { value: TValue; label: string }[]; onChange: (value: TValue) => void; disabled?: boolean }) {
  return (
    <select className={styles.selectInput} value={value} disabled={disabled} onChange={(event) => onChange(event.currentTarget.value as TValue)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function updateDraft(props: Dme320ScreenProps, config: Dme320Config) {
  return props.dispatch({ type: "set-draft-config", config });
}

function SetupFrame({ props, children }: { props: Dme320ScreenProps; children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const issues = validateDme320Config(props.simulation.config.draft);
  const editable = canDme320(props.simulation, "setup");
  const profileWritable = !props.simulation.scenario.active && canDme320(props.simulation, "profile");

  function execute(type: "apply-draft" | "restore-draft" | "save-running-to-flash") {
    const result = type === "apply-draft"
      ? props.dispatch({ type: "apply-draft" })
      : type === "restore-draft"
        ? props.dispatch({ type: "restore-draft" })
        : props.dispatch({ type: "save-running-to-flash" });
    setMessage(result.message);
  }

  return (
    <div className={styles.screenStack}>
      <header className={styles.screenHeader}>
        <div>
          <h2>{DME320_SCREEN_LABELS[props.screenId]}</h2>
          <p>Draft settings remain separate from Running and non-volatile Flash profiles.</p>
        </div>
        <div className={styles.actionRow}>
          <MopiensBeveledButton disabled={!props.simulation.config.draftDirty} onClick={() => execute("restore-draft")}>Restore</MopiensBeveledButton>
          <MopiensBeveledButton tone="primary" disabled={!editable || !props.simulation.config.draftDirty || issues.length > 0} onClick={() => execute("apply-draft")}>Apply</MopiensBeveledButton>
          <MopiensBeveledButton disabled={!profileWritable || !props.simulation.config.flashDirty} onClick={() => execute("save-running-to-flash")}>Profile Save</MopiensBeveledButton>
        </div>
      </header>

      <div className={styles.profileRail} aria-label="Configuration profile state">
        <MopiensStatusIndicator compact label="DRAFT" detail={props.simulation.config.draftDirty ? "Modified" : "Matches running"} tone={props.simulation.config.draftDirty ? "warning" : "normal"} />
        <MopiensStatusIndicator compact label="RUNNING" detail={props.simulation.config.flashDirty ? "Not saved to flash" : "Saved"} tone={props.simulation.config.flashDirty ? "warning" : "normal"} />
        <MopiensStatusIndicator compact label="ACCESS" detail={editable ? "Setup enabled" : "Level 2 + local + both monitors bypass required"} tone={editable ? "normal" : "inactive"} />
      </div>

      {issues.length ? (
        <div className={styles.validationBanner} role="alert">
          <strong>{issues.length} configuration issue{issues.length === 1 ? "" : "s"}</strong>
          <ul>{issues.slice(0, 5).map((issue) => <li key={`${issue.path}-${issue.message}`}><code>{issue.path}</code>: {issue.message}</li>)}</ul>
        </div>
      ) : null}
      {message ? <div className={styles.inlineNotice} role="status">{message}</div> : null}
      <fieldset disabled={!editable} className={styles.setupFieldset}>
        {children}
      </fieldset>
    </div>
  );
}

export function Dme320SetupScreen(props: Dme320ScreenProps) {
  if (props.screenId === "setup-station") return <StationSetup props={props} />;
  if (props.screenId === "setup-transponder") return <TransponderSetup props={props} />;
  if (props.screenId === "setup-thermal") return <ThermalSetup props={props} />;
  if (props.screenId === "setup-monitor") return <MonitorSetup props={props} />;
  if (props.screenId === "setup-limits") return <MonitorLimitsSetup props={props} />;
  if (props.screenId === "setup-system") return <SystemSetup props={props} />;
  if (props.screenId === "setup-environment") return <EnvironmentSetup props={props} />;
  if (props.screenId === "setup-communication") return <CommunicationSetup props={props} />;
  return <BatterySetup props={props} />;
}

function StationSetup({ props }: { props: Dme320ScreenProps }) {
  const config = props.simulation.config.draft;
  const station = config.station;
  const allocation = getDme320ChannelAllocation(station.channel);
  const setStation = (changes: Partial<typeof station>) => updateDraft(props, { ...config, station: { ...station, ...changes } });

  return (
    <SetupFrame props={props}>
      <div className={styles.setupGrid}>
        <section className={styles.setupSection}>
          <h3>General</h3>
          <Field label="Station Name"><TextInput value={station.stationName} maxLength={31} onChange={(stationName) => setStation({ stationName })} /></Field>
          <Field label="Runway Designator"><TextInput value={station.runwayDesignator} maxLength={3} onChange={(runwayDesignator) => setStation({ runwayDesignator })} /></Field>
          <Field label="DME Channel">
            <div className={styles.inlineInputs}>
              <select className={styles.selectInput} value={station.channel.number} onChange={(event) => setStation({ channel: { ...station.channel, number: Number(event.currentTarget.value) } })}>
                {Array.from({ length: 126 }, (_, index) => index + 1).map((channel) => <option key={channel} value={channel}>{channel}</option>)}
              </select>
              <SelectInput value={station.channel.suffix} options={[{ value: "X", label: "X" }, { value: "Y", label: "Y" }]} onChange={(suffix) => setStation({ channel: { ...station.channel, suffix } })} />
            </div>
          </Field>
          <Field label="Peak Power Output" unit="W"><NumberInput value={station.powerOutputWatts} min={0} max={1250} step={0.1} onChange={(powerOutputWatts) => setStation({ powerOutputWatts })} /></Field>
          <Field label="Reply Delay Offset" unit="µs"><NumberInput value={station.delayOffsetUs} min={-15} max={35} step={0.1} onChange={(delayOffsetUs) => setStation({ delayOffsetUs })} /></Field>
          <Field label="Auto Delay Calibration"><SelectInput value={station.autoDelayCalibration} options={[{ value: "always", label: "Always" }, { value: "never", label: "Never" }]} onChange={(autoDelayCalibration) => setStation({ autoDelayCalibration })} /></Field>
          <Field label="Receiver Sensitivity" unit="dBm"><NumberInput value={station.sensitivityDbm} step={0.1} onChange={(sensitivityDbm) => setStation({ sensitivityDbm })} /></Field>
          <Field label="Minimum Pulse Rate" unit="pp/s"><NumberInput value={station.minimumPulseRatePps} min={0} step={1} onChange={(minimumPulseRatePps) => setStation({ minimumPulseRatePps })} /></Field>
        </section>

        <section className={styles.setupSection}>
          <h3>Channel Allocation (Derived)</h3>
          <MopiensPropertyGrid ariaLabel="Derived DME channel allocation" sections={[{ id: "allocation", rows: [
            { id: "interrogation-frequency", label: "Interrogation Frequency", value: `${allocation.interrogationFrequencyMhz.toFixed(0)} MHz` },
            { id: "reply-frequency", label: "Reply Frequency", value: `${allocation.replyFrequencyMhz.toFixed(0)} MHz` },
            { id: "interrogation-spacing", label: "Interrogation Spacing", value: `${allocation.interrogationSpacingUs.toFixed(0)} µs` },
            { id: "reply-spacing", label: "Reply Spacing", value: `${allocation.replySpacingUs.toFixed(0)} µs` },
            { id: "nominal-delay", label: "Nominal Reply Delay", value: `${allocation.nominalDelayUs.toFixed(0)} µs` },
          ]}]} />
          <h3>Echo Suppression</h3>
          <MopiensSlideSwitch label="Short Distance Echo Suppression" checked={station.sdesEnabled} onCheckedChange={(sdesEnabled) => setStation({ sdesEnabled })} />
          <Field label="SDES Duration" unit="µs"><NumberInput value={station.sdesDurationUs} min={0} step={0.1} onChange={(sdesDurationUs) => setStation({ sdesDurationUs })} /></Field>
          <MopiensSlideSwitch label="Long Distance Echo Suppression" checked={station.ldesEnabled} onCheckedChange={(ldesEnabled) => setStation({ ldesEnabled })} />
          <Field label="LDES Duration" unit="µs"><NumberInput value={station.ldesDurationUs} min={0} step={0.1} onChange={(ldesDurationUs) => setStation({ ldesDurationUs })} /></Field>
          <Field label="LDES Threshold" unit="dBm"><NumberInput value={station.ldesThresholdDbm} step={0.1} onChange={(ldesThresholdDbm) => setStation({ ldesThresholdDbm })} /></Field>
          <Field label="Receiver Dead Time" unit="µs"><NumberInput value={station.deadTimeUs} min={0} step={0.1} onChange={(deadTimeUs) => setStation({ deadTimeUs })} /></Field>
        </section>

        <section className={styles.setupSection}>
          <h3>IDENT</h3>
          <Field label="IDENT Code"><TextInput value={station.identCode} maxLength={4} onChange={(identCode) => setStation({ identCode: identCode.toUpperCase() })} /></Field>
          <Field label="IDENT Keyer"><SelectInput value={station.identKeyer} options={(["none", "independent", "master", "slave", "continuous"] as const).map((value) => ({ value, label: value.toUpperCase() }))} onChange={(identKeyer) => setStation({ identKeyer })} /></Field>
          <Field label="IDENT Synchronization"><SelectInput value={station.identSync} options={[{ value: "code", label: "Code" }, { value: "pulse", label: "Pulse" }]} onChange={(identSync) => setStation({ identSync })} /></Field>
          <Field label="IDENT Sound"><SelectInput value={station.identSound} options={(["MON1", "MON2", "STB MON", "TX1", "TX2", "ON ANTENNA", "OFF"] as const).map((value) => ({ value, label: value }))} onChange={(identSound) => setStation({ identSound })} /></Field>
          <MopiensSlideSwitch label="Equalizing Pulse" checked={station.equalizerPulseEnabled} onCheckedChange={(equalizerPulseEnabled) => setStation({ equalizerPulseEnabled })} />
          <h3>Equipment Configuration</h3>
          <MopiensSlideSwitch label="Enable Interlock" checked={station.interlockEnabled} onCheckedChange={(interlockEnabled) => setStation({ interlockEnabled })} />
          <Field label="Standby Mode"><SelectInput value={station.standbyMode} options={[{ value: "hot", label: "Hot Standby" }, { value: "cold", label: "Cold Standby" }]} onChange={(standbyMode) => setStation({ standbyMode })} /></Field>
          <MopiensSlideSwitch label="Bypass Monitors on Boot" checked={station.bypassMonitorsOnBoot} onCheckedChange={(bypassMonitorsOnBoot) => setStation({ bypassMonitorsOnBoot })} />
          <MopiensSlideSwitch label="Transmitter Output on Boot" checked={station.transmitterOutputOnBoot} onCheckedChange={(transmitterOutputOnBoot) => setStation({ transmitterOutputOnBoot })} />
        </section>
      </div>
    </SetupFrame>
  );
}

function TransponderSetup({ props }: { props: Dme320ScreenProps }) {
  const config = props.simulation.config.draft;
  function setTransponder(transponderId: Dme320TransponderId, changes: Partial<Dme320Config["transmitters"][Dme320TransponderId]>) {
    updateDraft(props, { ...config, transmitters: { ...config.transmitters, [transponderId]: { ...config.transmitters[transponderId], ...changes } } });
  }
  return (
    <SetupFrame props={props}>
      <div className={styles.twoColumnGrid}>
        {TRANSPONDER_IDS.map((transponderId) => {
          const transmitter = config.transmitters[transponderId];
          return <section key={transponderId} className={styles.setupSection}>
            <h3>{transponderId.toUpperCase()}</h3>
            <Field label="Output Power" unit="%"><NumberInput min={0} max={100} step={0.1} value={transmitter.outputPowerPercent} onChange={(outputPowerPercent) => setTransponder(transponderId, { outputPowerPercent })} /></Field>
            <MopiensSlideSwitch label="Use Station Pulse Rate" checked={transmitter.useStationPulseRate} onCheckedChange={(useStationPulseRate) => setTransponder(transponderId, { useStationPulseRate })} />
            <MopiensSlideSwitch label="Use Station Echo Suppression" checked={transmitter.useStationEchoSuppression} onCheckedChange={(useStationEchoSuppression) => setTransponder(transponderId, { useStationEchoSuppression })} />
            <MopiensSlideSwitch label="Use Station IDENT" checked={transmitter.useStationIdent} onCheckedChange={(useStationIdent) => setTransponder(transponderId, { useStationIdent })} />
          </section>;
        })}
      </div>
    </SetupFrame>
  );
}

function ThermalSetup({ props }: { props: Dme320ScreenProps }) {
  const config = props.simulation.config.draft;
  const thermal = config.thermal;
  const setThermal = (changes: Partial<typeof thermal>) => updateDraft(props, { ...config, thermal: { ...thermal, ...changes } });
  return <SetupFrame props={props}><section className={styles.setupSection}>
    <h3>Cooling Fan and TXU Overheat Protection</h3>
    <Field label="Fan Control"><SelectInput value={thermal.fanMode} options={[{ value: "auto", label: "Automatic" }, { value: "on", label: "Forced On" }, { value: "off", label: "Forced Off" }]} onChange={(fanMode) => setThermal({ fanMode })} /></Field>
    <Field label="Fan Start" unit="°C"><NumberInput value={thermal.fanStartC} step={0.1} onChange={(fanStartC) => setThermal({ fanStartC })} /></Field>
    <Field label="Fan Stop" unit="°C"><NumberInput value={thermal.fanStopC} step={0.1} onChange={(fanStopC) => setThermal({ fanStopC })} /></Field>
    <Field label="TXU Shutdown" unit="°C"><NumberInput value={thermal.txuShutdownC} step={0.1} onChange={(txuShutdownC) => setThermal({ txuShutdownC })} /></Field>
    <Field label="TXU Restart" unit="°C"><NumberInput value={thermal.txuRestartC} step={0.1} onChange={(txuRestartC) => setThermal({ txuRestartC })} /></Field>
  </section></SetupFrame>;
}

function MonitorSetup({ props }: { props: Dme320ScreenProps }) {
  const config = props.simulation.config.draft;
  const monitor = config.monitor;
  const setMonitor = (changes: Partial<typeof monitor>) => updateDraft(props, { ...config, monitor: { ...monitor, ...changes } });
  return <SetupFrame props={props}><div className={styles.setupGrid}>
    <section className={styles.setupSection}><h3>Executive Monitor</h3>
      <Field label="MON Voting Logic"><SelectInput value={monitor.votingLogic} options={[{ value: "OR", label: "OR - either monitor" }, { value: "AND", label: "AND - both monitors" }]} onChange={(votingLogic) => setMonitor({ votingLogic })} /></Field>
      <Field label="Monitor Action Delay" unit="ms"><NumberInput min={0} step={100} value={monitor.monitorActionDelayMs} onChange={(monitorActionDelayMs) => setMonitor({ monitorActionDelayMs })} /></Field>
      <Field label="Post-changeover Holdoff" unit="ms"><NumberInput min={0} step={100} value={monitor.postChangeoverHoldoffMs} onChange={(postChangeoverHoldoffMs) => setMonitor({ postChangeoverHoldoffMs })} /></Field>
    </section>
    <section className={styles.setupSection}><h3>Monitor Timers</h3>
      <Field label="IDENT Fault Delay" unit="ms"><NumberInput min={0} step={100} value={monitor.identFaultDelayMs} onChange={(identFaultDelayMs) => setMonitor({ identFaultDelayMs })} /></Field>
      <Field label="Self-Test Holdoff" unit="ms"><NumberInput min={0} step={100} value={monitor.selfTestHoldoffMs} onChange={(selfTestHoldoffMs) => setMonitor({ selfTestHoldoffMs })} /></Field>
      <Field label="Power-On Holdoff" unit="ms"><NumberInput min={0} step={100} value={monitor.powerOnHoldoffMs} onChange={(powerOnHoldoffMs) => setMonitor({ powerOnHoldoffMs })} /></Field>
    </section>
  </div></SetupFrame>;
}

function MonitorLimitsSetup({ props }: { props: Dme320ScreenProps }) {
  const config = props.simulation.config.draft;
  function setLimit(parameter: Dme320MonitorParameter, changes: Partial<Dme320Config["monitor"]["limits"][Dme320MonitorParameter]>) {
    updateDraft(props, { ...config, monitor: { ...config.monitor, limits: { ...config.monitor.limits, [parameter]: { ...config.monitor.limits[parameter], ...changes } } } });
  }
  function nullableNumber(value: string): number | null { return value.trim() === "" ? null : Number(value); }
  return <SetupFrame props={props}><div className={styles.editTableFrame}><table className={styles.editTable}>
    <caption>Executive monitor alarm and warning limits</caption>
    <thead><tr><th>Parameter</th><th>Alarm Low</th><th>Warning Low</th><th>Nominal</th><th>Warning High</th><th>Alarm High</th><th>Class</th><th>Delay ms</th><th>Unit</th></tr></thead>
    <tbody>{DME320_MONITOR_PARAMETERS.map((parameter) => { const limit = config.monitor.limits[parameter]; return <tr key={parameter}>
      <th scope="row">{DME320_PARAMETER_LABELS[parameter]}</th>
      <td><input aria-label={`${parameter} alarm low`} type="number" value={limit.alarmLow ?? ""} onChange={(event) => setLimit(parameter, { alarmLow: nullableNumber(event.currentTarget.value) })} /></td>
      <td><input aria-label={`${parameter} warning low`} type="number" value={limit.warningLow ?? ""} onChange={(event) => setLimit(parameter, { warningLow: nullableNumber(event.currentTarget.value) })} /></td>
      <td>{typeof limit.nominal === "number" ? <input aria-label={`${parameter} nominal`} type="number" value={limit.nominal} onChange={(event) => setLimit(parameter, { nominal: Number(event.currentTarget.value) })} /> : <input aria-label={`${parameter} nominal`} value={limit.nominal} onChange={(event) => setLimit(parameter, { nominal: event.currentTarget.value })} />}</td>
      <td><input aria-label={`${parameter} warning high`} type="number" value={limit.warningHigh ?? ""} onChange={(event) => setLimit(parameter, { warningHigh: nullableNumber(event.currentTarget.value) })} /></td>
      <td><input aria-label={`${parameter} alarm high`} type="number" value={limit.alarmHigh ?? ""} onChange={(event) => setLimit(parameter, { alarmHigh: nullableNumber(event.currentTarget.value) })} /></td>
      <td><select aria-label={`${parameter} classification`} value={limit.classification} onChange={(event) => setLimit(parameter, { classification: event.currentTarget.value as "primary" | "secondary" })}><option value="primary">Primary</option><option value="secondary">Secondary</option></select></td>
      <td><input aria-label={`${parameter} alarm delay`} type="number" min={0} step={100} value={limit.alarmDelayMs} onChange={(event) => setLimit(parameter, { alarmDelayMs: Number(event.currentTarget.value) })} /></td>
      <td>{limit.unit || "-"}</td>
    </tr>; })}</tbody>
  </table></div></SetupFrame>;
}

function SystemSetup({ props }: { props: Dme320ScreenProps }) {
  const config = props.simulation.config.draft;
  const system = config.system;
  const setSystem = (changes: Partial<typeof system>) => updateDraft(props, { ...config, system: { ...system, ...changes } });
  return <SetupFrame props={props}><div className={styles.setupGrid}>
    <section className={styles.setupSection}><h3>Security and Configuration</h3>
      <MopiensSlideSwitch label="Allow Simultaneous Login" checked={system.allowSimultaneousLogin} onCheckedChange={(allowSimultaneousLogin) => setSystem({ allowSimultaneousLogin })} />
      <MopiensSlideSwitch label="Allow Guest Access" checked={system.allowGuestAccess} onCheckedChange={(allowGuestAccess) => setSystem({ allowGuestAccess })} />
      <Field label="Automatic Logout" unit="minutes"><NumberInput min={0} step={1} value={system.automaticLogoutMinutes} onChange={(automaticLogoutMinutes) => setSystem({ automaticLogoutMinutes })} /></Field>
      <MopiensSlideSwitch label="Modify Only When Both Monitors Bypassed" checked={system.modifyOnlyWhenBypassed} onCheckedChange={(modifyOnlyWhenBypassed) => setSystem({ modifyOnlyWhenBypassed })} />
      <MopiensSlideSwitch label="Modify Only At Local" checked={system.modifyOnlyAtLocal} onCheckedChange={(modifyOnlyAtLocal) => setSystem({ modifyOnlyAtLocal })} />
    </section>
    <section className={styles.setupSection}><h3>Communication Fault Action</h3>
      <MopiensSlideSwitch label="Shutdown on RCU Fault" checked={system.shutdownOnRcuFault} onCheckedChange={(shutdownOnRcuFault) => setSystem({ shutdownOnRcuFault })} />
      <MopiensSlideSwitch label="Shutdown on LMI Fault" checked={system.shutdownOnLmiFault} onCheckedChange={(shutdownOnLmiFault) => setSystem({ shutdownOnLmiFault })} />
      <MopiensSlideSwitch label="Shutdown on CSP Fault" checked={system.shutdownOnCspFault} onCheckedChange={(shutdownOnCspFault) => setSystem({ shutdownOnCspFault })} />
      <Field label="Fault Shutdown Delay" unit="ms"><NumberInput min={0} step={100} value={system.communicationFaultShutdownDelayMs} onChange={(communicationFaultShutdownDelayMs) => setSystem({ communicationFaultShutdownDelayMs })} /></Field>
    </section>
  </div></SetupFrame>;
}

function EnvironmentSetup({ props }: { props: Dme320ScreenProps }) {
  const config = props.simulation.config.draft;
  const environment = config.environment;
  const setEnvironment = (changes: Partial<typeof environment>) => updateDraft(props, { ...config, environment: { ...environment, ...changes } });
  function toggle(values: boolean[], index: number, checked: boolean): boolean[] { const next = [...values]; next[index] = checked; return next; }
  return <SetupFrame props={props}><div className={styles.screenStack}>
    <section className={styles.setupSection}><h3>Environmental Monitor Unit</h3><MopiensSlideSwitch label="EMU Installed / Enabled" checked={environment.emuEnabled} onCheckedChange={(emuEnabled) => setEnvironment({ emuEnabled })} /></section>
    <div className={styles.setupGrid}>
      <section className={styles.setupSection}><h3>Analog Inputs</h3><div className={styles.switchMatrix}>{environment.analogInputsEnabled.map((enabled, index) => <MopiensSlideSwitch key={index} label={`Analog Input ${index + 1}`} checked={enabled} onCheckedChange={(checked) => setEnvironment({ analogInputsEnabled: toggle(environment.analogInputsEnabled, index, checked) })} />)}</div></section>
      <section className={styles.setupSection}><h3>Digital Inputs</h3><div className={styles.switchMatrix}>{environment.digitalInputsEnabled.map((enabled, index) => <MopiensSlideSwitch key={index} label={`Digital Input ${index + 1}`} checked={enabled} onCheckedChange={(checked) => setEnvironment({ digitalInputsEnabled: toggle(environment.digitalInputsEnabled, index, checked) })} />)}</div></section>
      <section className={styles.setupSection}><h3>Expansion Inputs</h3><div className={styles.switchMatrix}>{environment.expansionDigitalInputsEnabled.map((enabled, index) => <MopiensSlideSwitch key={index} label={`Expansion Input ${index + 1}`} checked={enabled} onCheckedChange={(checked) => setEnvironment({ expansionDigitalInputsEnabled: toggle(environment.expansionDigitalInputsEnabled, index, checked) })} />)}</div></section>
      <section className={styles.setupSection}><h3>Digital Outputs</h3><div className={styles.switchMatrix}>{environment.digitalOutputsEnabled.map((enabled, index) => <MopiensSlideSwitch key={index} label={`Digital Output ${index + 1}`} checked={enabled} onCheckedChange={(checked) => setEnvironment({ digitalOutputsEnabled: toggle(environment.digitalOutputsEnabled, index, checked) })} />)}</div></section>
    </div>
  </div></SetupFrame>;
}

function CommunicationSetup({ props }: { props: Dme320ScreenProps }) {
  const config = props.simulation.config.draft;
  const communication = config.communication;
  const setCommunication = (changes: Partial<typeof communication>) => updateDraft(props, { ...config, communication: { ...communication, ...changes } });
  const remoteTypes = (["RS-232", "Leased Line", "Dialup"] as const).map((value) => ({ value, label: value }));
  return <SetupFrame props={props}><div className={styles.setupGrid}>
    <section className={styles.setupSection}><h3>Connection Limits / Local PMDT</h3>
      <Field label="Remote Connection Limit"><NumberInput min={0} step={1} value={communication.remoteConnectionLimit} onChange={(remoteConnectionLimit) => setCommunication({ remoteConnectionLimit })} /></Field>
      <Field label="Local Connection Limit"><NumberInput min={0} step={1} value={communication.localConnectionLimit} onChange={(localConnectionLimit) => setCommunication({ localConnectionLimit })} /></Field>
      <Field label="Local PMDT Baud Rate"><NumberInput min={1200} step={1} value={communication.localPmdtBaudRate} onChange={(localPmdtBaudRate) => setCommunication({ localPmdtBaudRate })} /></Field>
      <Field label="Local IP Start"><TextInput value={communication.localIpStart} onChange={(localIpStart) => setCommunication({ localIpStart })} /></Field>
      <Field label="Local IP End"><TextInput value={communication.localIpEnd} onChange={(localIpEnd) => setCommunication({ localIpEnd })} /></Field>
    </section>
    <section className={styles.setupSection}><h3>SCU1 Remote</h3>
      <Field label="Remote Type"><SelectInput value={communication.scu1RemoteType} options={remoteTypes} onChange={(scu1RemoteType) => setCommunication({ scu1RemoteType })} /></Field>
      <Field label="Baud Rate"><NumberInput min={1200} step={1} value={communication.scu1BaudRate} onChange={(scu1BaudRate) => setCommunication({ scu1BaudRate })} /></Field>
      <MopiensSlideSwitch label="Flow Control" checked={communication.scu1FlowControl} onCheckedChange={(scu1FlowControl) => setCommunication({ scu1FlowControl })} />
      <h3>SCU2 Remote</h3>
      <Field label="Remote Type"><SelectInput value={communication.scu2RemoteType} options={remoteTypes} onChange={(scu2RemoteType) => setCommunication({ scu2RemoteType })} /></Field>
      <Field label="Baud Rate"><NumberInput min={1200} step={1} value={communication.scu2BaudRate} onChange={(scu2BaudRate) => setCommunication({ scu2BaudRate })} /></Field>
      <MopiensSlideSwitch label="Flow Control" checked={communication.scu2FlowControl} onCheckedChange={(scu2FlowControl) => setCommunication({ scu2FlowControl })} />
    </section>
    <section className={styles.setupSection}><h3>Remote Control Unit</h3>
      <Field label="RCU Line Type"><SelectInput value={communication.rcuLineType} options={(["Ethernet", "Modem", "RS-232"] as const).map((value) => ({ value, label: value }))} onChange={(rcuLineType) => setCommunication({ rcuLineType })} /></Field>
    </section>
  </div></SetupFrame>;
}

function BatterySetup({ props }: { props: Dme320ScreenProps }) {
  const config = props.simulation.config.draft;
  const battery = config.battery;
  const setBattery = (changes: Partial<typeof battery>) => updateDraft(props, { ...config, battery: { ...battery, ...changes } });
  return <SetupFrame props={props}><div className={styles.setupGrid}>
    <section className={styles.setupSection}><h3>Battery Alarm Limits</h3>
      <Field label="Voltage Warning" unit="V"><NumberInput step={0.1} value={battery.warningVoltage} onChange={(warningVoltage) => setBattery({ warningVoltage })} /></Field>
      <Field label="Voltage Alarm" unit="V"><NumberInput step={0.1} value={battery.alarmVoltage} onChange={(alarmVoltage) => setBattery({ alarmVoltage })} /></Field>
      <Field label="Temperature Warning" unit="°C"><NumberInput step={0.1} value={battery.warningTemperatureC} onChange={(warningTemperatureC) => setBattery({ warningTemperatureC })} /></Field>
      <Field label="Temperature Alarm" unit="°C"><NumberInput step={0.1} value={battery.alarmTemperatureC} onChange={(alarmTemperatureC) => setBattery({ alarmTemperatureC })} /></Field>
    </section>
    <section className={styles.setupSection}><h3>Charging / Simulation</h3>
      <Field label="Charging Current Limit" unit="A"><NumberInput min={0} step={0.1} value={battery.chargingCurrentLimitA} onChange={(chargingCurrentLimitA) => setBattery({ chargingCurrentLimitA })} /></Field>
      <Field label="Cutoff Voltage" unit="V"><NumberInput step={0.1} value={battery.cutoffVoltage} onChange={(cutoffVoltage) => setBattery({ cutoffVoltage })} /></Field>
      <Field label="Fully Charged Voltage" unit="V"><NumberInput step={0.1} value={battery.fullyChargedVoltage} onChange={(fullyChargedVoltage) => setBattery({ fullyChargedVoltage })} /></Field>
      <Field label="Simulated Discharge" unit="V/hour"><NumberInput min={0} step={0.1} value={battery.simulatedDischargeVoltsPerHour} onChange={(simulatedDischargeVoltsPerHour) => setBattery({ simulatedDischargeVoltsPerHour })} /></Field>
      <Field label="Simulated Charge" unit="V/hour"><NumberInput min={0} step={0.1} value={battery.simulatedChargeVoltsPerHour} onChange={(simulatedChargeVoltsPerHour) => setBattery({ simulatedChargeVoltsPerHour })} /></Field>
    </section>
  </div></SetupFrame>;
}
