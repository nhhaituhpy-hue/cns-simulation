import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";

export default async function AuthoringLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/review");
  return children;
}
