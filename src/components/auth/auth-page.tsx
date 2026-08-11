"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { Buildings } from "@phosphor-icons/react/dist/csr/Buildings";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { EyeSlash } from "@phosphor-icons/react/dist/csr/EyeSlash";
import { IdentificationCard } from "@phosphor-icons/react/dist/csr/IdentificationCard";
import { LockKey } from "@phosphor-icons/react/dist/csr/LockKey";
import { SignIn } from "@phosphor-icons/react/dist/csr/SignIn";
import { User } from "@phosphor-icons/react/dist/csr/User";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import {
  checkSignupEmailAction,
  loginAction,
  requestPasswordResetAction,
  resendSignupOtpAction,
  signUpAction,
  updateRecoveredPasswordAction,
  verifyRecoveryOtpAction,
  verifySignupOtpAction,
  type AuthActionResult,
} from "@/app/login/actions";

export type AuthView =
  | "login"
  | "signup"
  | "verify-signup"
  | "forgot-password"
  | "verify-recovery"
  | "new-password";

const EMPTY_OTP = ["", "", "", "", "", ""];
type SignupEmailStatus = "idle" | "checking" | "registered";
const LOGIN_SUCCESS_MESSAGE = "Đăng nhập thành công...";
const AUTH_INPUT_CLASS = "h-12 w-full rounded-xl border border-white/15 bg-[#061720]/80 pl-11 font-normal text-white placeholder:text-slate-500 outline-none transition-[border-color,box-shadow,background-color] focus:border-cyan-100/70 focus:bg-[#081d27] focus:ring-2 focus:ring-cyan-100/15";
const AUTH_PRIMARY_BUTTON_CLASS = "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-100 px-5 text-[15px] font-semibold text-[#06232d] shadow-[0_0.8rem_2.5rem_rgba(79,209,225,0.12)] transition-[background-color,transform] hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

function LoginSuccessOverlay({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.5 }}
      className="fixed inset-0 z-50 grid place-items-center bg-[#03131c]/90 px-5 backdrop-blur-md"
    >
      <p className="text-center text-base font-bold tracking-tight text-white sm:text-lg">
        <span className="sr-only">{LOGIN_SUCCESS_MESSAGE}</span>
        <span aria-hidden className="inline-flex whitespace-nowrap">
          {Array.from(LOGIN_SUCCESS_MESSAGE).map((character, index) => (
            <motion.span
              key={`${character}-${index}`}
              className="inline-block"
              initial={{ y: 0 }}
              animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
              transition={{
                duration: 0.36,
                delay: index * 0.035,
                times: [0, 0.45, 1],
                ease: ["easeOut", "easeIn"],
              }}
            >
              {character === " " ? "\u00A0" : character}
            </motion.span>
          ))}
        </span>
      </p>
    </motion.div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "text-left"} aria-label="ATTECH, CNS Simulation Lab">
      <div className="flex items-center gap-3">
        <p className="text-[1.45rem] font-extrabold leading-none tracking-[-0.07em]">
          <span className="text-[#ff4354]">A</span><span className="text-[#10a5df]">TTECH</span>
        </p>
        <span aria-hidden className="h-5 w-px bg-white/20" />
        <p className="text-sm font-semibold tracking-tight text-white">CNS Simulation Lab</p>
      </div>
    </div>
  );
}

