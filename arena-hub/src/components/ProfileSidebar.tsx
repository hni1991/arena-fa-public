"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User2, Settings, Gamepad2, ShieldCheck, UsersRound, Medal } from "lucide-react";

type Props = {
  title: string;          // مثلا "@hosein"
  username?: string | null;
  isSelf?: boolean;       // آیا صاحب صفحه خود کاربر فعلی است؟
  onProfileClick?: () => void; // وقتی روی "نمایه" کلیک شد (برای خروج از ادیت)
};

export default function ProfileSidebar({ title, username, isSelf, onProfileClick }: Props) {
  const pathname = usePathname();

  // مقصد "نمایه": برای خود کاربر /profile، برای دیگران /u/[username]
  const overviewHref = isSelf ? "/profile" : `/u/${encodeURIComponent(username ?? "")}`;

  const Item = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
          active ? "bg-white/10" : "hover:bg-white/5"
        }`}
      >
        <Icon size={18} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <aside className="card p-3 h-max sticky top-4">
      <h2 className="text-sm font-semibold opacity-80 mb-2">{title}</h2>

      <nav className="grid gap-1">
        {/* Overview: به‌جای div لینک است تا ناوبری درست باشد.
           onClick: اگر ادیت فعال بود، پدر بتواند خاموشش کند. */}
        <Link
          href={overviewHref}
          onClick={onProfileClick}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
            pathname === overviewHref ? "bg-white/10" : "hover:bg-white/5"
          }`}
        >
          <User2 size={18} />
          <span>نمایه</span>
        </Link>

        <Item href="/leaderboards" icon={Medal} label="لیدربوردها" />
        <Item href="/tournaments" icon={Gamepad2} label="تورنمنت‌ها" />
        <Item href="/teams" icon={UsersRound} label="کلن‌ها" />

        {isSelf && (
          <>
            <Item href="/settings/profile" icon={Settings} label="تنظیمات نمایه" />
            <Item href="/settings/security" icon={ShieldCheck} label="امنیت" />
          </>
        )}
      </nav>
    </aside>
  );
}
