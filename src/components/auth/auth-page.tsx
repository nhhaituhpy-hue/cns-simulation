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

const AUTH_INPUT_CLASS = "h-12 w-full rounded-xl border border-white/15 bg-[#061720]/80 pl-11 font-normal text-white placeholder:text-slate-500 outline-none transition-[border-color,box-shadow,background-color] focus:border-cyan-100/70 focus:bg-[#081d27] focus:ring-2 focus:ring-cyan-100/15";
const AUTH_PRIMARY_BUTTON_CLASS = "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-100 px-5 text-[15px] font-semibold text-[#06232d] shadow-[0_0.8rem_2.5rem_rgba(79,209,225,0.12)] transition-[background-color,transform] hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061b25] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:active:scale-100";

function Brand() {
  return (
    <div className="text-left" aria-label="ATTECH, CNS Simulation Lab">
      <div className="flex items-center gap-3">
        <p className="text-[1.45rem] font-extrabold leading-none tracking-[-0.07em]">
          <span className="text-[#ff4354]">A</span>
          <span className="text-[#10a5df]">TTECH</span>
        </p>
        <span aria-hidden className="h-5 w-px bg-white/20" />
        <p className="text-sm font-semibold tracking-tight text-white">CNS Simulation Lab</p>
      </div>
    </div>
  );
}

function destination(result: AuthActionResult, nextPath?: string) {
  if (result.mustChangePassword) return "/change-password";
  if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) return nextPath;
  return "/";
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
    <main
      className="relative min-h-[100dvh] overflow-x-hidden bg-[#061b25] text-white lg:grid lg:grid-cols-[minmax(0,1.16fr)_minmax(25rem,0.84fr)]"
      style={{
        backgroundImage: "url('/images/cns-image.webp')",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div aria-hidden className="cns-landing__hero-overlay pointer-events-none absolute inset-0" />

      <section className="relative z-10 hidden min-h-[100dvh] px-10 py-10 lg:flex xl:px-16">
        <div className="flex min-h-full w-full flex-col justify-between">
          <Brand />
          <div className="my-auto max-w-xl pb-10 pt-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff5d68]">
              Trung tâm Bảo đảm kỹ thuật
            </p>
            <h1 className="mt-6 max-w-none whitespace-nowrap text-[clamp(2.35rem,3.55vw,4rem)] font-bold leading-[0.97] tracking-[-0.065em] text-white">
              Huấn luyện thực hành
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-cyan-50/85">
              Đánh giá năng lực qua tình huống thực tế.
            </p>
          </div>
          <p className="text-sm font-medium text-cyan-50/65">
            Công ty TNHH Kỹ thuật Quản lý bay
          </p>
        </div>
      </section>

      <section className="relative z-10 min-h-[100dvh] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-8 lg:justify-start lg:py-12 lg:pl-14 lg:pr-12 xl:py-16">
          <div className="w-full max-w-[24rem]">
            <div className="mb-8 lg:hidden">
              <Brand />
              <h1 className="sr-only">Đăng nhập CNS Simulation Lab</h1>
              <p className="mt-4 max-w-[30ch] text-sm leading-6 text-cyan-50/75">
                Đánh giá năng lực qua tình huống thực tế.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-cyan-100/15 bg-[#061b25]/52 p-5 shadow-[0_1.25rem_4rem_rgba(0,0,0,0.22)] backdrop-blur-md sm:p-6">
              <form onSubmit={submit} className="grid gap-5">
                <label htmlFor="username" className="block">
                  <span className="sr-only">Tên đăng nhập</span>
                  <span className="relative block">
                    <User aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-100/60" />
                    <input
                      id="username"
                      aria-label="Tên đăng nhập"
                      name="username"
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value.replace(/@attech\.com\.vn$/i, ""))}
                      autoComplete="username"
                      placeholder="Tên đăng nhập"
                      required
                      className={`${AUTH_INPUT_CLASS} pr-[8.75rem] text-base`}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-normal text-slate-400">
                      @attech.com.vn
                    </span>
                  </span>
                </label>

                <label htmlFor="password" className="block">
                  <span className="sr-only">Mật khẩu</span>
                  <span className="relative block">
                    <LockKey aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-100/60" />
                    <input
                      id="password"
                      aria-label="Mật khẩu"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="Mật khẩu"
                      required
                      className={`${AUTH_INPUT_CLASS} pr-12 text-base`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      aria-pressed={showPassword}
                      className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/70"
                    >
                      {showPassword ? <EyeSlash aria-hidden size={20} /> : <Eye aria-hidden size={20} />}
                    </button>
                  </span>
                </label>

                {result && !result.ok ? (
                  <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2.5 text-sm leading-5 text-amber-100">
                    <WarningCircle aria-hidden size={18} weight="fill" className="mt-0.5 shrink-0" />
                    {result.message}
                  </p>
                ) : null}

                <button type="submit" disabled={pending} className={AUTH_PRIMARY_BUTTON_CLASS}>
                  <SignIn aria-hidden size={20} weight="bold" />
                  {pending ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>

                <div className="grid justify-items-center gap-2 pt-1 text-center text-[12px] leading-5 text-slate-300">
                  <p>Quên mật khẩu? Liên hệ quản trị viên.</p>
                  <p className="font-semibold text-cyan-100">Tài khoản mới do quản trị viên cấp</p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