function FieldMessage({ result }: { result: AuthActionResult | null }) {
  if (!result) return null;
  return (
    <div
      role={result.ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm leading-5 ${result.ok
        ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]"
        : "border-[var(--color-danger-border)] bg-[var(--color-danger-muted)] text-[var(--color-danger)]"
        }`}
    >
      {result.ok ? (
        <CheckCircle aria-hidden className="mt-0.5 shrink-0" size={18} weight="fill" />
      ) : (
        <WarningCircle aria-hidden className="mt-0.5 shrink-0" size={18} weight="fill" />
      )}
      <span>{result.message}</span>
    </div>
  );
}

function OtpFields({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function updateDigit(index: number, rawValue: string) {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    const next = EMPTY_OTP.map((_, index) => digits[index] ?? "");
    onChange(next);
    refs.current[Math.min(digits.length, 6) - 1]?.focus();
  }

  return (
    <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Chữ số OTP ${index + 1}`}
          maxLength={1}
          disabled={disabled}
          className="h-12 min-w-0 rounded-xl border border-white/15 bg-[#061720]/80 text-center font-mono text-xl font-bold text-white outline-none transition-[border-color,box-shadow,background-color] focus:border-cyan-100/70 focus:bg-[#081d27] focus:ring-2 focus:ring-cyan-100/15 disabled:cursor-not-allowed disabled:opacity-60"
        />
      ))}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  compact = false,
  labelHidden = false,
  placeholder = "******",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  compact?: boolean;
  labelHidden?: boolean;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label
      htmlFor={id}
      className={`grid text-sm font-semibold text-slate-200 ${compact ? "gap-1.5" : "gap-2"}`}
    >
      {labelHidden ? <span className="sr-only">{label}</span> : label}
      <span className="relative block">
        <LockKey aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-100/60" />
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          className={`${AUTH_INPUT_CLASS} pr-12 text-base`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/70"
        >
          {visible ? <EyeSlash aria-hidden size={20} /> : <Eye aria-hidden size={20} />}
        </button>
      </span>
    </label>
  );
}

