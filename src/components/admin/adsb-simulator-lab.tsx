"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
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

  useEffect(() => {
    terminal.initialize(LAB_INITIALIZATION);
  }, [terminal.initialize]);

  return (
    <div className="w-full max-w-none px-4 py-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/admin/ads-b"
            className="inline-flex min-h-9 items-center gap-2 rounded text-sm font-semibold text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <ArrowLeft aria-hidden size={17} />
            Quay lại quản trị ADS-B
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
              <Terminal aria-hidden size={22} weight="duotone" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl">
                Trình giả lập ADS-B chuẩn
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Kiểm tra trực tiếp toàn bộ menu và luồng lệnh trước khi đưa vào
                kịch bản.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={terminal.reset}
          className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition-[background-color,border-color,color,transform] hover:border-[var(--accent-border)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transform-none"
        >
          <ArrowCounterClockwise aria-hidden size={18} weight="bold" />
          Khởi động lại phiên
        </button>
      </header>

      <section
        aria-label="Thông tin đăng nhập giả lập"
        className="my-5 flex flex-col gap-3 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--text-secondary)] lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex items-start gap-2.5">
          <Info
            aria-hidden
            size={19}
            weight="duotone"
            className="mt-0.5 shrink-0 text-[var(--accent)]"
          />
          <p className="leading-6">
            Nhập tên tài khoản hoặc cú pháp SSH đầy đủ tại dấu nhắc{" "}
            <span className="font-mono font-semibold text-[var(--text-primary)]">
              login:
            </span>
            : <span className="font-mono">sysadmin</span>,{" "}
            <span className="font-mono">maintenance</span> hoặc{" "}
            <span className="font-mono">&lt;tài khoản&gt;@192.168.10.2</span>.
            Mật khẩu mô phỏng có thể là ký tự bất kỳ.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-xs font-semibold">
          <span className="rounded-md border border-[var(--accent-border)] bg-white px-2.5 py-1.5 text-[var(--accent-active)]">
            sysadmin
          </span>
          <span className="rounded-md border border-[var(--accent-border)] bg-white px-2.5 py-1.5 text-[var(--accent-active)]">
            maintenance
          </span>
          <span className="rounded-md border border-[var(--accent-border)] bg-white px-2.5 py-1.5 text-[var(--text-secondary)]">
            IP: {NOI_BAI_TRAINING_SENSOR.network.ip}
          </span>
        </div>
      </section>

      <TerminalWindow
        ipAddress={NOI_BAI_TRAINING_SENSOR.network.ip}
        output={terminal.output}
        pendingPrompt={terminal.pendingPrompt}
        pendingSensitive={terminal.pendingSensitive}
        isExited={terminal.isExited}
        onSubmit={terminal.processInput}
      />
    </div>
  );
}
