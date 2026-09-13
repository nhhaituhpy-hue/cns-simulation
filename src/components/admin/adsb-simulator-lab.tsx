"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { Terminal } from "@phosphor-icons/react/dist/csr/Terminal";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TerminalWindow } from "@/components/terminal/terminal-window";
import {
  applySimulatorConfig,
  initializeSimulatorConfig,
  loadSimulatorConfig,
} from "@/lib/simulator-config/client";
import { collectChangedConfigFields } from "@/lib/simulator-config/diff";
import { adsbConfigAdapter } from "@/lib/simulator-config/ads-b";
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
  const [persistenceReady, setPersistenceReady] = useState(false);
  const revisionRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const persistedConfigRef = useRef<ReturnType<typeof terminal.getPersistentState>>(null);
  const persistChainRef = useRef(Promise.resolve());
  const [persistenceStatus, setPersistenceStatus] = useState<"" | "loading" | "saved" | "error">("");

  useEffect(() => {
    sessionIdRef.current = typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : null;
    let cancelled = false;

    async function initializeWithSavedConfig() {
      setPersistenceStatus("loading");
      try {
        let response = await loadSimulatorConfig("ads-b");
        if (!response.persisted) response = await initializeSimulatorConfig("ads-b");
        const config = adsbConfigAdapter.parseConfig(response.appliedConfig);
        if (!config) throw new Error("Cấu hình ADS-B từ server không hợp lệ.");
        if (cancelled) return;
        terminal.initialize({ ...LAB_INITIALIZATION, initialPersistentState: config });
        persistedConfigRef.current = terminal.getPersistentState();
        revisionRef.current = response.revision;
        setPersistenceReady(true);
        setPersistenceStatus("saved");
      } catch (error) {
        if (cancelled) return;
        console.error("ADS-B configuration hydration failed:", error);
        terminal.initialize(LAB_INITIALIZATION);
        persistedConfigRef.current = terminal.getPersistentState();
        setPersistenceReady(false);
        setPersistenceStatus("error");
      }
    }

    void initializeWithSavedConfig();
    return () => {
      cancelled = true;
      setPersistenceReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- individual terminal methods listed explicitly
  }, [terminal.initialize, terminal.getPersistentState]);

  useEffect(() => {
    if (!persistenceReady) return;
    const currentConfig = terminal.getPersistentState();
    const previousConfig = persistedConfigRef.current;
    if (!currentConfig || !previousConfig) return;
    if (JSON.stringify(currentConfig) === JSON.stringify(previousConfig)) return;

    persistedConfigRef.current = structuredClone(currentConfig);
    persistChainRef.current = persistChainRef.current
      .then(async () => {
        const response = await applySimulatorConfig({
          simulatorId: "ads-b",
          action: "apply",
          config: currentConfig,
          expectedRevision: revisionRef.current,
          changedFields: collectChangedConfigFields(previousConfig, currentConfig),
          operatorUserId: terminal.loginUser,
          sessionId: sessionIdRef.current,
        });
        revisionRef.current = response.revision;
        setPersistenceStatus("saved");
      })
      .catch((error) => {
        console.error("ADS-B configuration persistence failed:", error);
        setPersistenceStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- individual terminal properties listed explicitly
  }, [
    persistenceReady,
    terminal.authPhase,
    terminal.getPersistentState,
    terminal.isLoggedIn,
    terminal.lastProcessResult,
    terminal.loginUser,
  ]);

  return (
    <div className="simulator-skin adsb-simulator-lab min-h-screen w-full bg-[#070a12] text-[#e2e8f0]">
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
      <span className="sr-only" role="status" aria-live="polite">{persistenceStatus}</span>
    </div>
  );
}
