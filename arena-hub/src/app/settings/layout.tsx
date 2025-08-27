// ساید‌پنل ثابت + محتوا
import Link from "next/link";
import { User2, Gamepad2, ShieldCheck, Bell, Eye, Link2, UsersRound, AlertTriangle } from "lucide-react";
import { ReactNode } from "react";

const NavItem = ({ href, label, Icon }: { href: string; label: string; Icon: any }) => {
  // از توابع App Router برای تشخیص active اگر خواستی استفاده کن؛ این نسخه سبک است:
  const isActive = (typeof window !== "undefined") && window.location.pathname === href;
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
        isActive ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container py-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
      <aside className="card p-3 h-max sticky top-4">
        <h2 className="text-sm font-semibold opacity-80 mb-2">تنظیمات</h2>
        <nav className="grid gap-1">
          <NavItem href="/settings/profile"  label="پروفایل"     Icon={User2} />
          <NavItem href="/settings/games"    label="بازی‌ها"      Icon={Gamepad2} />
          <NavItem href="/settings/security" label="امنیت"       Icon={ShieldCheck} />
          <NavItem href="/settings/notifications" label="اعلان‌ها" Icon={Bell} />
          <NavItem href="/settings/privacy" label="حریم خصوصی"   Icon={Eye} />
          <NavItem href="/settings/connections" label="اتصال‌ها" Icon={Link2} />
          <NavItem href="/settings/clan"     label="کلن"         Icon={UsersRound} />
          <NavItem href="/settings/danger"   label="منطقه خطر"   Icon={AlertTriangle} />
        </nav>
      </aside>
      <section>{children}</section>
    </div>
  );
}
