"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";

// Lazy load برای همه ماژول‌های موجود
const ModDashboard     = dynamic(() => import("./_admin/ModDashboard"), { ssr: false });
const ModGames         = dynamic(() => import("@/app/admin/games/page"), { ssr: false });
const ModTournaments   = dynamic(() => import("@/app/admin/tournaments/page"), { ssr: false });
const ModClans         = dynamic(() => import("@/app/admin/clans/page"), { ssr: false });
const ModHighlights    = dynamic(() => import("@/app/admin/highlights/page"), { ssr: false });
const ModSettings      = dynamic(() => import("@/app/admin/settings/page"), { ssr: false });

// ماژول‌های افزوده‌ی سبک
const ModUsers         = dynamic(() => import("./_admin/ModUsers"), { ssr: false });
const ModReports       = dynamic(() => import("./_admin/ModReports"), { ssr: false });

type Key =
  | "dashboard"
  | "games"
  | "tournaments"
  | "clans"
  | "highlights"
  | "users"
  | "reports"
  | "settings";

type Module = {
  key: Key;
  label: string;
  component: React.ReactNode;
};

export default function AdminShell() {
  const { profile } = useAuth();
  const [active, setActive] = useState<Key>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // فهرست ماژول‌ها (قابل توسعه در آینده با یک خط)
  const modules: Module[] = useMemo(
    () => [
      { key: "dashboard",   label: "داشبورد",      component: <ModDashboard /> },
      { key: "games",       label: "بازی‌ها",       component: <ModGames /> },
      { key: "tournaments", label: "تورنمنت‌ها",    component: <ModTournaments /> },
      { key: "clans",       label: "کلن‌ها",        component: <ModClans /> },
      { key: "highlights",  label: "هایلایت‌ها",    component: <ModHighlights /> },
      { key: "users",       label: "کاربران",       component: <ModUsers /> },       // خواندنی/ایندکس
      { key: "reports",     label: "گزارش‌ها",      component: <ModReports /> },     // آمار سریع
      { key: "settings",    label: "تنظیمات",       component: <ModSettings /> },
    ],
    []
  );

  // انتخاب اولین تب غیر‌داشبورد بعد از ورود مجدد (اختیاری)
  useEffect(() => {
    if (!profile?.is_admin) return;
  }, [profile?.is_admin]);

  const current = modules.find((m) => m.key === active) ?? modules[0];

  return (
    <div className="admin-shell grid gap-4 md:grid-cols-[1fr_260px]">
      {/* کانتنت سمت چپ (در RTL می‌شود ستون اول) */}
      <section className="space-y-4 order-1">
        {/* هدر کوچک کانتنت */}
        <div className="card p-3 flex items-center justify-between">
          <div className="font-bold">{current.label}</div>
          <button className="btn-ghost md:hidden" onClick={() => setSidebarOpen((s) => !s)}>
            منو
          </button>
        </div>

        {/* محتوای ماژول فعال */}
        <div className="card p-4">{current.component}</div>
      </section>

      {/* سایدبارِ راست (در RTL ستون دوم) */}
      <aside
        className={`admin-sidebar order-2 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="card p-3 sticky top-20 space-y-2">
          <div className="text-sm muted mb-1">God-Mode Admin</div>
          <nav className="grid gap-1">
            {modules.map((m) => {
              const activeClass = m.key === active ? "nav-active" : "";
              return (
                <button
                  key={m.key}
                  className={`nav-btn text-right ${activeClass}`}
                  onClick={() => {
                    setActive(m.key);
                    setSidebarOpen(false);
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </div>
  );
}
