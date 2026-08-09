import type { Metadata } from "next";
import { AuthPage, type AuthView } from "@/components/auth/auth-page";

export const metadata: Metadata = {
  title: "Đăng nhập",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string | string[]; view?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextValue = Array.isArray(params.next) ? params.next[0] : params.next;
  const safeNext = nextValue?.startsWith("/") && !nextValue.startsWith("//") ? nextValue : undefined;
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view;
  const initialView: AuthView = requestedView === "signup" || requestedView === "forgot-password"
    ? requestedView
    : "login";
  return <AuthPage nextPath={safeNext} initialView={initialView} />;
}
