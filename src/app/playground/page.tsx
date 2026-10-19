import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { getCurrentProfile } from "@/lib/auth/profile";
import { PlaygroundShell } from "@/components/playground/playground-shell";

function walk(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full, base));
    } else if (/\.(tsx|ts)$/.test(name)) {
      out.push(full.slice(base.length + 1).replace(/\\/g, "/"));
    }
  }
  return out.sort();
}

export default async function PlaygroundPage() {
  const isProd = process.env.NODE_ENV === "production";
  const enabledByEnv = process.env.PLAYGROUND_ENABLED === "true";
  const profile = isProd ? await getCurrentProfile() : null;
  const isAdmin = profile?.role === "admin";
  if (isProd && !enabledByEnv && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#061b25] text-white">
        <p className="text-sm text-slate-300">
          Playground chỉ khả dụng cho tài khoản admin (hoặc đặt PLAYGROUND_ENABLED=true).
        </p>
      </div>
    );
  }
  const base = join(process.cwd(), "src", "components");
  const files = walk(base, base);
  return <PlaygroundShell files={files} />;
}