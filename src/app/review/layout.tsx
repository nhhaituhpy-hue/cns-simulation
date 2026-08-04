import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";

export default async function ReviewLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return children;
}
