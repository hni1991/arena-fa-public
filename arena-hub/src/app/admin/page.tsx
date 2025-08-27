"use client";

import dynamic from "next/dynamic";
import TabbedShell from "@/components/TabbedShell";

/** محتوای تب‌ها را Lazy بارگذاری کن تا Mount اولیه سبک بماند */
const AdminGames = dynamic(() => import("@/app/admin/games/page"), { ssr: false });
const AdminTournaments = dynamic(() => import("@/app/admin/tournaments/page"), { ssr: false });
const AdminSettings = dynamic(() => import("@/app/admin/settings/page"), { ssr: false });

function AdminDashboard() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="card p-4">
        <h3 className="font-bold mb-1">بازی‌ها</h3>
        <p className="opacity-70 text-sm">افزودن/ویرایش و فعال/غیرفعال.</p>
      </div>
      <div className="card p-4">
        <h3 className="font-bold mb-1">تورنمنت‌ها</h3>
        <p className="opacity-70 text-sm">ساخت و مدیریت وضعیت‌ها.</p>
      </div>
      <div className="card p-4">
        <h3 className="font-bold mb-1">کلن‌ها</h3>
        <p className="opacity-70 text-sm">به‌زودی…</p>
      </div>
      <div className="card p-4">
        <h3 className="font-bold mb-1">تنظیمات</h3>
        <p className="opacity-70 text-sm">رنگ/فونت/متن‌های لندینگ.</p>
      </div>
    </div>
  );
}

/** تب کلن‌ها فعلاً Placeholder است تا صفحه‌اش را بسازیم */
function AdminClans() {
  return <div className="opacity-70">بخش کلن‌ها به‌زودی اضافه می‌شود.</div>;
}

export default function AdminHome() {
  return (
    <TabbedShell
      defaultKey="dashboard"
      tabs={[
        { key: "dashboard", label: "داشبورد", content: <AdminDashboard /> },
        { key: "games", label: "بازی‌ها", content: <AdminGames /> },
        { key: "tournaments", label: "تورنمنت‌ها", content: <AdminTournaments /> },
        { key: "clans", label: "کلن‌ها", content: <AdminClans /> },
        { key: "settings", label: "تنظیمات", content: <AdminSettings /> },
      ]}
    />
  );
}
