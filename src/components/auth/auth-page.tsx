"use client";

import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { EyeSlash } from "@phosphor-icons/react/dist/csr/EyeSlash";
import { LockKey } from "@phosphor-icons/react/dist/csr/LockKey";
import { SignIn } from "@phosphor-icons/react/dist/csr/SignIn";
import { User } from "@phosphor-icons/react/dist/csr/User";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { loginAction, type AuthActionResult } from "@/app/login/actions";

export type AuthView = "login";

const INPUT_CLASS = "h-12 w-full rounded-xl border border-white/15 bg-[#061720]/80 pl-11 pr-11 text-[15px] text-white placeholder:text-slate-500 outline-none transition-[border-color,box-shadow,background-color] focus:border-cyan-100/70 focus:bg-[#081d27] focus:ring-2 focus:ring-cyan-100/15";

function destination(result: AuthActionResult, nextPath?: string) {
  if (result.mustChangePassword) return "/change-password";
  if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) return nextPath;
  return result.role === "admin" ? "/admin" : "/student/exams";
}

export function AuthPage({ nextPath }: { nextPath?: string; initialView?: AuthView }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const response = await loginAction({ username, password });
      setResult(response);
      if (response.ok) {
        router.replace(destination(response, nextPath));
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative grid min-h-[calc(100vh-4rem)] place-items-center overflow-hidden bg-[#03131c] px-5 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_80%_75%,rgba(14,116,144,0.14),transparent_38%)]" />
      <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#071b25]/92 p-6 shadow-[0_2rem_7rem_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-8">
        <div className="mb-7">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/70">CNS Training Simulator</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Đăng nhập hệ thống</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Sử dụng tên đăng nhập nội bộ được quản trị viên cấp.</p>
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-200" htmlFor="username">
            Tên đăng nhập
            <span className="relative block">
              <User aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-100/60" />
              <input id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required className={INPUT_CLASS} placeholder="nguyenvana" />
            </span>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-200" htmlFor="password">
            Mật khẩu
            <span className="relative block">
              <LockKey aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-100/60" />
              <input id="password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required className={INPUT_CLASS} placeholder="Nhập mật khẩu" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white">
                {showPassword ? <EyeSlash aria-hidden size={19} /> : <Eye aria-hidden size={19} />}
              </button>
            </span>
          </label>

          {result && !result.ok ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/8 px-3 py-2.5 text-sm leading-5 text-amber-100">
              <WarningCircle aria-hidden size={18} className="mt-0.5 shrink-0" />
              {result.message}
            </p>
          ) : null}

          <button type="submit" disabled={pending} className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-100 px-5 text-[15px] font-semibold text-[#06232d] shadow-[0_0.8rem_2.5rem_rgba(79,209,225,0.12)] transition-[background-color,transform] hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
            <SignIn aria-hidden size={20} weight="bold" />
            {pending ? "Đang xác thực..." : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-6 border-t border-white/10 pt-5 text-center text-xs leading-5 text-slate-500">Đăng ký, OTP và khôi phục mật khẩu qua email đã được tắt trong phiên bản Oracle VM.</p>
      </section>
    </main>
  );
}
