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
  loginAction,
  requestPasswordResetAction,
  resendSignupOtpAction,
  signUpAction,
  updateRecoveredPasswordAction,
  verifyRecoveryOtpAction,
  verifySignupOtpAction,
  type AuthActionResult,
} from "@/app/login/actions";

type AuthView =
  | "login"
  | "signup"
  | "verify-signup"
  | "forgot-password"
  | "verify-recovery"
  | "new-password";

const EMPTY_OTP = ["", "", "", "", "", ""];
const LOGIN_SUCCESS_MESSAGE = "Đăng nhập thành công...";

function LoginSuccessOverlay({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.5 }}
      className="fixed inset-0 z-50 grid place-items-center bg-white/75 px-5 backdrop-blur-md"
    >
      <p className="text-center text-base font-bold tracking-tight text-[var(--text-primary)] sm:text-lg">
        <span className="sr-only">{LOGIN_SUCCESS_MESSAGE}</span>
        <span aria-hidden className="inline-flex whitespace-nowrap">
          {Array.from(LOGIN_SUCCESS_MESSAGE).map((character, index) => (
            <motion.span
              key={`${character}-${index}`}
              className="inline-block"
              initial={false}
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

function Brand() {
  return (
    <div className="text-center" aria-label="ATTECH, Creative and Adaptive">
      <p className="text-[30px] font-semibold leading-none tracking-[0.14em] text-[var(--accent)]">
        <span className="text-[var(--danger)]">A</span>TTECH
      </p>
      <p className="mt-2 text-[10px] font-semibold tracking-[0.28em] text-[var(--text-muted)]">
        Creative &amp; Adaptive
      </p>
    </div>
  );
}

function FieldMessage({ result }: { result: AuthActionResult | null }) {
  if (!result) return null;
  return (
    <div
      role={result.ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm leading-5 ${
        result.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
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
          className="h-12 min-w-0 rounded-lg border border-[var(--border-strong)] bg-white text-center font-mono text-xl font-bold text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-60"
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  compact?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label
      htmlFor={id}
      className={`grid text-sm font-semibold text-[var(--text-secondary)] ${compact ? "gap-1.5" : "gap-2"}`}
    >
      {label}
      <span className="relative block">
        <LockKey aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder="******"
          required
          className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-white pl-11 pr-12 text-base font-normal text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {visible ? <EyeSlash aria-hidden size={20} /> : <Eye aria-hidden size={20} />}
        </button>
      </span>
    </label>
  );
}

export function AuthPage({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const flipControls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const flippingRef = useRef(false);
  const [view, setView] = useState<AuthView>("login");
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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function switchView(nextView: AuthView) {
    setView(nextView);
    setResult(null);
    setOtp([...EMPTY_OTP]);
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
    setResult(response);
    if (response.ok) {
      setPassword("");
      setOtp([...EMPTY_OTP]);
      setResendCooldown(60);
      setView("verify-signup");
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

  const showingTabs = view === "login" || view === "signup";
  const heading = view === "login"
    ? "Đăng nhập hệ thống"
    : view === "signup"
      ? "Đăng ký tài khoản"
      : view === "verify-signup"
        ? "Xác thực email"
        : view === "forgot-password"
          ? "Quên mật khẩu"
          : view === "verify-recovery"
            ? "Xác thực yêu cầu"
            : "Đặt mật khẩu mới";

  return (
    <main className="grid h-[100dvh] overflow-hidden bg-[var(--background)] lg:grid-cols-[minmax(20rem,35%)_minmax(0,1fr)]">
      {loginSucceeded ? <LoginSuccessOverlay reduceMotion={Boolean(reduceMotion)} /> : null}
      <section
        className="hidden h-[100dvh] border-r border-[var(--border)] bg-[#e8f3f8] bg-cover bg-center bg-no-repeat px-10 py-12 lg:flex lg:flex-col lg:justify-between xl:px-16"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgb(232 243 248 / 0.76), rgb(232 243 248 / 0.86)), url('/images/auth-cns-background.webp')",
        }}
      >
        <Brand />
        <div className="mx-auto w-full max-w-[32rem] -translate-y-[2cm] text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
            Trung tâm Bảo đảm kỹ thuật
          </p>
          <h1 className="mt-4 whitespace-nowrap text-[clamp(1.25rem,1.8vw,1.75rem)] font-bold leading-tight tracking-tight text-[var(--text-primary)]">
            THỰC HÀNH MÔ PHỎNG CNS
          </h1>
          <p className="mx-auto mt-5 max-w-[42ch] text-base leading-7 text-[var(--text-secondary)]">
            Môi trường đào tạo và đánh giá năng lực nhân viên khai thác hệ thống Thông tin - Dẫn đường - Giám sát.
          </p>
        </div>
        <p className="text-center text-xs leading-5 text-[var(--text-muted)]">
          Công ty TNHH Kỹ thuật Quản lý bay
        </p>
      </section>

      <section
        className="h-[100dvh] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] lg:overflow-hidden [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <div className="flex min-h-full justify-center px-4 py-8 sm:px-8 lg:px-12 lg:py-12 xl:py-16">
          <div className="w-full max-w-[27rem]">
          <div className="mb-9 lg:hidden">
            <Brand />
            <p className="mt-6 text-center text-sm font-bold tracking-[0.06em] text-[var(--text-primary)]">
              THỰC HÀNH MÔ PHỎNG CNS
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
                className={`rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-7 ${flipping ? "pointer-events-none will-change-transform" : ""}`}
              >
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{heading}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--text-secondary)]">
              {view === "login" && "Sử dụng tên đăng nhập và mật khẩu của bạn."}
              {view === "signup" && "Tài khoản mới được cấp quyền thí sinh mặc định."}
              {view === "verify-signup" && <>Nhập mã 6 số đã gửi đến <strong>{email}</strong>.</>}
              {view === "forgot-password" && "Nhập email đã đăng ký để nhận mã đặt lại mật khẩu."}
              {view === "verify-recovery" && <>Nhập mã 6 số đã gửi đến <strong>{email}</strong>.</>}
              {view === "new-password" && "Mật khẩu cần ít nhất 8 ký tự, có chữ và số."}
            </p>

            {showingTabs ? (
              <div className="mt-6 grid grid-cols-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1" role="tablist" aria-label="Chọn đăng nhập hoặc đăng ký">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "login"}
                  onClick={() => void flipAuthCard("login")}
                  disabled={flipping}
                  className={`h-10 rounded-lg text-sm font-semibold transition-colors ${view === "login" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "signup"}
                  onClick={() => void flipAuthCard("signup")}
                  disabled={flipping}
                  className={`h-10 rounded-lg text-sm font-semibold transition-colors ${view === "signup" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                >
                  Đăng ký
                </button>
              </div>
            ) : null}

            {view === "login" ? (
              <form onSubmit={submitLogin} className="mt-5 grid gap-5">
                <label htmlFor="login-username" className="grid gap-2 text-sm font-semibold text-[var(--text-secondary)]">
                  Tên đăng nhập
                  <span className="relative block">
                    <User aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input id="login-username" type="text" value={username} onChange={(event) => setUsername(event.target.value.replace(/@attech\.com\.vn$/i, ""))} autoComplete="username" placeholder="user" required className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-white pl-11 pr-[8.75rem] font-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20" />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-normal text-[var(--text-muted)]">@attech.com.vn</span>
                  </span>
                </label>
                <PasswordField id="login-password" label="Mật khẩu" value={password} onChange={setPassword} autoComplete="current-password" />
                <FieldMessage result={result} />
                <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white shadow-sm transition-[background-color,transform] hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                  <SignIn aria-hidden size={20} weight="bold" />
                  {pending ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>
                <button type="button" onClick={() => switchView("forgot-password")} className="justify-self-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:underline">
                  Quên mật khẩu?
                </button>
              </form>
            ) : null}

            {view === "signup" ? (
              <form onSubmit={submitSignup} className="mt-5 grid gap-3">
                <label htmlFor="signup-name" className="grid gap-1.5 text-sm font-semibold text-[var(--text-secondary)]">
                  Họ và tên
                  <span className="relative block"><IdentificationCard aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input id="signup-name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder="Nguyễn Văn A" required className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-white pl-11 pr-4 font-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20" /></span>
                </label>
                <label htmlFor="signup-email" className="grid gap-1.5 text-sm font-semibold text-[var(--text-secondary)]">
                  Email
                  <span className="relative block"><EnvelopeSimple aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input id="signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="user@attech.com.vn" required className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-white pl-11 pr-4 font-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20" /></span>
                </label>
                <PasswordField id="signup-password" label="Mật khẩu" value={password} onChange={setPassword} autoComplete="new-password" compact />
                <label htmlFor="signup-unit" className="grid gap-1.5 text-sm font-semibold text-[var(--text-secondary)]">
                  Đơn vị công tác
                  <span className="relative block"><Buildings aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input id="signup-unit" value={workUnit} onChange={(event) => setWorkUnit(event.target.value)} autoComplete="organization" placeholder="Đài DVOR/DME ..." required className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-white pl-11 pr-4 font-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20" /></span>
                </label>
                <FieldMessage result={result} />
                <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white shadow-sm transition-[background-color,transform] hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                  <User aria-hidden size={20} weight="bold" />
                  {pending ? "Đang đăng ký..." : "Đăng ký tài khoản"}
                </button>
              </form>
            ) : null}

            {view === "verify-signup" || view === "verify-recovery" ? (
              <form onSubmit={view === "verify-signup" ? submitSignupOtp : submitRecoveryOtp} className="mt-6 grid gap-5">
                <OtpFields value={otp} onChange={setOtp} disabled={pending} />
                <FieldMessage result={result} />
                <button type="submit" disabled={pending || otp.join("").length !== 6} className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white shadow-sm hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                  {pending ? "Đang xác thực..." : "Xác thực mã OTP"}
                </button>
                <button type="button" disabled={pending || resendCooldown > 0} onClick={view === "verify-signup" ? resendSignupOtp : resendRecoveryOtp} className="justify-self-center text-sm font-semibold text-[var(--accent)] disabled:cursor-not-allowed disabled:text-[var(--text-muted)]">
                  {resendCooldown > 0 ? `Gửi lại mã sau ${resendCooldown}s` : "Gửi lại mã OTP"}
                </button>
                <button type="button" onClick={() => switchView("login")} className="inline-flex items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <ArrowLeft aria-hidden size={16} /> Quay lại đăng nhập
                </button>
              </form>
            ) : null}

            {view === "forgot-password" ? (
              <form onSubmit={submitForgotPassword} className="mt-6 grid gap-5">
                <label htmlFor="recovery-email" className="grid gap-2 text-sm font-semibold text-[var(--text-secondary)]">
                  Email đã đăng ký
                  <span className="relative block"><EnvelopeSimple aria-hidden size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="user@attech.com.vn" required className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-white pl-11 pr-4 font-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20" /></span>
                </label>
                <FieldMessage result={result} />
                <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-60">
                  {pending ? "Đang gửi mã..." : "Gửi mã đặt lại mật khẩu"}
                </button>
                <button type="button" onClick={() => switchView("login")} className="inline-flex items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft aria-hidden size={16} /> Quay lại đăng nhập</button>
              </form>
            ) : null}

            {view === "new-password" ? (
              <form onSubmit={submitNewPassword} className="mt-6 grid gap-5">
                <PasswordField id="new-password" label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
                <PasswordField id="confirm-password" label="Xác nhận mật khẩu mới" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
                <FieldMessage result={result} />
                <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-60">
                  {pending ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                </button>
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
