"use server";

import { clearFailedLogins, getLoginLockStatus, recordFailedLogin, attemptsRemaining } from "@/lib/auth/login-lockout";
import { createClient } from "@/lib/supabase/server";

export type AuthActionCode =
  | "INVALID_INPUT"
  | "INVALID_CREDENTIALS"
  | "LOCKED"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "SUCCESS";

export interface AuthActionResult {
  ok: boolean;
  code: AuthActionCode;
  message: string;
  lockedUntil?: string;
  role?: "student" | "admin";
}

const ATTECH_EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@attech\.com\.vn$/i;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validEmail(email: string) {
  return ATTECH_EMAIL.test(email);
}

function validPassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function serverFailure(context: string, error: unknown): AuthActionResult {
  console.error(context, error);
  return {
    ok: false,
    code: "SERVER_ERROR",
    message: "Hệ thống xác thực đang bận. Vui lòng thử lại sau.",
  };
}

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const email = normalizeEmail(input.email);
  if (!validEmail(email) || !input.password) {
    return { ok: false, code: "INVALID_INPUT", message: "Vui lòng nhập email ATTECH và mật khẩu." };
  }

  try {
    const lockStatus = await getLoginLockStatus(email);
    if (lockStatus.isLocked) {
      return {
        ok: false,
        code: "LOCKED",
        message: "Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau 5 phút.",
        lockedUntil: lockStatus.lockedUntil ?? undefined,
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: input.password });
    if (error) {
      if (error.code === "email_not_confirmed") {
        return {
          ok: false,
          code: "INVALID_CREDENTIALS",
          message: "Email chưa được xác thực. Vui lòng hoàn tất bước nhập mã OTP đăng ký.",
        };
      }
      if (error.status === 429 || error.code === "over_request_rate_limit") {
        return {
          ok: false,
          code: "RATE_LIMITED",
          message: "Bạn gửi yêu cầu quá nhanh. Vui lòng chờ rồi thử lại.",
        };
      }
      if (error.code !== "invalid_credentials") {
        return serverFailure("Supabase password sign-in failed", error);
      }

      const nextStatus = await recordFailedLogin(email);
      if (nextStatus.isLocked) {
        return {
          ok: false,
          code: "LOCKED",
          message: "Bạn đã nhập sai 5 lần. Tài khoản tạm khóa trong 5 phút.",
          lockedUntil: nextStatus.lockedUntil ?? undefined,
        };
      }

      return {
        ok: false,
        code: "INVALID_CREDENTIALS",
        message: `Email hoặc mật khẩu không đúng. Còn ${attemptsRemaining(nextStatus)} lần thử.`,
      };
    }

    await clearFailedLogins(email);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .single();

    if (profileError || (profile?.role !== "student" && profile?.role !== "admin")) {
      await supabase.auth.signOut({ scope: "local" });
      return serverFailure("Authenticated user has no valid profile", profileError);
    }

    return {
      ok: true,
      code: "SUCCESS",
      message: "Đăng nhập thành công.",
      role: profile.role,
    };
  } catch (error) {
    return serverFailure("Login failed", error);
  }
}

export async function signUpAction(input: {
  fullName: string;
  email: string;
  password: string;
  workUnit: string;
}): Promise<AuthActionResult> {
  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim();
  const workUnit = input.workUnit.trim();

  if (!validEmail(email)) {
    return { ok: false, code: "INVALID_INPUT", message: "Chỉ email @attech.com.vn được phép đăng ký." };
  }
  if (fullName.length < 2 || workUnit.length < 2) {
    return { ok: false, code: "INVALID_INPUT", message: "Vui lòng nhập đầy đủ họ tên và đơn vị công tác." };
  }
  if (!validPassword(input.password)) {
    return { ok: false, code: "INVALID_INPUT", message: "Mật khẩu cần ít nhất 8 ký tự, có chữ và số." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          full_name: fullName,
          work_unit: workUnit,
        },
      },
    });

    if (error) {
      if (error.status === 429) {
        return { ok: false, code: "RATE_LIMITED", message: "Bạn gửi yêu cầu quá nhanh. Vui lòng chờ rồi thử lại." };
      }
      return { ok: false, code: "SERVER_ERROR", message: "Không thể đăng ký tài khoản. Vui lòng kiểm tra thông tin hoặc thử lại sau." };
    }

    return { ok: true, code: "SUCCESS", message: "Mã xác thực đã được gửi đến email." };
  } catch (error) {
    return serverFailure("Signup failed", error);
  }
}

