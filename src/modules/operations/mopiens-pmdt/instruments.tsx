"use client";

import { Check } from "@phosphor-icons/react/dist/csr/Check";
import type { CSSProperties } from "react";
import type {
  MopiensBeveledButtonProps,
  MopiensGaugeProps,
  MopiensGaugeSegment,
  MopiensSlideSwitchProps,
  MopiensStatusIndicatorProps,
  MopiensVisualTone,
} from "./types";
import styles from "./mopiens-pmdt.module.css";

const toneClasses: Record<MopiensVisualTone, string> = {
  normal: styles.toneNormal,
  info: styles.toneInfo,
  warning: styles.toneWarning,
  alarm: styles.toneAlarm,
  pending: styles.tonePending,
  inactive: styles.toneInactive,
};

const toneColors: Record<MopiensVisualTone, string> = {
  normal: "#16b83e",
  info: "#1886c9",
  warning: "#f0b400",
  alarm: "#e5312a",
  pending: "#ef7f1a",
  inactive: "#a7adb3",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizedValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || max <= min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

function gaugeTrack(
  segments: readonly MopiensGaugeSegment[] | undefined,
  min: number,
  max: number,
  fallbackTone: MopiensVisualTone,
): string {
  if (!segments?.length || max <= min) {
    return `conic-gradient(from 225deg, ${toneColors[fallbackTone]} 0% 75%, transparent 75% 100%)`;
  }

  const ordered = [...segments]
    .map((segment) => ({
      ...segment,
      from: normalizedValue(segment.from, min, max) * 75,
      to: normalizedValue(segment.to, min, max) * 75,
    }))
    .filter((segment) => segment.to > segment.from)
    .sort((left, right) => left.from - right.from);

  const stops: string[] = [];
  let cursor = 0;
  for (const segment of ordered) {
    if (segment.from > cursor) {
      stops.push(`#c9cdd1 ${cursor}% ${segment.from}%`);
    }
    stops.push(`${toneColors[segment.tone]} ${segment.from}% ${segment.to}%`);
    cursor = Math.max(cursor, segment.to);
  }
  if (cursor < 75) stops.push(`#c9cdd1 ${cursor}% 75%`);
  stops.push("transparent 75% 100%");
  return `conic-gradient(from 225deg, ${stops.join(", ")})`;
}

export function MopiensGauge({
  label,
  value,
  min,
  max,
  unit,
  secondaryValue,
  formatValue = (current) => current.toFixed(1),
  segments,
  tone = "normal",
  size = "medium",
}: MopiensGaugeProps) {
  const percentage = normalizedValue(value, min, max);
  const gaugeStyle = {
    "--mopiens-gauge-angle": `${-135 + percentage * 270}deg`,
    "--mopiens-gauge-track": gaugeTrack(segments, min, max, tone),
  } as CSSProperties;

  return (
    <figure
      className={`${styles.gauge} ${styles[`gaugeSize${size[0].toUpperCase()}${size.slice(1)}`]} ${
        toneClasses[tone]
      }`}
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${formatValue(value)}${unit ? ` ${unit}` : ""}`}
      style={gaugeStyle}
    >
      <figcaption>{label}</figcaption>
      <div className={styles.gaugeDial} aria-hidden>
        <span className={styles.gaugeArc} />
        <span className={styles.gaugeNeedle} />
        <span className={styles.gaugePivot} />
        {unit ? <span className={styles.gaugeUnit}>{unit}</span> : null}
      </div>
      <div className={styles.gaugeReadouts} aria-hidden>
        <output>{formatValue(value)}</output>
        {secondaryValue !== undefined ? <output>{formatValue(secondaryValue)}</output> : null}
      </div>
    </figure>
  );
}

export function MopiensSlideSwitch({
  label,
  checked,
  onCheckedChange,
  disabled,
  onLabel = "ON",
  offLabel = "OFF",
  orientation = "horizontal",
  tone = "normal",
}: MopiensSlideSwitchProps) {
  const interactive = Boolean(onCheckedChange) && !disabled;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={!interactive}
      className={`${styles.slideSwitch} ${
        orientation === "vertical" ? styles.slideSwitchVertical : styles.slideSwitchHorizontal
      } ${checked ? styles.slideSwitchChecked : ""} ${toneClasses[tone]}`}
      onClick={() => onCheckedChange?.(!checked)}
    >
      <span className={styles.slideSwitchTrack} aria-hidden>
        <span className={styles.slideSwitchText}>{checked ? onLabel : offLabel}</span>
        <span className={styles.slideSwitchThumb} />
      </span>
      <span className={styles.slideSwitchLabel}>{label}</span>
    </button>
  );
}

export function MopiensStatusIndicator({
  label,
  tone,
  detail,
  appearance = "lamp",
  compact = false,
}: MopiensStatusIndicatorProps) {
  return (
    <span
      className={`${styles.statusIndicator} ${styles[`statusIndicator${appearance[0].toUpperCase()}${appearance.slice(1)}`]} ${
        compact ? styles.statusIndicatorCompact : ""
      } ${toneClasses[tone]}`}
      role="status"
      aria-label={`${label}: ${typeof detail === "string" ? detail : tone}`}
    >
      <span className={styles.statusIndicatorMark} aria-hidden>
        {appearance === "ring" ? <Check size={27} weight="bold" /> : null}
      </span>
      <span className={styles.statusIndicatorText}>
        <strong>{label}</strong>
        {detail !== undefined ? <small>{detail}</small> : null}
      </span>
    </span>
  );
}

export function MopiensBeveledButton({
  tone = "default",
  pressed,
  icon,
  children,
  className,
  type = "button",
  ...buttonProps
}: MopiensBeveledButtonProps) {
  const toneName = `controlTone${tone[0].toUpperCase()}${tone.slice(1)}`;
  return (
    <button
      {...buttonProps}
      type={type}
      aria-pressed={pressed}
      className={`${styles.beveledButton} ${styles[toneName]} ${
        pressed ? styles.beveledButtonPressed : ""
      } ${className ?? ""}`}
    >
      {icon ? <span className={styles.beveledButtonIcon}>{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
