// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "@/providers/AuthProvider";
import Navbar from "@/components/Navbar";
import ThemeLoader from "@/components/ThemeLoader";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "ArenaFA – Persian Gaming Hub",
  description: "Tournaments, leaderboards, weekly highlights — Persian gamers hub.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      {/* بدنه ستونی: فوتر پایین می‌ماند */}
      <body className="min-h-screen flex flex-col bg-[var(--c-bg)] text-[var(--c-fg)] antialiased">
        <AuthProvider>
          <ThemeLoader />
          <Navbar />
          {/* flex-1 = پرکردن ارتفاع باقیمانده */}
          <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
          <Footer />
        </AuthProvider>
        <noscript>برای استفاده کامل از سایت، JavaScript را فعال کنید.</noscript>
      </body>
    </html>
  );
}
