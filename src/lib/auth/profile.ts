import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { queryDatabase } from "@/lib/db";
import { hashSessionToken, sessionCookieName } from "./session";

export type AppRole = "student" | "admin";

export interface AuthProfile {
  id: string;
  email: string;
  fullName: string;
  workUnit: string;
  role: AppRole;
  mustChangePassword: boolean;
}

const loadCurrentProfile = cache(async (): Promise<AuthProfile | null> => {
  if (process.env.MEDIA_CAPTURE_MODE === "1") {
    const cookieStore = await cookies();
    const role = cookieStore.get("media-capture-role")?.value === "student" ? "student" : "admin";
    return {
      id: `media-capture-${role}`,
      email: role === "admin" ? "giamkhao@attech.com.vn" : "thisinh@attech.com.vn",
      fullName: role === "admin" ? "Giám khảo CNS" : "Nguyễn Văn An",
      workUnit: role === "admin" ? "Hội đồng kiểm tra" : "Đài DVOR/DME Đà Nẵng",
      role,
      mustChangePassword: false,
    };
  }

  const token = (await cookies()).get(sessionCookieName())?.value;
  if (!token) {
    return null;
  }

  const result = await queryDatabase<{
    id: string;
    email: string;
    full_name: string;
    work_unit: string;
    role: AppRole;
    must_change_password: boolean;
  }>(
    `select u.id, u.email, u.full_name, u.work_unit, u.role, u.must_change_password
     from public.user_sessions s
     join public.users u on u.id = s.user_id
     where s.token_hash = $1
       and s.revoked_at is null
       and s.expires_at > now()
       and u.is_active
     limit 1`,
    [hashSessionToken(token)],
  );
  const data = result.rows[0];
  if (!data || (data.role !== "student" && data.role !== "admin")) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    workUnit: data.work_unit,
    role: data.role,
    mustChangePassword: data.must_change_password,
  };
});

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const profile = await loadCurrentProfile();
  return profile?.mustChangePassword ? null : profile;
}

export async function getCurrentProfileForPasswordChange(): Promise<AuthProfile | null> {
  return loadCurrentProfile();
}

export async function getCurrentUserId(): Promise<string | null> {
  return (await getCurrentProfile())?.id ?? null;
}
