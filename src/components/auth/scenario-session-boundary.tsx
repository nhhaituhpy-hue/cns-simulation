"use client";

import { useEffect, type ReactNode } from "react";
import type { AuthProfile } from "@/lib/auth/profile";
import { useScenarioStore, type ScenarioAccessScope } from "@/stores/scenario-store";

export function ScenarioSessionBoundary({ children, currentUser }: {
  children: ReactNode;
  currentUser: AuthProfile | null;
}) {
  const identity = currentUser?.id ?? null;
  const scope: ScenarioAccessScope | null = !currentUser ? null
    : currentUser.role === "admin" ? "source"
    : currentUser.role === "teacher" ? "scoped-source" : "practice";
  const matches = useScenarioStore(state =>
    state.sessionIdentity === identity && state.sessionScope === scope);
  const bindSession = useScenarioStore(state => state.bindSession);

  useEffect(() => {
    bindSession(identity, scope);
  }, [bindSession, identity, scope]);

  // Do not mount consumers against the previous identity, even for one render.
  // A logout reset also closes this gate while the old server props are pending.
  if (matches) return children;
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--background)] p-6 text-[var(--foreground)]">
      <div className="grid gap-3 text-center">
        <p role="status">Đang xác minh phiên đăng nhập. Nếu trang không tự chuyển, hãy tải lại trang đăng nhập.</p>
        {/* Deliberately a document navigation: obtain fresh server auth state,
            never re-bind stale profile props or restore the private cache. */}
        <a href="/login" className="font-medium underline underline-offset-4">Tải lại trang đăng nhập</a>
      </div>
    </main>
  );
}
