import type { Metadata } from "next";
import Script from "next/script";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentProfile } from "@/lib/auth/profile";
import { APP_THEME_STORAGE_KEY, DEFAULT_APP_THEME } from "@/lib/theme";
import "./globals.css";

const themeInitializationScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(APP_THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

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
      data-theme={DEFAULT_APP_THEME}
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell currentUser={currentUser}>{children}</AppShell>
        <Script
          id="cns-theme-initialization"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitializationScript }}
        />
      </body>
    </html>
  );
}
