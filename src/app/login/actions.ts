"use server";

import { redirect, RedirectType } from "next/navigation";
import { getCurrentProfileForPasswordChange } from "@/lib/auth/profile";
import {
  attemptsRemaining,
  recordFailedLogin,
  statusFromUser,
} from "@/lib/auth/login-lockout";
import {
  consumePasswordVerificationTime,
  hashPassword,
  validPassword,
  verifyPassword,
} from "@/lib/auth/password";
import {
  createUserSession,
  replaceSessionsAfterPasswordChange,
  revokeCurrentSession,
} from "@/lib/auth/session";
import { queryDatabase, withDatabaseTransaction } from "@/lib/db";

export type AuthActionCode =
  | "INVALID_INPUT"
  | "INVALID_CREDENTIALS"
  | "LOCKED"
  | "SERVER_ERROR"
  | "SUCCESS";

export interface AuthActionResult {
  ok: boolean;
  code: AuthActionCode;
  message: string;
  lockedUntil?: string;
  role?: "student" | "admin";
  mustChangePassword?: boolean;
}

type LoginUser = {
  id: string;
  password_hash: string;
  role: "student" | "admin";
  is_active: boolean;
  must_change_password: boolean;
  temporary_password_expires_at: Date | string | null;
  failed_login_count: number;
  locked_until: Date | string | null;
};

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/@attech\.com\.vn$/, "");
}

function serverFailure(context: string, error: unknown): AuthActionResult {
  console.error(context, error);
  return {
    ok: false,
    code: "SERVER_ERROR",
    message: "Hệ thống xác thực đang bận. Vui lòng thử lại sau.",
  };
}

export async function loginAction(input: { username: string; password: string }): Promise<AuthActionResult> {
  const username = normalizeUsername(input.username);
  if (!/^[a-z0-9._-]{2,100}$/.test(username) || !input.password) {
    return { ok: false, code: "INVALID_INPUT", message: "Vui lòng nhập tên đăng nhập và mật khẩu." };
  }

  try {
    const result = await withDatabaseTransaction(async (client) => {
      const userResult = await client.query<LoginUser>(
        `select id, password_hash, role, is_active, must_change_password,
                temporary_password_expires_at, failed_login_count, locked_until
         from public.users
         where username = $1
         for update`,
        [username],
      );
      const user = userResult.rows[0];
      if (!user || !user.is_active) {
        await consumePasswordVerificationTime(input.password);
        return { kind: "invalid" } as const;
      }

      const lockStatus = statusFromUser(user);
      if (lockStatus.isLocked) {
        return { kind: "locked", status: lockStatus } as const;
      }

      const passwordMatches = await verifyPassword(input.password, user.password_hash);
      if (!passwordMatches) {
        const status = await recordFailedLogin(client, user.id);
        return { kind: status.isLocked ? "locked" : "invalid", status } as const;
      }

      if (
        user.must_change_password &&
        user.temporary_password_expires_at &&
        new Date(user.temporary_password_expires_at).getTime() <= Date.now()
      ) {
        return { kind: "expired" } as const;
      }

      await client.query(
        `update public.users
         set failed_login_count = 0, locked_until = null, last_login_at = now()
         where id = $1`,
        [user.id],
      );
      return { kind: "success", user } as const;
    });

    if (result.kind === "locked") {
      return {
        ok: false,
        code: "LOCKED",
        message: "Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau 5 phút.",
        lockedUntil: result.status.lockedUntil ?? undefined,
      };
    }
    if (result.kind === "expired") {
      return {
        ok: false,
        code: "INVALID_CREDENTIALS",
        message: "Mật khẩu tạm đã hết hạn. Vui lòng liên hệ quản trị viên.",
      };
    }
    if (result.kind === "invalid") {
      const status = "status" in result ? result.status : undefined;
      return {
        ok: false,
        code: "INVALID_CREDENTIALS",
        message: status
          ? `Tên đăng nhập hoặc mật khẩu không đúng. Còn ${attemptsRemaining(status)} lần thử.`
          : "Tên đăng nhập hoặc mật khẩu không đúng.",
      };
    }
    if (result.kind !== "success") {
      throw new Error("Unexpected login result.");
    }

    await createUserSession(result.user.id);
    return {
      ok: true,
      code: "SUCCESS",
      message: "Đăng nhập thành công.",
      role: result.user.role,
      mustChangePassword: result.user.must_change_password,
    };
  } catch (error) {
    return serverFailure("Login failed", error);
  }
}

export async function changePasswordAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  if (input.password !== input.confirmPassword) {
    return { ok: false, code: "INVALID_INPUT", message: "Mật khẩu xác nhận không khớp." };
  }
  if (!validPassword(input.password)) {
    return { ok: false, code: "INVALID_INPUT", message: "Mật khẩu cần ít nhất 8 ký tự, có chữ và số." };
  }

  try {
    const profile = await getCurrentProfileForPasswordChange();
    if (!profile || !profile.mustChangePassword) {
      return { ok: false, code: "INVALID_CREDENTIALS", message: "Phiên đăng nhập đã hết hạn." };
    }
    const current = await queryDatabase<{ password_hash: string }>(
      "select password_hash from public.users where id = $1 and is_active",
      [profile.id],
    );
    if (!current.rows[0]) {
      return { ok: false, code: "INVALID_CREDENTIALS", message: "Tài khoản không còn hoạt động." };
    }
    if (await verifyPassword(input.password, current.rows[0].password_hash)) {
      return { ok: false, code: "INVALID_INPUT", message: "Mật khẩu mới phải khác mật khẩu hiện tại." };
    }

    const passwordHash = await hashPassword(input.password);
    await replaceSessionsAfterPasswordChange(profile.id, passwordHash);
    await createUserSession(profile.id);
    return { ok: true, code: "SUCCESS", message: "Mật khẩu đã được thay đổi.", role: profile.role };
  } catch (error) {
    return serverFailure("Password change failed", error);
  }
}

export async function logoutAction(): Promise<void> {
  await revokeCurrentSession();
  redirect("/login", RedirectType.replace);
}
