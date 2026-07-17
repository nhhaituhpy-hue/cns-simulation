"use client";

import type { DmeIndicatorColor } from "@/lib/dme-types";
import {
  resolveDmeField,
  resolveDmeStatus,
  useDmePmdtStore,
} from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import {
  DmeIndicator,
  DmeValueCell,
  PmdtPanel,
  ScreenTabs,
  dmeFieldMetadata,
} from "./screen-primitives";

function StatusFlag({
  fieldId,
  label,
  value,
  activeColor = "yellow",
}: {
  fieldId: string;
  label: string;
  value: boolean;
  activeColor?: DmeIndicatorColor;
}) {
  const overrides = useDmePmdtStore((state) => state.overrides);
  const resolved = resolveDmeField(value, fieldId, overrides);
  const status = resolveDmeStatus(resolved ? activeColor : "gray", fieldId, overrides);
  return (
    <div {...dmeFieldMetadata(fieldId, label, resolved, status)} className="flex min-h-7 items-center justify-between gap-3 border-b border-[#263247] px-2 last:border-0">
      <span>{label}</span>
      <DmeIndicator color={status} />
    </div>
  );
}

function RmsStatusMain() {
  const data = useDmePmdtStore((state) => state.data);
  const revisionLabels = {
    rms: "RMS",
    monitor1: "Monitor 1",
    monitor2: "Monitor 2",
    rtc1: "RTC 1",
    rtc2: "RTC 2",
    bcps1: "BCPS 1",
    bcps2: "BCPS 2",
    lcu: "LCU",
  } as const;

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <div className="grid gap-4">
        <PmdtPanel title="System">
          <div className="grid gap-1">
            <div className="flex min-h-7 items-center justify-between border-b border-[#263247] px-2">
              <span>PMDT Logon Level</span>
              <DmeValueCell fieldId="rmsStatus.logonLevel" label="PMDT Logon Level" value={data.rmsStatus.logonLevel} />
            </div>
            <StatusFlag fieldId="rmsStatus.localControlMode" label="Local Control Mode" value={data.rmsStatus.localControlMode} />
            <StatusFlag fieldId="rmsStatus.maintenanceAlert" label="Maintenance Alert" value={data.rmsStatus.maintenanceAlert} />
            <StatusFlag fieldId="rmsStatus.onBattery" label="On Battery" value={data.rmsStatus.onBattery} />
            <StatusFlag fieldId="rmsStatus.acFailure" label="AC Failure" value={data.rmsStatus.acFailure} activeColor="red" />
            <StatusFlag fieldId="rmsStatus.remoteControlEnabled" label="Remote Control Enabled" value={data.rmsStatus.remoteControlEnabled} activeColor="green" />
            <StatusFlag fieldId="rmsStatus.interlocked" label="Interlocked" value={data.rmsStatus.interlocked} activeColor="red" />
          </div>
        </PmdtPanel>
        <PmdtPanel title="RCSU Connection">
          <StatusFlag fieldId="rmsStatus.rcsuConnectionEnabled" label="RCSU Connection Enabled" value={data.rmsStatus.rcsuConnectionEnabled} activeColor="green" />
          <StatusFlag fieldId="rmsStatus.rcsuCommunicationError" label="RCSU Communication Error" value={data.rmsStatus.rcsuCommunicationError} activeColor="red" />
          <div className="mt-2 flex items-center justify-between px-2">
            <span>Approach Type</span>
            <DmeValueCell fieldId="rmsStatus.approachType" label="Approach Type" value={data.rmsStatus.approachType} status="gray" />
          </div>
        </PmdtPanel>
      </div>
      <PmdtPanel title="Revision Levels">
        <dl className="grid gap-1">
          {(Object.keys(revisionLabels) as Array<keyof typeof revisionLabels>).map((key) => (
            <div key={key} className="flex min-h-8 items-center justify-between border-b border-[#263247] px-2 last:border-0">
              <dt>{revisionLabels[key]}</dt>
              <dd><DmeValueCell fieldId={`revisionLevels.${key}`} label={`${revisionLabels[key]} Revision`} value={data.revisionLevels[key]} status="gray" /></dd>
            </div>
          ))}
        </dl>
      </PmdtPanel>
    </div>
  );
}

function MonitorTransmitterStatus() {
  const data = useDmePmdtStore((state) => state.data);
  const status = data.monitorTransmitterStatus;
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <PmdtPanel title="Monitors">
        <StatusFlag fieldId="monitorTransmitterStatus.monitorAlarmShutdown" label="Monitor Alarm Shutdown" value={status.monitorAlarmShutdown} activeColor="red" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatusFlag fieldId="monitorTransmitterStatus.enabledMonitors.monitor1" label="Monitor 1 Enabled" value={status.enabledMonitors.monitor1} activeColor="green" />
          <StatusFlag fieldId="monitorTransmitterStatus.enabledMonitors.monitor2" label="Monitor 2 Enabled" value={status.enabledMonitors.monitor2} activeColor="green" />
        </div>
      </PmdtPanel>
      <PmdtPanel title="Transmitters">
        <div className="grid gap-3">
          <div className="flex items-center justify-between"><span>Antenna Select</span><DmeValueCell fieldId="monitorTransmitterStatus.antennaSelect" label="Antenna Select" value={`Tx ${status.antennaSelect}`} /></div>
          <div className="flex items-center justify-between"><span>Main Select</span><DmeValueCell fieldId="monitorTransmitterStatus.mainSelect" label="Main Select" value={`Tx ${status.mainSelect}`} /></div>
          <StatusFlag fieldId="monitorTransmitterStatus.transmitterOn.tx1" label="Transmitter 1 On" value={status.transmitterOn.tx1} activeColor="green" />
          <StatusFlag fieldId="monitorTransmitterStatus.transmitterOn.tx2" label="Transmitter 2 On" value={status.transmitterOn.tx2} activeColor="green" />
        </div>
      </PmdtPanel>
    </div>
  );
}

export function RmsStatusLayout() {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const openView = useDmePmdtStore((state) => state.openView);
  return (
    <section className="flex min-h-full flex-col" aria-label="RMS Status">
      <PmdtToolbar title="RMS Status" />
      <ScreenTabs tabs={[
        { id: "rms-status-main", label: "RMS Status", active: activeView === "rms-status-main", onSelect: () => openView("rms-status", "rms-status-main", ["RMS", "Status", "RMS Status"], "RMS Status") },
        { id: "rms-status-monitor-tx", label: "Monitor/Transmitter Status", active: activeView === "rms-status-monitor-tx", onSelect: () => openView("rms-status", "rms-status-monitor-tx", ["RMS", "Status", "Monitor/Transmitter Status"], "Monitor/Transmitter Status") },
      ]} />
      <div className="min-h-0 flex-1 overflow-auto">
        {activeView === "rms-status-monitor-tx" ? <MonitorTransmitterStatus /> : <RmsStatusMain />}
      </div>
    </section>
  );
}
