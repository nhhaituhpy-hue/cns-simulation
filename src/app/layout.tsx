import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentProfile } from "@/lib/auth/profile";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "THỰC HÀNH MÔ PHỎNG CNS",
    template: "%s | CNS Simulation",
  },
  description:
    "Công cụ xây dựng kịch bản và thực hành vận hành hệ thống CNS.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentProfile();

  return (
    <html
      lang="vi"
      data-theme="dark"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell currentUser={currentUser}>{children}</AppShell>
      </body>
    </html>
  );
}
