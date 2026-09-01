"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { changePasswordAction, type AuthActionResult } from "@/app/login/actions";

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await changePasswordAction({ password, confirmPassword });
      setResult(response);
      if (response.ok) {
        router.replace("/");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Mật khẩu mới
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required minLength={8} className="h-12 rounded-xl border border-white/15 bg-[#061720]/80 px-4 text-white outline-none focus:border-cyan-100/70 focus:ring-2 focus:ring-cyan-100/15" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Xác nhận mật khẩu mới
        <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required minLength={8} className="h-12 rounded-xl border border-white/15 bg-[#061720]/80 px-4 text-white outline-none focus:border-cyan-100/70 focus:ring-2 focus:ring-cyan-100/15" />
      </label>
      {result && !result.ok ? <p role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/8 px-3 py-2.5 text-sm text-amber-100">{result.message}</p> : null}
      <button type="submit" disabled={pending} className="h-12 rounded-xl bg-cyan-100 px-5 font-semibold text-[#06232d] hover:bg-white disabled:opacity-60">{pending ? "Đang cập nhật..." : "Đổi mật khẩu"}</button>
    </form>
  );
}
