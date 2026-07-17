"use client";

import { useState, type FormEvent } from "react";
import type { DmeScenario } from "@/lib/dme-types";

interface DmeStudentIdentityProps {
  scenario: DmeScenario;
  onStart: (studentName: string, studentCode: string) => void;
}

export function DmeStudentIdentity({ scenario, onStart }: DmeStudentIdentityProps) {
  const [studentName, setStudentName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentName.trim() || !studentCode.trim()) {
      setError("Vui lòng nhập đầy đủ họ tên và mã học viên.");
      return;
    }
    onStart(studentName.trim(), studentCode.trim());
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[var(--surface-muted)] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Mô phỏng DME PMDT</span>
        <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">{scenario.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{scenario.description}</p>
        <div className="mt-5 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#1d4ed8]">Yêu cầu tình huống</p>
          <p className="mt-2 text-sm leading-6 text-[#1e3a8a]">{scenario.prompt}</p>
        </div>

        <form onSubmit={submit} className="mt-7 grid gap-5">
          <label className="grid gap-2 text-sm font-semibold text-[var(--text-primary)]">
            Họ và tên học viên
            <input
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              autoComplete="name"
              className="h-11 rounded border border-[var(--border-strong)] px-3 font-normal outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[var(--text-primary)]">
            Mã học viên
            <input
              value={studentCode}
              onChange={(event) => setStudentCode(event.target.value)}
              autoComplete="off"
              className="h-11 rounded border border-[var(--border-strong)] px-3 font-mono font-normal outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </label>
          {error ? <p role="alert" className="text-sm font-medium text-[#b91c1c]">{error}</p> : null}
          <button type="submit" className="mt-1 inline-flex h-11 items-center justify-center rounded bg-[var(--accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2">
            Vào màn hình PMDT
          </button>
        </form>
      </div>
    </main>
  );
}

