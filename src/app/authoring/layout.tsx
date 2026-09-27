import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";

export default async function AuthoringLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  // Teacher authoring remains hidden until resource-scope and DB rehearsal
  // gates are approved; the API has its own rollout flag as a second guard.
  if (profile.role !== "admin") redirect("/review");
  return children;
}
