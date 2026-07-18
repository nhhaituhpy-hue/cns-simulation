"use server";

import { getCurrentProfile, type AppRole } from "@/lib/auth/profile";

export async function hasRequiredRoleAction(requiredRole: AppRole): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === requiredRole;
}
