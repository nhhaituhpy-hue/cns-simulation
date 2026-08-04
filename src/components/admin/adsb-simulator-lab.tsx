"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { Terminal } from "@phosphor-icons/react/dist/csr/Terminal";
import Link from "next/link";
import { useEffect } from "react";
import { TerminalWindow } from "@/components/terminal/terminal-window";
import {
  NOI_BAI_TRAINING_MONITORING,
  NOI_BAI_TRAINING_SENSOR,
} from "@/lib/sensor-data-presets";
import { createTerminalStore } from "@/stores/terminal-store";

const useAdsbSimulatorTerminal = createTerminalStore({
  acceptedLoginUsers: ["sysadmin", "maintenance"],
  recordAction: () => undefined,
  onAuthenticated: () => undefined,
});

const LAB_INITIALIZATION = {
  targetLoginUser: "sysadmin" as const,
  header: {
    sensorName: NOI_BAI_TRAINING_SENSOR.sensorName,
    version: NOI_BAI_TRAINING_SENSOR.sensorVersion,
  },
  sensorDataProfile: NOI_BAI_TRAINING_SENSOR,
  sensorMonitoring: NOI_BAI_TRAINING_MONITORING,
};

export function AdsbSimulatorLab() {
  const terminal = useAdsbSimulatorTerminal();
  const connectionIpAddress =
    terminal.connectionIpAddress ?? NOI_BAI_TRAINING_SENSOR.network.ip;

  useEffect(() => {
    terminal.initialize(LAB_INITIALIZATION);
  }, [terminal.initialize]);

  return (
    <div className="simulator-skin min-h-[calc(100dvh-4.25rem)] w-full bg-[#070a12] text-[#e2e8f0]">
      <header className="border-b border-[#334155] bg-[#0f172a]">
        <div className="flex h-8 items-center justify-between gap-3 border-b border-[#26364d] px-4">
          <Link
            href="/simulator"
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#cbd5e1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
          >
            <ArrowLeft aria-hidden size={13} />
            Quay về Simulator
          </Link>
          <span className="font-mono text-[10px] text-[#7dd3fc]">
            SSH {connectionIpAddress}
          </span>
        </div>

        <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center border border-[#31506d] bg-[#13283b] text-[#7dd3fc]">
              <Terminal aria-hidden size={20} weight="regular" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-wide text-[#f1f5f9]">
                ADS-B SENSOR TERMINAL
              </h1>
              <p className="mt-0.5 text-[11px] text-[#94a3b8]">
                Tài khoản: <span className="font-mono text-[#cbd5e1]">sysadmin</span> hoặc{" "}
                <span className="font-mono text-[#cbd5e1]">maintenance</span>. Mật khẩu nhập ký tự bất kỳ.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={terminal.reset}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 border border-[#3b5068] bg-[#172235] px-3 text-xs font-semibold text-[#cbd5e1] transition-[background-color,border-color,color,transform] hover:border-[#5f7894] hover:bg-[#1e3047] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] active:scale-[0.98] motion-reduce:transform-none"
          >
            <ArrowCounterClockwise aria-hidden size={16} weight="bold" />
            Khởi động lại
          </button>
        </div>
      </header>

      <TerminalWindow
        variant="workspace"
        ipAddress={connectionIpAddress}
        output={terminal.output}
        pendingPrompt={terminal.pendingPrompt}
        pendingSensitive={terminal.pendingSensitive}
        isExited={terminal.isExited}
        onSubmit={terminal.processInput}
      />
    </div>
  );
}