export function AuthPage({ nextPath, initialView = "login" }: { nextPath?: string; initialView?: AuthView }) {
  const router = useRouter();
  const flipControls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const flippingRef = useRef(false);
  const [view, setView] = useState<AuthView>(initialView);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workUnit, setWorkUnit] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState<string[]>([...EMPTY_OTP]);
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [pending, setPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [loginSucceeded, setLoginSucceeded] = useState(false);
  const [signupEmailStatus, setSignupEmailStatus] = useState<SignupEmailStatus>("idle");
  const signupEmailCheckRef = useRef(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function switchView(nextView: AuthView) {
    signupEmailCheckRef.current += 1;
    setView(nextView);
    setResult(null);
    setOtp([...EMPTY_OTP]);
    setSignupEmailStatus("idle");
  }

  async function flipAuthCard(nextView: "login" | "signup") {
    if (nextView === view || flippingRef.current) return;
    if (reduceMotion) {
      switchView(nextView);
      return;
    }

    const direction = nextView === "signup" ? -1 : 1;
    flippingRef.current = true;
    setFlipping(true);

    try {
      await flipControls.start({
        rotateY: direction * 90,
        opacity: 0.88,
        transition: { duration: 0.36, ease: [0.4, 0, 1, 1] },
      });
      switchView(nextView);
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      flipControls.set({ rotateY: direction * -90, opacity: 0.88 });
      await flipControls.start({
        rotateY: 0,
        opacity: 1,
        transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
      });
    } finally {
      flippingRef.current = false;
      setFlipping(false);
    }
  }

  async function run(action: () => Promise<AuthActionResult>) {
    setPending(true);
    setResult(null);
    try {
      return await action();
    } finally {
      setPending(false);
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await run(() => loginAction({ username, password }));
    if (!response.ok) {
      setResult(response);
      return;
    }

    setLoginSucceeded(true);
    const destination = nextPath ?? "/";
    router.prefetch(destination);
    // Xuất hiện mất 0.5s + Giữ nguyên hiển thị 1.5s = Chờ 2.0s rồi chuyển hướng thẳng sang trang mới
    await new Promise<void>((resolve) => window.setTimeout(resolve, 2000));
    router.replace(destination);
    router.refresh();
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await run(() => signUpAction({ fullName, email, password, workUnit }));
    if (response.code === "EMAIL_ALREADY_REGISTERED") {
      setSignupEmailStatus("registered");
      return;
    }
    setResult(response);
    if (response.ok) {
      setPassword("");
      setOtp([...EMPTY_OTP]);
      setResendCooldown(60);
      setView("verify-signup");
    }
  }

  function handleSignupEmailChange(value: string) {
    signupEmailCheckRef.current += 1;
    setEmail(value);
    setResult(null);
    setSignupEmailStatus("idle");
  }

  async function checkSignupEmail(emailValue: string) {
    const checkId = ++signupEmailCheckRef.current;
    setSignupEmailStatus("checking");

    try {
      const response = await checkSignupEmailAction(emailValue);
      if (checkId !== signupEmailCheckRef.current) return;

      setSignupEmailStatus(
        response.code === "EMAIL_ALREADY_REGISTERED" ? "registered" : "idle",
      );
      if (!response.ok && response.code === "SERVER_ERROR") {
        setResult(response);
      }
    } catch {
      if (checkId !== signupEmailCheckRef.current) return;
      setSignupEmailStatus("idle");
      setResult({
        ok: false,
        code: "SERVER_ERROR",
        message: "Không thể kiểm tra email. Vui lòng thử lại.",
      });
    }
  }

  async function submitSignupOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await run(() => verifySignupOtpAction({ email, token: otp.join("") }));
    setResult(response);
    if (response.ok) {
      router.replace(nextPath ?? "/student/vor");
      router.refresh();
    }
  }

  async function resendSignupOtp() {
    if (resendCooldown > 0) return;
    const response = await run(() => resendSignupOtpAction(email));
    setResult(response);
    if (response.ok) setResendCooldown(60);
  }

  async function submitForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await run(() => requestPasswordResetAction(email));
    setResult(response);
    if (response.ok) {
      setOtp([...EMPTY_OTP]);
      setResendCooldown(60);
      setView("verify-recovery");
    }
  }

  async function resendRecoveryOtp() {
    if (resendCooldown > 0) return;
    const response = await run(() => requestPasswordResetAction(email));
    setResult(response);
    if (response.ok) setResendCooldown(60);
  }

  async function submitRecoveryOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await run(() => verifyRecoveryOtpAction({ email, token: otp.join("") }));
    setResult(response);
    if (response.ok) {
      setOtp([...EMPTY_OTP]);
      setView("new-password");
    }
  }

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setResult({ ok: false, code: "INVALID_INPUT", message: "Mật khẩu xác nhận không khớp." });
      return;
    }
    const response = await run(() => updateRecoveredPasswordAction({ password: newPassword }));
    setResult(response);
    if (response.ok) {
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setView("login");
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
      {loginSucceeded ? <LoginSuccessOverlay reduceMotion={Boolean(reduceMotion)} /> : null}
      <div aria-hidden className="cns-landing__hero-overlay absolute inset-0" />
      <section
        className="relative z-10 hidden min-h-[100dvh] px-10 py-10 lg:flex xl:px-16"
      >
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
          <p className="text-sm font-medium text-cyan-50/65">Công ty TNHH Kỹ thuật Quản lý bay</p>
        </div>
      </section>

      <section
        className="relative z-10 min-h-[100dvh] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <div className="relative flex min-h-[100dvh] justify-center px-4 py-8 sm:px-8 lg:items-center lg:justify-start lg:pl-14 lg:pr-12 lg:py-12 xl:py-16">
          <div className="w-full max-w-[24rem]">
            <div className="mb-8 lg:hidden">
              <Brand compact />
              <p className="mt-4 max-w-[30ch] text-sm leading-6 text-cyan-50/75">
                Đánh giá năng lực qua tình huống thực tế.
              </p>
            </div>

            <div style={{ perspective: "1200px" }}>
              <motion.div
                animate={flipControls}
                initial={{ rotateY: 0, opacity: 1 }}
                style={{
                  backfaceVisibility: "hidden",
                  transformOrigin: "center center",
                  WebkitBackfaceVisibility: "hidden",
                }}
                className={`rounded-[1.5rem] border border-cyan-100/15 bg-[#061b25]/52 p-5 shadow-[0_1.25rem_4rem_rgba(0,0,0,0.22)] backdrop-blur-md sm:p-6 ${flipping ? "pointer-events-none will-change-transform" : ""}`}
              >
                {view === "login" ? (
                  <form onSubmit={submitLogin} className="grid gap-5">
                    <label htmlFor="login-username" className="block">
                      <span className="sr-only">Tên đăng nhập</span>
                      <span className="relative block">
                        <User aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-100/60" />
                        <input id="login-username" type="text" value={username} onChange={(event) => setUsername(event.target.value.replace(/@attech\.com\.vn$/i, ""))} autoComplete="username" placeholder="Tên đăng nhập" required className={`${AUTH_INPUT_CLASS} pr-[8.75rem] text-[15px]`} />
                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-normal text-slate-400">@attech.com.vn</span>
                      </span>
                    </label>
                    <PasswordField id="login-password" label="Mật khẩu" value={password} onChange={setPassword} autoComplete="current-password" labelHidden placeholder="Mật khẩu" />
                    <FieldMessage result={result} />
                    <button type="submit" disabled={pending} className={AUTH_PRIMARY_BUTTON_CLASS}>
                      <SignIn aria-hidden size={20} weight="bold" />
                      {pending ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                    <div className="grid justify-items-center gap-2 pt-1">
                      <button type="button" onClick={() => switchView("forgot-password")} className="!text-[12px] font-medium text-slate-300 transition-colors hover:text-cyan-100 focus-visible:outline-none focus-visible:underline">
                        Quên mật khẩu?
                      </button>
                      <button type="button" onClick={() => void flipAuthCard("signup")} disabled={flipping} className="!text-[12px] font-semibold text-cyan-100 transition-colors hover:text-white focus-visible:outline-none focus-visible:underline disabled:cursor-not-allowed disabled:opacity-60">
                        Đăng ký tài khoản mới
                      </button>
                    </div>
                  </form>
                ) : null}

                {view === "signup" ? (
                  <form onSubmit={submitSignup} className="grid gap-3">
                    <label htmlFor="signup-name" className="block">
                      <span className="sr-only">Họ và tên</span>
                      <span className="relative block"><IdentificationCard aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-100/60" /><input id="signup-name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder="Họ và tên" required className={`${AUTH_INPUT_CLASS} pr-4 text-[15px]`} /></span>
                    </label>
                    <label htmlFor="signup-email" className="block">
                      <span className="sr-only">Email</span>
                      <span className="relative block"><EnvelopeSimple aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-100/60" /><input id="signup-email" type="email" value={email} onChange={(event) => handleSignupEmailChange(event.target.value)} onBlur={(event) => { if (event.currentTarget.validity.valid) void checkSignupEmail(event.currentTarget.value); }} autoComplete="email" placeholder="Email" required className={`${AUTH_INPUT_CLASS} pr-4 text-[15px]`} /></span>
                    </label>
                    {signupEmailStatus === "checking" ? (
                      <p className="-mt-1 text-[12px] text-cyan-100/65">Đang kiểm tra email...</p>
                    ) : null}
                    {signupEmailStatus === "registered" ? (
                      <div role="alert" className="-mt-1 flex items-center justify-between gap-3 rounded-xl border border-amber-200/20 bg-amber-100/10 px-3 py-2 text-[12px] leading-5 text-amber-100">
                        <span>Email này đã được đăng ký.</span>
                        <button type="button" onClick={() => switchView("forgot-password")} className="shrink-0 font-semibold text-cyan-100 underline underline-offset-2 transition-colors hover:text-white">
                          Quên mật khẩu?
                        </button>
                      </div>
                    ) : null}
                    <PasswordField id="signup-password" label="Mật khẩu" value={password} onChange={setPassword} autoComplete="new-password" labelHidden placeholder="Mật khẩu" />
                    <label htmlFor="signup-unit" className="block">
                      <span className="sr-only">Đơn vị công tác</span>
                      <span className="relative block"><Buildings aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-100/60" /><input id="signup-unit" value={workUnit} onChange={(event) => setWorkUnit(event.target.value)} autoComplete="organization" placeholder="Đơn vị công tác" required className={`${AUTH_INPUT_CLASS} pr-4 text-[15px]`} /></span>
                    </label>
                    <FieldMessage result={result} />
                    <button type="submit" disabled={pending || signupEmailStatus !== "idle"} className={AUTH_PRIMARY_BUTTON_CLASS}>
                      <User aria-hidden size={20} weight="bold" />
                      {pending ? "Đang đăng ký..." : "Đăng ký tài khoản"}
                    </button>
                    <button type="button" onClick={() => void flipAuthCard("login")} disabled={flipping} className="justify-self-center !text-[12px] font-medium text-slate-300 transition-colors hover:text-cyan-100 focus-visible:outline-none focus-visible:underline disabled:cursor-not-allowed disabled:opacity-60">
                      Đã có tài khoản? Đăng nhập
                    </button>
                  </form>
                ) : null}

                {view === "verify-signup" || view === "verify-recovery" ? (
                  <form onSubmit={view === "verify-signup" ? submitSignupOtp : submitRecoveryOtp} className="grid gap-5">
                    <OtpFields value={otp} onChange={setOtp} disabled={pending} />
                    <FieldMessage result={result} />
                    <button type="submit" disabled={pending || otp.join("").length !== 6} className={AUTH_PRIMARY_BUTTON_CLASS}>
                      {pending ? "Đang xác thực..." : "Xác thực mã OTP"}
                    </button>
                    <button type="button" disabled={pending || resendCooldown > 0} onClick={view === "verify-signup" ? resendSignupOtp : resendRecoveryOtp} className="justify-self-center !text-[12px] font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:text-slate-500">
                      {resendCooldown > 0 ? `Gửi lại mã sau ${resendCooldown}s` : "Gửi lại mã OTP"}
                    </button>
                    <button type="button" onClick={() => switchView("login")} className="inline-flex items-center justify-center gap-2 !text-[12px] font-medium text-slate-300 transition-colors hover:text-white">
                      <ArrowLeft aria-hidden size={16} /> Quay lại đăng nhập
                    </button>
                  </form>
                ) : null}

                {view === "forgot-password" ? (
                  <form onSubmit={submitForgotPassword} className="grid gap-5">
                    <label htmlFor="recovery-email" className="block">
                      <span className="sr-only">Email đã đăng ký</span>
                      <span className="relative block"><EnvelopeSimple aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-100/60" /><input id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="Email" required className={`${AUTH_INPUT_CLASS} pr-4 text-[15px]`} /></span>
                    </label>
                    <FieldMessage result={result} />
                    <button type="submit" disabled={pending} className={AUTH_PRIMARY_BUTTON_CLASS}>
                      {pending ? "Đang gửi mã..." : "Gửi mã đặt lại mật khẩu"}
                    </button>
                    <button type="button" onClick={() => switchView("login")} className="inline-flex items-center justify-center gap-2 !text-[12px] font-medium text-slate-300 transition-colors hover:text-white"><ArrowLeft aria-hidden size={16} /> Quay lại đăng nhập</button>
                  </form>
                ) : null}

                {view === "new-password" ? (
                  <form onSubmit={submitNewPassword} className="grid gap-3">
                    <PasswordField id="new-password" label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} autoComplete="new-password" labelHidden placeholder="Mật khẩu mới" />
                    <PasswordField id="confirm-password" label="Xác nhận mật khẩu mới" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" labelHidden placeholder="Xác nhận mật khẩu mới" />
                    <FieldMessage result={result} />
                    <button type="submit" disabled={pending} className={AUTH_PRIMARY_BUTTON_CLASS}>
                      {pending ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                    </button>
                    <button type="button" onClick={() => switchView("login")} className="inline-flex items-center justify-center gap-2 !text-[12px] font-medium text-slate-300 transition-colors hover:text-white"><ArrowLeft aria-hidden size={16} /> Quay lại đăng nhập</button>
                  </form>
                ) : null}
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
