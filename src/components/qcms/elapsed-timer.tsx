"use client";

import { Clock } from "@phosphor-icons/react/dist/csr/Clock";
import { useEffect, useRef, useState } from "react";
import { formatElapsedTime } from "./qcms-utils";

export function ElapsedTimer() {
  const startedAt = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    startedAt.current = Date.now();
    const intervalId = window.setInterval(() => {
      if (startedAt.current === null) {
        return;
      }

      setElapsedSeconds(
        Math.floor((Date.now() - startedAt.current) / 1000),
      );
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <span
      className="inline-flex min-h-9 items-center gap-2 rounded border border-[var(--border-strong)] bg-white px-3 font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]"
      aria-label={`Thời gian đã làm bài: ${formatElapsedTime(elapsedSeconds)}`}
    >
      <Clock aria-hidden size={17} weight="regular" />
      {formatElapsedTime(elapsedSeconds)}
    </span>
  );
}

