"use client";

import { ArrowBendDownRight } from "@phosphor-icons/react/dist/csr/ArrowBendDownRight";
import { Pause } from "@phosphor-icons/react/dist/csr/Pause";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { Stop } from "@phosphor-icons/react/dist/csr/Stop";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useEffect, useState } from "react";

type ReplayDialogProps = {
  onClose: () => void;
};

type ReplayMode = "online" | "replay";
type ReplayStatus = "playing" | "paused" | "stopped";
const SPEEDS = ["0.1", "0.5", "1.0", "2.0", "5.0", "10.0", "20.0"];

function currentDateTime() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 19) };
}

const STATUS_DETAILS: Record<
  ReplayStatus,
  { label: string; color: string }
> = {
  playing: { label: "Replay playing", color: "bg-green-500" },
  paused: { label: "Replay paused", color: "bg-orange-500" },
  stopped: { label: "Replay stopped", color: "bg-yellow-400" },
};

export function ReplayDialog({ onClose }: ReplayDialogProps) {
  const initial = currentDateTime();
  const [mode, setMode] = useState<ReplayMode>("online");
  const [status, setStatus] = useState<ReplayStatus>("stopped");
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [speed, setSpeed] = useState("1.0");
  const replayEnabled = mode === "replay";
  const statusDetails =
    mode === "online"
      ? { label: "Online mode", color: "bg-gray-400" }
      : STATUS_DETAILS[status];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function selectMode(nextMode: ReplayMode) {
    setMode(nextMode);
    setStatus("stopped");
  }

  function jumpToNow() {
    const now = currentDateTime();
    setDate(now.date);
    setTime(now.time);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#172033]/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="replay-dialog-title"
        className="w-full max-w-2xl overflow-hidden rounded-lg border border-[#40566b] bg-[#edf2f5] shadow-[0_20px_60px_rgb(15_23_42/0.35)]"
      >
        <header className="flex items-center justify-between gap-4 border-b border-[#172033] bg-[#263746] px-4 py-3 text-white">
          <div>
            <h2 id="replay-dialog-title" className="text-lg font-bold">
              Replay Control
            </h2>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-[#cbd5e1]">
              Mode:
              <span className={"size-2.5 rounded-full " + statusDetails.color} />
              {mode.toUpperCase()}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Replay Control" className="inline-flex size-10 items-center justify-center rounded hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X aria-hidden size={19} />
          </button>
        </header>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Replay mode">
            {(["online", "replay"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={mode === item}
                onClick={() => selectMode(item)}
                className={"min-h-11 rounded border text-sm font-bold " + (mode === item ? "border-[#2563eb] bg-[#e8f2fb] text-[#17324a]" : "border-[#94a3b8] bg-white text-[#475569]")}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <fieldset disabled={!replayEnabled} className="rounded border border-[#b8c4ce] bg-white p-4 disabled:opacity-50">
            <legend className="px-2 text-xs font-bold uppercase tracking-wide text-[#475569]">
              Replay source
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-[#475569]">
                Date
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block min-h-10 w-full rounded border border-[#94a3b8] px-2 font-mono text-sm text-[#172033]" />
              </label>
              <label className="text-xs font-semibold text-[#475569]">
                Time
                <input type="time" step="1" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1 block min-h-10 w-full rounded border border-[#94a3b8] px-2 font-mono text-sm text-[#172033]" />
              </label>
              <label className="text-xs font-semibold text-[#475569]">
                Speed
                <select value={speed} onChange={(event) => setSpeed(event.target.value)} className="mt-1 block min-h-10 w-full rounded border border-[#94a3b8] bg-white px-2 font-mono text-sm text-[#172033]">
                  {SPEEDS.map((value) => (
                    <option key={value} value={value}>{value}x</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Replay transport">
              <button type="button" onClick={() => setStatus("playing")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded bg-[#2563eb] px-3 text-xs font-bold text-white">
                <Play aria-hidden size={16} /> PLAY
              </button>
              <button type="button" onClick={() => setStatus("paused")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded border border-[#94a3b8] bg-white px-3 text-xs font-bold text-[#334155]">
                <Pause aria-hidden size={16} /> PAUSE
              </button>
              <button type="button" onClick={() => setStatus("stopped")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded border border-[#94a3b8] bg-white px-3 text-xs font-bold text-[#334155]">
                <Stop aria-hidden size={16} /> STOP
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setStatus("paused")} className="min-h-9 rounded border border-[#94a3b8] bg-white text-xs font-bold text-[#334155]">
                <ArrowBendDownRight aria-hidden className="mr-1 inline" size={14} /> JUMP
              </button>
              <button type="button" onClick={jumpToNow} className="min-h-9 rounded border border-[#94a3b8] bg-white text-xs font-bold text-[#334155]">
                NOW
              </button>
            </div>
          </fieldset>

          <div className="flex items-center gap-2 rounded border border-[#b8c4ce] bg-white p-3 text-sm font-semibold text-[#334155]" role="status">
            <span className={"size-3 rounded-full " + statusDetails.color} />
            Status: {statusDetails.label}
          </div>

          <footer className="flex justify-end border-t border-[#b8c4ce] pt-4">
            <button type="button" onClick={onClose} className="min-h-10 rounded bg-[#2563eb] px-5 text-sm font-bold text-white hover:bg-[#1d4ed8]">
              CLOSE
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}
