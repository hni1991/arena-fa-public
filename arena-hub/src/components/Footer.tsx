"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** مینیمال اسلاگی‌فای محلی (فعلاً از title می‌سازه) */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

type Item = { label: string; href?: string; note?: string };
type Section = { title: string; items: Item[] };

export default function Footer() {
  // --- Games from DB (active=true) ---
  const [gameItems, setGameItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("games")
          .select("title, active")
          .order("title", { ascending: true });

        const rows = (data ?? []).filter((g: any) => g.active !== false);
        const mapped: Item[] = rows.map((g: any) => {
          const slug = slugify(g.title ?? "");
          // فعلاً می‌ره به تورنمنت‌های همان بازی؛ بعداً /g/[slug] را جایگزین می‌کنیم.
          return { label: g.title ?? "Game", href: `/tournaments?game=${slug}` };
        });

        // اگر دیتابیس خالی بود، چیزی نمایش نده (سکشن Games فقط لینک کلی خواهد داشت)
        setGameItems(mapped);
      } catch (_) {
        setGameItems([]);
      }
    })();
  }, []);

  // --- Broad menus (سفید = فعال، خاکستری = هنوز نیست) ---
  const sections: Section[] = [
    {
      title: "Play & Compete",
      items: [
        { label: "Tournaments", href: "/tournaments" },
        { label: "Leaderboards", href: "/leaderboards" },
        { label: "Weekly Highlights", href: "/highlights" },
      ],
    },
    {
      title: "Games",
      items: [
        { label: "All Games", href: "/tournaments" }, // لیست کلی
        // بازی‌های DB در ادامه تزریق می‌شن
        ...gameItems,
      ],
    },
    {
      title: "Community",
      items: [
        { label: "Players" },            // هنوز نیست → خاکستری
        { label: "Creators / YouTubers" },
        { label: "Gamenets" },
        { label: "Discover" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Login / Signup", href: "/auth" },
        { label: "Profile", href: "/profile" },
        { label: "User Settings", href: "/settings" }, // اگر صفحه‌اش نداری، می‌تونی href را حذف کنی
      ],
    },
    {
      title: "Admin",
      items: [
        { label: "Dashboard", href: "/admin" },
        { label: "Manage Tournaments", href: "/admin/tournaments" },
        { label: "Manage Games", href: "/admin/games" },
        { label: "Theme & Site Settings", href: "/admin/settings" },
      ],
    },
    {
      title: "Info",
      items: [
        { label: "About" },
        { label: "Help / FAQ" },
        { label: "Terms" },
        { label: "Privacy" },
        { label: "Contact" },
      ],
    },
  ];

  const LinkEl = ({ it }: { it: Item }) =>
    it.href ? (
      <Link
        href={it.href}
        className="text-sm opacity-90 hover:opacity-100 hover:underline underline-offset-4"
      >
        {it.label}
        {it.note ? <span className="ms-2 opacity-60 text-xs">{it.note}</span> : null}
      </Link>
    ) : (
      <span className="text-sm opacity-55 cursor-default">{it.label}</span> // خاکستری = هنوز نیست
    );

  return (
    <footer className="mt-16 border-t border-white/10">
      {/* بالا: خلاصه/CTA کوتاه */}
      <div className="container py-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div className="text-lg font-semibold">ArenaFA</div>
        <p className="opacity-75 text-sm">
          هاب فارسی گیمینگ — تورنمنت، لیدربورد و هایلایت‌های هفتگی.
        </p>
        <div className="ms-auto flex gap-2">
          <Link href="/tournaments" className="btn btn-primary">ثبت‌نام تورنمنت</Link>
          <Link href="/leaderboards" className="btn btn-ghost">لیدربوردها</Link>
        </div>
      </div>

      {/* سایت‌مپ: ساده و ریسپانسیو */}
      <div className="container grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 py-8">
        {sections.map((sec) => (
          <nav key={sec.title}>
            <h3 className="text-sm font-semibold mb-3 opacity-90">{sec.title}</h3>
            <ul className="space-y-2">
              {sec.items.map((it) => (
                <li key={`${sec.title}-${it.label}`}>
                  <LinkEl it={it} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* پایین: حقوق/سوشال ساده */}
      <div className="bg-black/20">
        <div className="container py-4 flex flex-col md:flex-row items-center gap-3 justify-between text-xs opacity-70">
          <div>© {new Date().getFullYear()} ArenaFA — All rights reserved.</div>
          <div className="flex items-center gap-3">
            <Link href="/site-map" className="hover:underline underline-offset-4">Site Map</Link>
            <span className="cursor-default opacity-60">Instagram</span>
            <span className="cursor-default opacity-60">YouTube</span>
            <span className="cursor-default opacity-60">X / Twitter</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
