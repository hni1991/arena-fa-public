"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type Game = { id: string; title: string; active: boolean };
const AVATAR_BUCKET = "avatars"; // اگر باکت فرق دارد عوض کن

export default function Navbar() {
  const { user, profile } = useAuth();
  const pathname = usePathname();

  // منوها
  const [openGames, setOpenGames] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const gamesRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // بازی‌ها (lazy)
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  async function ensureGamesLoaded() {
    if (games.length || loadingGames) return;
    setLoadingGames(true);
    const { data, error } = await supabase
      .from("games")
      .select("id,title,active")
      .eq("active", true)
      .order("title");
    if (!error && data) setGames(data as Game[]);
    setLoadingGames(false);
  }

  // آواتار
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!profile?.avatar_url) { setAvatarUrl(null); return; }
      if (profile.avatar_url.startsWith("http")) {
        if (mounted) setAvatarUrl(profile.avatar_url);
        return;
      }
      const { data } = await supabase.storage.from(AVATAR_BUCKET)
        .createSignedUrl(profile.avatar_url, 3600);
      if (mounted) setAvatarUrl(data?.signedUrl ?? null);
    })();
    return () => { mounted = false; };
  }, [profile?.avatar_url]);

  // کلیک بیرون
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (gamesRef.current && !gamesRef.current.contains(e.target as Node)) setOpenGames(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setOpenUser(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // تغییر مسیر → بستن
  useEffect(() => {
    setOpenGames(false);
    setOpenUser(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    location.assign("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-[var(--c-bg)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--c-bg)]/60">
      <div className="container mx-auto px-4">
        <div className="h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-extrabold tracking-tight text-lg">ArenaFA</Link>

            <nav className="hidden md:flex items-center gap-2">
              {/* بازی‌ها: باز با کلیک؛ فچ داخل */}
              <div className="relative" ref={gamesRef}>
                <button
                  className="btn !py-1.5 !px-3"
                  onClick={async () => { setOpenGames((s) => !s); await ensureGamesLoaded(); }}
                  aria-expanded={openGames}
                >
                  بازی‌ها
                </button>
                {openGames && (
                  <div className="absolute right-0 mt-2 w-72 max-h-[60vh] overflow-auto card p-2 shadow-xl z-50">
                    <div className="text-xs opacity-70 px-2 pb-2">بازی‌های فعال</div>
                    {loadingGames && <div className="px-2 py-1 opacity-70">در حال بارگذاری…</div>}
                    {!loadingGames && games.length === 0 && <div className="px-2 py-1 opacity-70">فعلاً خالی است</div>}
                    <ul className="space-y-1">
                      {games.map((g) => (
                        <li key={g.id}>
                          <Link href={`/games/${g.id}`} className="menu-item block" onClick={() => setOpenGames(false)}>
                            {g.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 border-t pt-2 grid grid-cols-2 gap-2">
                      <Link href="/tournaments" className="btn">تورنمنت‌ها</Link>
                      <Link href="/leaderboards" className="btn">لیدربورد</Link>
                      <Link href="/highlights" className="btn col-span-2">هایلایت‌ها</Link>
                    </div>
                  </div>
                )}
              </div>

              <TopLink href="/tournaments" path={pathname} label="تورنمنت‌ها" />
              <TopLink href="/leaderboards" path={pathname} label="لیدربورد" />
              <TopLink href="/highlights" path={pathname} label="هایلایت هفتگی" />
              {user && <TopLink href="/profile" path={pathname} label="پروفایل" />}
              {profile?.is_admin && <TopLink href="/admin" path={pathname} label="ادمین" />}
            </nav>
          </div>

          {/* سمت راست */}
          <div className="flex items-center gap-2" ref={userRef}>
            {!user ? (
              <Link href="/auth" className="btn">ورود / ثبت‌نام</Link>
            ) : (
              <div className="relative">
                <button className="btn !py-1.5 !px-3 flex items-center gap-2" onClick={() => setOpenUser((s) => !s)}>
                  <span className="inline-block size-7 rounded-full overflow-hidden bg-black/10">
                    {avatarUrl && <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />}
                  </span>
                  <span className="text-sm">{profile?.username || "کاربر"}</span>
                </button>
                {openUser && (
                  <div className="absolute right-0 mt-2 w-56 card p-2 shadow-xl z-50">
                    <Link href="/profile" className="menu-item block" onClick={() => setOpenUser(false)}>پروفایل من</Link>
                    {profile?.is_admin && (
                      <Link href="/admin" className="menu-item block" onClick={() => setOpenUser(false)}>پنل ادمین</Link>
                    )}
                    <button className="menu-item w-full text-left" onClick={handleLogout}>خروج</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* نوار موبایل خیلی ساده (بدون فچ) */}
      <div className="md:hidden border-t">
        <div className="container mx-auto px-4 py-2 flex gap-2 flex-wrap">
          <Link className="btn" href="/tournaments">تورنمنت‌ها</Link>
          <Link className="btn" href="/leaderboards">لیدربورد</Link>
          <Link className="btn" href="/highlights">هایلایت‌ها</Link>
          {user && <Link className="btn" href="/profile">پروفایل</Link>}
          {profile?.is_admin && <Link className="btn" href="/admin">ادمین</Link>}
          {!user && <Link className="btn" href="/auth">ورود / ثبت‌نام</Link>}
        </div>
      </div>
    </header>
  );
}

function TopLink({ href, path, label }: { href: string; path: string; label: string }) {
  const active = path === href || (href !== "/" && path.startsWith(href));
  return (
    <Link href={href} className={`btn !py-1.5 !px-3 ${active ? "ring-2 ring-[var(--c-primary)]" : ""}`}>
      {label}
    </Link>
  );
}
