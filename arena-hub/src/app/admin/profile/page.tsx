"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";

export default function AdminProfilePage() {
  const { ready, user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.replace("/auth"); return; }
    if (!user.is_admin) { router.replace("/profile"); }
  }, [ready, user, router]);

  if (!ready) return <div className="container-page py-8">Loading…</div>;
  if (!user || !user.is_admin) return null;

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">پروفایل ادمین</h1>
        <button className="btn-secondary" onClick={signOut}>خروج</button>
      </div>

      <div className="card">
        <ul className="grid md:grid-cols-2 gap-3">
          <li><span className="opacity-70 text-sm">ایمیل</span><div className="mt-1">{user.email}</div></li>
          <li><span className="opacity-70 text-sm">نام کاربری</span><div className="mt-1">{user.username ?? "—"}</div></li>
          <li><span className="opacity-70 text-sm">نقش</span><div className="mt-1">{user.role ?? "—"}</div></li>
          <li><span className="opacity-70 text-sm">ادمین؟</span><div className="mt-1">{user.is_admin ? "بله" : "خیر"}</div></li>
        </ul>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <a href="/admin/games" className="card hover:bg-white/5">مدیریت بازی‌ها</a>
        <a href="/admin/tournaments" className="card hover:bg-white/5">مدیریت تورنمنت‌ها</a>
        <a href="/admin/settings" className="card hover:bg-white/5">تنظیمات سایت</a>
      </div>
    </div>
  );
}
