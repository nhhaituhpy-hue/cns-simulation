"use client";

import Link from "next/link";
import {
  Broadcast,
  ClockCounterClockwise,
  Cpu,
  Gauge,
  Lightning,
  NavigationArrow,
  Thermometer,
  Warning,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import type { SensorMonitoringData, SensorState } from "@/lib/types";
import {
  formatSnmpAge,
  getSnmpAgeSeconds,
  isSnmpStale,
} from "./qcms-utils";
import { StatusBadge } from "./status-badge";

type SensorMonitoringModalProps = {
  scenarioId: string;
  sensor: SensorState;
  qcmsSymptoms?: readonly string[];
  onClose: () => void;
  now: number;
};

type MetricProps = {
  icon: Icon;
  label: string;
  children: ReactNode;
  warning?: boolean;
};

function Metric({ icon: MetricIcon, label, children, warning = false }: MetricProps) {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--background)] p-3">
      <dt className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
        <MetricIcon
          aria-hidden
          size={16}
          weight="regular"
          className={warning ? "text-[#b45309]" : "text-[var(--accent)]"}
        />
        {label}
      </dt>
      <dd
        className={`mt-2 text-sm font-semibold tabular-nums ${
          warning ? "text-[#92400e]" : "text-[var(--text-primary)]"
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

function displayNumber(value: number | undefined, suffix: string): string {
  if (value === undefined) {
    return "Chưa có dữ liệu";
  }

  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}${suffix}`;
}

function gpsLabel(status: SensorMonitoringData["gpsStatus"]): string {
  if (status === "synchronized") return "Đã đồng bộ";
  if (status === "unsynchronized") return "Mất đồng bộ";
  return "Không khả dụng";
}

export function SensorMonitoringModal({
  scenarioId,
  sensor,
  qcmsSymptoms = [],
  onClose,
  now,
}: SensorMonitoringModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const monitoring = sensor.monitoring;
  const snmpAge = monitoring
    ? getSnmpAgeSeconds(monitoring.lastSnmpResponseAt, now)
    : null;
  const stale = monitoring
    ? isSnmpStale(monitoring.lastSnmpResponseAt, now)
    : false;
  const terminalHref = `/student/terminal?id=${encodeURIComponent(
    scenarioId,
  )}&sensorId=${encodeURIComponent(sensor.id)}`;

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#172033]/45 p-4 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="my-auto w-full max-w-3xl overflow-hidden rounded-lg border border-[var(--border-strong)] bg-white shadow-[var(--shadow-panel)]"
      >
        <header className="flex items-start gap-4 border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Giám sát cảm biến
            </p>
            <h2
              id={titleId}
              className="mt-1 truncate text-lg font-bold text-[var(--text-primary)]"
            >
              Sensor {sensor.sensorLabel} | {sensor.ipAddress}
            </h2>
            <p
              id={descriptionId}
              className="mt-1 truncate text-sm text-[var(--text-secondary)]"
            >
              {sensor.name}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-white hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Đóng cửa sổ giám sát"
          >
            <X aria-hidden size={20} weight="regular" />
          </button>
        </header>

        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge status={sensor.status} />
            <span className="font-mono text-xs text-[var(--text-muted)]">
              ID: {sensor.id}
            </span>
          </div>

          {stale ? (
            <div
              role="status"
              className="mt-4 flex items-start gap-3 rounded border border-[#f59e0b] bg-[#fffbeb] p-3 text-[#78350f]"
            >
              <Warning aria-hidden className="mt-0.5 shrink-0" size={19} weight="fill" />
              <div>
                <p className="text-sm font-semibold">Dữ liệu SNMP đã cũ</p>
                <p className="mt-1 text-xs leading-5">
                  Phản hồi gần nhất đã quá 60 giây. Hãy kiểm tra kết nối quản lý.
                </p>
              </div>
            </div>
          ) : null}

          {qcmsSymptoms.length > 0 ? (
            <section className="mt-4 rounded border border-amber-300 bg-amber-50 p-3">
              <h3 className="text-sm font-semibold text-amber-950">
                Hiện tượng ghi nhận trên QCMS
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-900">
                {qcmsSymptoms.map((symptom) => (
                  <li key={symptom}>{symptom}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric icon={ClockCounterClockwise} label="Phản hồi SNMP" warning={stale}>
              {formatSnmpAge(snmpAge)}
            </Metric>
            <Metric icon={Thermometer} label="Nhiệt độ">
              {displayNumber(monitoring?.temperatureC, " °C")}
            </Metric>
            <Metric icon={Cpu} label="Tải CPU">
              {displayNumber(monitoring?.cpuLoadPercent, "%")}
            </Metric>
            <Metric icon={Lightning} label="Điện áp">
              {monitoring
                ? `${monitoring.voltages.v3_3.toFixed(2)} V / ${monitoring.voltages.v5.toFixed(2)} V / ${monitoring.voltages.v12.toFixed(2)} V`
                : "Chưa có dữ liệu"}
            </Metric>
            <Metric icon={Gauge} label="Độ tin cậy thu">
              {displayNumber(monitoring?.receiverConfidencePercent, "%")}
            </Metric>
            <Metric icon={Broadcast} label="Lỗi CRC">
              {monitoring
                ? monitoring.crcErrorCount.toLocaleString("vi-VN")
                : "Chưa có dữ liệu"}
            </Metric>
            <Metric
              icon={NavigationArrow}
              label="Trạng thái GPS"
              warning={monitoring?.gpsStatus === "unsynchronized"}
            >
              {monitoring ? gpsLabel(monitoring.gpsStatus) : "Chưa có dữ liệu"}
            </Metric>
          </dl>

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              Đóng
            </button>
            <Link
              href={terminalHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-[var(--accent)] px-4 text-center text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              <Broadcast aria-hidden size={18} weight="regular" />
              Mở ứng dụng bảo trì
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
