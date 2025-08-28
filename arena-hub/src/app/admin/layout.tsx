// src/app/admin/layout.tsx
"use client";
import { useAuth } from "@/providers/AuthProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, ready } = useAuth();
  if (!ready || loading) return <div className="container mx-auto px-4 py-8">در حال بررسی دسترسی…</div>;
  if (!user) return <div className="container mx-auto px-4 py-8 card">برای دسترسی ابتدا وارد شوید. <a href="/auth" className="btn inline-block ml-2">ورود</a></div>;
  if (!profile?.is_admin) return <div className="container mx-auto px-4 py-8 card border-2 border-red-300">دسترسی فقط برای ادمین‌هاست.</div>;
  return <div className="container mx-auto px-4 py-6">{children}</div>;
}
