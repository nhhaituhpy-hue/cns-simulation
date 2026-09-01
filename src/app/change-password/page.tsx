import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { getCurrentProfileForPasswordChange } from "@/lib/auth/profile";

export default async function ChangePasswordPage() {
  const profile = await getCurrentProfileForPasswordChange();
  if (!profile) redirect("/login");
  if (!profile.mustChangePassword) redirect(profile.role === "admin" ? "/admin" : "/student/exams");

  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-[#03131c] px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#071b25]/92 p-6 shadow-2xl sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-100/70">Bảo mật tài khoản</p>
        <h1 className="mt-3 text-2xl font-bold text-white">Đổi mật khẩu tạm</h1>
        <p className="mb-6 mt-2 text-sm leading-6 text-slate-400">Bạn phải đặt mật khẩu riêng trước khi sử dụng các chức năng khác.</p>
        <ChangePasswordForm role={profile.role} />
      </section>
    </main>
  );
}