export async function verifySignupOtpAction(input: {
  email: string;
  token: string;
}): Promise<AuthActionResult> {
  const email = normalizeEmail(input.email);
  const token = input.token.trim();
  if (!validEmail(email) || !/^\d{6}$/.test(token)) {
    return { ok: false, code: "INVALID_INPUT", message: "Mã OTP phải gồm đúng 6 chữ số." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
    if (error) {
      return { ok: false, code: "INVALID_INPUT", message: "Mã OTP không đúng hoặc đã hết hạn." };
    }
    return { ok: true, code: "SUCCESS", message: "Tài khoản đã được xác thực." };
  } catch (error) {
    return serverFailure("Signup OTP verification failed", error);
  }
}

export async function resendSignupOtpAction(emailValue: string): Promise<AuthActionResult> {
  const email = normalizeEmail(emailValue);
  if (!validEmail(email)) {
    return { ok: false, code: "INVALID_INPUT", message: "Email không hợp lệ." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      return { ok: false, code: error.status === 429 ? "RATE_LIMITED" : "SERVER_ERROR", message: "Chưa thể gửi lại mã. Vui lòng chờ rồi thử lại." };
    }
    return { ok: true, code: "SUCCESS", message: "Một mã OTP mới đã được gửi." };
  } catch (error) {
    return serverFailure("Resend signup OTP failed", error);
  }
}

export async function requestPasswordResetAction(emailValue: string): Promise<AuthActionResult> {
  const email = normalizeEmail(emailValue);
  if (!validEmail(email)) {
    return { ok: false, code: "INVALID_INPUT", message: "Vui lòng nhập email @attech.com.vn hợp lệ." };
  }

  const genericSuccess: AuthActionResult = {
    ok: true,
    code: "SUCCESS",
    message: "Nếu email đã đăng ký, mã đặt lại mật khẩu sẽ được gửi đến hộp thư.",
  };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error?.status === 429) {
      return { ok: false, code: "RATE_LIMITED", message: "Bạn gửi yêu cầu quá nhanh. Vui lòng chờ rồi thử lại." };
    }
    if (error) console.error("Password reset request failed", error);
    return genericSuccess;
  } catch (error) {
    console.error("Password reset request failed", error);
    return genericSuccess;
  }
}

export async function verifyRecoveryOtpAction(input: {
  email: string;
  token: string;
}): Promise<AuthActionResult> {
  const email = normalizeEmail(input.email);
  const token = input.token.trim();
  if (!validEmail(email) || !/^\d{6}$/.test(token)) {
    return { ok: false, code: "INVALID_INPUT", message: "Mã OTP phải gồm đúng 6 chữ số." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
    if (error) {
      return { ok: false, code: "INVALID_INPUT", message: "Mã OTP không đúng hoặc đã hết hạn." };
    }
    return { ok: true, code: "SUCCESS", message: "Mã OTP hợp lệ. Hãy đặt mật khẩu mới." };
  } catch (error) {
    return serverFailure("Recovery OTP verification failed", error);
  }
}

export async function updateRecoveredPasswordAction(input: {
  password: string;
}): Promise<AuthActionResult> {
  if (!validPassword(input.password)) {
    return { ok: false, code: "INVALID_INPUT", message: "Mật khẩu cần ít nhất 8 ký tự, có chữ và số." };
  }

  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (userError || !email) {
      return { ok: false, code: "INVALID_INPUT", message: "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu mã mới." };
    }

    const { error } = await supabase.auth.updateUser({ password: input.password });
    if (error) {
      return { ok: false, code: "INVALID_INPUT", message: "Không thể cập nhật mật khẩu. Vui lòng chọn mật khẩu khác." };
    }

    await clearFailedLogins(email);
    await supabase.auth.signOut({ scope: "global" });
    return { ok: true, code: "SUCCESS", message: "Mật khẩu đã được cập nhật. Bạn có thể đăng nhập lại." };
  } catch (error) {
    return serverFailure("Password update failed", error);
  }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
}
