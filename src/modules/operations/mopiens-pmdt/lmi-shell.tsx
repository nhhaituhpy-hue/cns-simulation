"use client";

import { MopiensDesktopViewport } from "./desktop-viewport";
import type { MopiensLmiShellProps, MopiensVisualTone } from "./types";
import styles from "./mopiens-pmdt.module.css";

const toneClasses: Record<MopiensVisualTone, string> = {
  normal: styles.toneNormal,
  info: styles.toneInfo,
  warning: styles.toneWarning,
  alarm: styles.toneAlarm,
  pending: styles.tonePending,
  inactive: styles.toneInactive,
};

export function MopiensLmiShell({
  ariaLabel,
  title,
  unitLabel = "MOPIENS",
  screenTitle,
  indicators = [],
  softKeys = [],
  statusItems = [],
  children,
  designWidth = 800,
  designHeight = 600,
  minimumScale,
  onSoftKey,
}: MopiensLmiShellProps) {
  return (
    <MopiensDesktopViewport
      aria-label={ariaLabel}
      designWidth={designWidth}
      designHeight={designHeight}
      minimumScale={minimumScale}
    >
      <article className={styles.lmiChassis}>
        <header className={styles.lmiHeader}>
          <div>
            <span className={styles.lmiBrand}>{unitLabel}</span>
            <h1>{title}</h1>
          </div>
          <div className={styles.lmiIndicatorRail} aria-label="LMI status indicators">
            {indicators.map((indicator) => (
              <span
                key={indicator.id}
                className={`${styles.lmiIndicator} ${toneClasses[indicator.tone]}`}
                title={indicator.detail}
                aria-label={`${indicator.label}: ${indicator.detail ?? indicator.tone}`}
              >
                <span className={styles.lmiLamp} aria-hidden />
                {indicator.label}
              </span>
            ))}
          </div>
        </header>

        <section className={styles.lmiDisplay} aria-label={screenTitle ?? "LMI display"}>
          {screenTitle ? <h2 className={styles.lmiScreenTitle}>{screenTitle}</h2> : null}
          <div className={styles.lmiDisplayBody}>{children}</div>
        </section>

        {softKeys.length ? (
          <div className={styles.lmiSoftKeys} role="toolbar" aria-label="LMI soft keys">
            {softKeys.map((key) => (
              <button
                key={key.id}
                type="button"
                disabled={key.disabled}
                aria-pressed={key.pressed}
                onClick={() => onSoftKey?.(key.id)}
              >
                {key.label}
              </button>
            ))}
          </div>
        ) : null}

        {statusItems.length ? (
          <footer className={styles.lmiFooter} aria-label="LMI status">
            {statusItems.map((item) => (
              <span
                key={item.id}
                className={`${toneClasses[item.tone ?? "inactive"]} ${
                  item.grow ? styles.lmiFooterGrow : ""
                }`}
              >
                <small>{item.label}</small>
                {item.value !== undefined ? <strong>{item.value}</strong> : null}
              </span>
            ))}
          </footer>
        ) : null}
      </article>
    </MopiensDesktopViewport>
  );
}
