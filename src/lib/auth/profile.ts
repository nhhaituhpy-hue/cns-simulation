import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "student" | "admin";

export interface AuthProfile {
  id: string;
  email: string;
  fullName: string;
  workUnit: string;
  role: AppRole;
}

export const getCurrentProfile = cache(async (): Promise<AuthProfile | null> => {
  if (process.env.MEDIA_CAPTURE_MODE === "1") {
    const cookieStore = await cookies();
    const role = cookieStore.get("media-capture-role")?.value === "student" ? "student" : "admin";
    return {
      id: `media-capture-${role}`,
      email: role === "admin" ? "giamkhao@attech.com.vn" : "thisinh@attech.com.vn",
      fullName: role === "admin" ? "Giám khảo CNS" : "Nguyễn Văn An",
      workUnit: role === "admin" ? "Hội đồng kiểm tra" : "Đài DVOR/DME Đà Nẵng",
      role,
    };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string" || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,work_unit,role")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  if (data.role !== "student" && data.role !== "admin") {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    workUnit: data.work_unit,
    role: data.role,
  };
});

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;
  return error || typeof subject !== "string" ? null : subject;
}
