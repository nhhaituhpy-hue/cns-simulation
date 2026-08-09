"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { MopiensDesktopViewportProps } from "./types";
import styles from "./mopiens-pmdt.module.css";

const DEFAULT_DESIGN_WIDTH = 1024;
const DEFAULT_DESIGN_HEIGHT = 768;
const DEFAULT_MINIMUM_SCALE = 0.72;

function clampScale(value: number, minimum: number): number {
  return Math.min(1, Math.max(minimum, value));
}

export function MopiensDesktopViewport({
  "aria-label": ariaLabel,
  children,
  designWidth = DEFAULT_DESIGN_WIDTH,
  designHeight = DEFAULT_DESIGN_HEIGHT,
  minimumScale = DEFAULT_MINIMUM_SCALE,
  className,
  style,
}: MopiensDesktopViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(designHeight);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas || typeof ResizeObserver === "undefined") return;

    const updateGeometry = () => {
      const availableWidth = Math.max(0, host.clientWidth - 16);
      setScale(clampScale(availableWidth / designWidth, minimumScale));
      setContentHeight(Math.max(designHeight, canvas.scrollHeight));
    };

    updateGeometry();
    const observer = new ResizeObserver(updateGeometry);
    observer.observe(host);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [designHeight, designWidth, minimumScale]);

  const viewportStyle = {
    ...style,
    "--mopiens-design-width": `${designWidth}px`,
    "--mopiens-design-height": `${designHeight}px`,
    "--mopiens-scale": scale,
    "--mopiens-scaled-width": `${designWidth * scale}px`,
    "--mopiens-scaled-height": `${contentHeight * scale}px`,
  } as CSSProperties;

  return (
    <div
      ref={hostRef}
      aria-label={ariaLabel}
      className={[styles.desktopViewport, className].filter(Boolean).join(" ")}
      style={viewportStyle}
    >
      <div className={styles.desktopSizer}>
        <div ref={canvasRef} className={styles.desktopCanvas}>
          {children}
        </div>
      </div>
    </div>
  );
}
