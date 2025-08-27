// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import GlowFrame from "@/components/GlowFrame";
import Footer from "@/components/Footer";

/* ===================== Types ===================== */
type SiteSettings = {
  brand_name?: string | null;
  primary_hex?: string | null;
  accent_hex?: string | null;
  bg_hex?: string | null;
  font_family?: string | null;
  hero_title?: string | null;
  hero_body?: string | null;
};

type WeeklyItem = {
  type: "user" | "youtuber" | "gamenet";
  week_start: string;
  reason: string | null;
  user_id: string | null;
  game_id: string | null;
};

type Tournament = {
  id: string;
  title: string | null;
  status: "upcoming" | "active" | "finished";
  description: string | null;
  game_id: string | null;
  start_date?: string | null;
};

type GameRow = {
  id: string;
  title: string;
  active?: boolean | null;
};

/* ===================== Utils (UI Only) ===================== */
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
const shortDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(+d)) return iso ?? "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
};

function SectionTitle({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-8">
      {kicker ? <div className="chip chip-primary inline-block mb-3">{kicker}</div> : null}
      <h2 className="text-3xl md:text-4xl font-semibold mb-2">{title}</h2>
      {subtitle ? <p className="opacity-70 max-w-2xl mx-auto">{subtitle}</p> : null}
    </div>
  );
}

/* ===================== Mappers (read-only) ===================== */
async function mapUsernamesById(ids: string[]) {
  const map: Record<string, string> = {};
  const cleaned = uniq(ids.filter(Boolean));
  if (!cleaned.length) return map;
  const { data } = await supabase.from("profiles").select("id, username").in("id", cleaned);
  for (const r of (data ?? []) as any[]) map[r.id] = r.username ?? "";
  return map;
}

async function mapGameTitlesById(ids: string[]) {
  const map: Record<string, string> = {};
  const cleaned = uniq(ids.filter(Boolean));
  if (!cleaned.length) return map;
  const { data } = await supabase.from("games").select("id, title").in("id", cleaned);
  for (const r of (data ?? []) as any[]) map[r.id] = r.title ?? "";
  return map;
}

/* ===================== Page ===================== */
export default function LandingPage() {
  /* -------- Settings -------- */
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  /* -------- Weekly (all, newest first) -------- */
  const [weekly, setWeekly] = useState<
    (WeeklyItem & { player?: string | null; game?: string | null })[]
  >([]);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [weeklyErr, setWeeklyErr] = useState<string | null>(null);

  /* -------- Upcoming tournaments -------- */
  const [upcoming, setUpcoming] = useState<(Tournament & { game?: string | null })[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);

  /* -------- Games list -------- */
  const [games, setGames] = useState<GameRow[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);

  /* -------- Fetch site settings -------- */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select(
          "brand_name, primary_hex, accent_hex, bg_hex, font_family, hero_title, hero_body"
        )
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("[site_settings]", error);
        setSettings({
          brand_name: "ArenaFA",
          hero_title: "هاب فارسی گیمینگ",
          hero_body:
            "تورنامنت‌ها، لیدربوردهای زنده و شبکهٔ سازندگان ایرانی. به رقابت بپیوند!",
        });
        return;
      }
      setSettings(
        data ?? {
          brand_name: "ArenaFA",
          hero_title: "هاب فارسی گیمینگ",
          hero_body:
            "تورنامنت‌ها، لیدربوردهای زنده و شبکهٔ سازندگان ایرانی. به رقابت بپیوند!",
        }
      );
    })();
  }, []);

  /* -------- Weekly highlights -------- */
  useEffect(() => {
    (async () => {
      setLoadingWeekly(true);
      setWeeklyErr(null);
      try {
        const { data, error } = await supabase
          .from("weekly_highlights")
          .select("type, week_start, reason, user_id, game_id")
          .order("week_start", { ascending: false })
          .limit(24);

        if (error) throw error;

        const userIds = uniq((data ?? []).map((r: any) => r.user_id).filter(Boolean));
        const gameIds = uniq((data ?? []).map((r: any) => r.game_id).filter(Boolean));
        const [usersMap, gamesMap] = await Promise.all([
          mapUsernamesById(userIds),
          mapGameTitlesById(gameIds),
        ]);

        const rows =
          (data ?? []).map((r: any) => ({
            ...r,
            player: usersMap[r.user_id] ?? null,
            game: gamesMap[r.game_id] ?? null,
          })) ?? [];

        setWeekly(rows);
      } catch (e: any) {
        console.error("[weekly_highlights]", e);
        setWeeklyErr(e?.message ?? "خطا در بارگذاری هایلایت‌های هفتگی.");
        setWeekly([]);
      } finally {
        setLoadingWeekly(false);
      }
    })();
  }, []);

  /* -------- Upcoming tournaments -------- */
  useEffect(() => {
    (async () => {
      setLoadingTournaments(true);
      try {
        const { data, error } = await supabase
          .from("tournaments")
          .select("id, title, status, description, game_id, start_date")
          .eq("status", "upcoming")
          .order("start_date", { ascending: true })
          .limit(8);

        if (error) throw error;

        const gameIds = uniq((data ?? []).map((r: any) => r.game_id).filter(Boolean));
        const gamesMap = await mapGameTitlesById(gameIds);

        const rows =
          (data ?? []).map((t: any) => ({
            ...t,
            game: gamesMap[t.game_id] ?? null,
          })) ?? [];

        setUpcoming(rows);
      } catch (e: any) {
        console.error("[tournaments]", e);
        setUpcoming([]);
      } finally {
        setLoadingTournaments(false);
      }
    })();
  }, []);

  /* -------- Games list (active=true) + featured fallback -------- */
  useEffect(() => {
    (async () => {
      setLoadingGames(true);
      try {
        const { data, error } = await supabase
          .from("games")
          .select("id, title, active")
          .order("title", { ascending: true });

        if (error) throw error;

        let rows = (data ?? []).filter((g: any) => g.active !== false) as GameRow[];

        // Fallback اگر خالی بود
        if (!rows.length) {
          rows = [
            { id: "codm", title: "COD: Mobile" },
            { id: "warzone", title: "Warzone" },
            { id: "general", title: "General" },
          ];
        }
        setGames(rows);
      } catch (e) {
        setGames([
          { id: "codm", title: "COD: Mobile" },
          { id: "warzone", title: "Warzone" },
          { id: "general", title: "General" },
        ]);
      } finally {
        setLoadingGames(false);
      }
    })();
  }, []);

  /* -------- Derived -------- */
  const brand = settings?.brand_name ?? "ArenaFA";
  const heroTitle = settings?.hero_title ?? "ArenaFA — هاب فارسی گیمینگ";
  const heroBody =
    settings?.hero_body ??
    "تورنامنت‌ها، لیدربوردهای زنده و شبکهٔ سازندگان ایرانی. به رقابت بپیوند!";

  const groupedWeekly = useMemo(() => {
    const g: Record<"user" | "youtuber" | "gamenet", typeof weekly> = {
      user: [],
      youtuber: [],
      gamenet: [],
    };
    for (const item of weekly) {
      if (!g[item.type]) continue;
      g[item.type].push(item);
    }
    return g;
  }, [weekly]);

  /* ===================== UI ===================== */
  return (
    <>
      <main className="container py-10">
        {/* ===== Hero ===== */}
        <section className="mb-14">
          <GlowFrame tone="mixed" className="p-8 md:p-12 neon-border">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="chip chip-primary mb-3">E‑Sports Vibe</div>
                <h1 className="text-4xl md:text-5xl font-semibold mb-4 breathe">
                  {heroTitle}
                </h1>
                <p className="opacity-80 text-lg mb-6">
                  {heroBody}
                  <br />
                  <span className="opacity-80 text-base">
                    ثبت‌نام کن، وارد تورنمنت شو و اسم خودت رو تو لیدربورد جا بنداز.
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/tournaments" className="btn btn-primary neon-ring-green">
                    شرکت در تورنمنت‌ها
                  </Link>
                  <Link href="/leaderboards" className="btn btn-ghost tab">
                    دیدن لیدربوردها
                  </Link>
                  <Link href="/auth" className="btn btn-ghost">
                    ورود / ثبت‌نام
                  </Link>
                </div>
              </div>

              {/* Why / About */}
              <div className="relative">
                <div className="card p-6">
                  <h3 className="text-xl font-semibold mb-3">چرا {brand}؟</h3>
                  <ul className="list-disc pr-5 space-y-2 opacity-90">
                    <li>
                      <b>رقابت زنده و عادلانه:</b> امتیازها و رتبه‌ها به‌روزشده، با جدول‌های
                      Tournament/Weekly/Global.
                    </li>
                    <li>
                      <b>کشف استعدادها:</b> هایلایت‌های هفتگی از پلیرها، یوتیوبرها و گیم‌نت‌ها.
                    </li>
                    <li>
                      <b>پروفایل و جامعه:</b> پروفایل عمومی (به‌زودی فالو/آنفالو) و vitrine
                      سازندگان ایرانی.
                    </li>
                  </ul>
                </div>
                <Link
                  href="/tournaments"
                  className="absolute -bottom-4 -left-4 chip chip-primary"
                  aria-label="بزن بریم رقابت!"
                >
                  بزن بریم رقابت! 🔥
                </Link>
              </div>
            </div>
          </GlowFrame>
        </section>

        {/* ===== Games ===== */}
        <section className="mb-14">
          <SectionTitle
            kicker="Playground"
            title="بازی‌ها"
            subtitle="از اینجا وارد رقابت شو—بازی‌هات رو انتخاب کن. در حال حاضر COD: Mobile، Warzone و General در دسترس هستند."
          />

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {loadingGames && (
              <GlowFrame className="p-6">
                <div className="opacity-70">در حال بارگذاری بازی‌ها…</div>
              </GlowFrame>
            )}

            {!loadingGames &&
              games.map((g) => (
                <GlowFrame
                  key={g.id}
                  tone={
                    /cod|mobile/i.test(g.title)
                      ? "green"
                      : /warzone/i.test(g.title)
                      ? "red"
                      : "orange"
                  }
                  className="p-0"
                >
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{g.title}</h3>
                    <span className="chip chip-primary">Active</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="opacity-80 text-sm">
                      {/cod|mobile/i.test(g.title)
                        ? "نبردهای سریع موبایلی—برای حرکت‌های دقیق و رفلکس‌های تیز."
                        : /warzone/i.test(g.title)
                        ? "بتل‌رویال پرتنش—بپر وسط نبرد و تا آخر زنده بمون."
                        : "ردهٔ آزاد—چالش‌ها و ایونت‌های عمومی برای همهٔ گیمرها."}
                    </p>
                    <div className="flex gap-2">
                      <Link href="/tournaments" className="btn btn-primary">
                        تورنمنت‌های {g.title}
                      </Link>
                      <Link href="/leaderboards" className="btn btn-ghost tab">
                        لیدربورد
                      </Link>
                    </div>
                  </div>
                </GlowFrame>
              ))}
          </div>
        </section>

        {/* ===== Top of the Week ===== */}
        <section className="mb-14">
          <SectionTitle
            kicker="Top of the Week"
            title="هایلایت‌های هفتگی"
            subtitle="جدیدترین هایلایت‌ها از جامعه—پلیرها، یوتیوبرها و گیم‌نت‌ها."
          />

          {weeklyErr ? (
            <div className="card p-4 mb-6">
              <b>خطا:</b> {weeklyErr}
            </div>
          ) : null}

          <div className="grid md:grid-cols-3 gap-6">
            {/* Players */}
            <GlowFrame tone="green" className="p-0">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Players</h3>
                <span className="chip chip-primary">{groupedWeekly.user.length}</span>
              </div>
              <div className="p-4 space-y-3">
                {loadingWeekly && <div className="opacity-60">در حال بارگذاری…</div>}
                {!loadingWeekly && groupedWeekly.user.length === 0 && (
                  <div className="opacity-60">فعلاً خالیه.</div>
                )}
                {groupedWeekly.user.slice(0, 6).map((w, i) => (
                  <div key={`u-${i}`} className="card p-3">
                    <div className="text-sm opacity-60 mb-1">{shortDate(w.week_start)}</div>
                    <div className="font-medium">{w.player ?? "کاربر"}</div>
                    <div className="opacity-80 text-sm">{w.game ?? "-"}</div>
                    {w.reason ? <div className="opacity-80 text-sm mt-1">{w.reason}</div> : null}
                  </div>
                ))}
              </div>
            </GlowFrame>

            {/* YouTubers */}
            <GlowFrame tone="orange" className="p-0">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold">YouTubers</h3>
                <span className="chip chip-primary">{groupedWeekly.youtuber.length}</span>
              </div>
              <div className="p-4 space-y-3">
                {loadingWeekly && <div className="opacity-60">در حال بارگذاری…</div>}
                {!loadingWeekly && groupedWeekly.youtuber.length === 0 && (
                  <div className="opacity-60">فعلاً خالیه.</div>
                )}
                {groupedWeekly.youtuber.slice(0, 6).map((w, i) => (
                  <div key={`y-${i}`} className="card p-3">
                    <div className="text-sm opacity-60 mb-1">{shortDate(w.week_start)}</div>
                    <div className="font-medium">{w.player ?? "کانال"}</div>
                    <div className="opacity-80 text-sm">{w.game ?? "-"}</div>
                    {w.reason ? <div className="opacity-80 text-sm mt-1">{w.reason}</div> : null}
                  </div>
                ))}
              </div>
            </GlowFrame>

            {/* Gamenets */}
            <GlowFrame tone="red" className="p-0">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Gamenets</h3>
                <span className="chip chip-primary">{groupedWeekly.gamenet.length}</span>
              </div>
              <div className="p-4 space-y-3">
                {loadingWeekly && <div className="opacity-60">در حال بارگذاری…</div>}
                {!loadingWeekly && groupedWeekly.gamenet.length === 0 && (
                  <div className="opacity-60">فعلاً خالیه.</div>
                )}
                {groupedWeekly.gamenet.slice(0, 6).map((w, i) => (
                  <div key={`g-${i}`} className="card p-3">
                    <div className="text-sm opacity-60 mb-1">{shortDate(w.week_start)}</div>
                    <div className="font-medium">{w.player ?? "گیم‌نت"}</div>
                    <div className="opacity-80 text-sm">{w.game ?? "-"}</div>
                    {w.reason ? <div className="opacity-80 text-sm mt-1">{w.reason}</div> : null}
                  </div>
                ))}
              </div>
            </GlowFrame>
          </div>
        </section>

        {/* ===== Upcoming Tournaments ===== */}
        <section className="mb-14">
          <SectionTitle
            kicker="Don’t Miss"
            title="تورنامنت‌های پیشِ‌رو"
            subtitle="ثبت‌نام کن، رقابت کن، و در لیدربورد بدرخش."
          />

          <div className="grid md:grid-cols-3 gap-6">
            {loadingTournaments && (
              <GlowFrame className="p-6">
                <div className="opacity-70">در حال بارگذاری تورنمنت‌ها…</div>
              </GlowFrame>
            )}

            {!loadingTournaments && upcoming.length === 0 && (
              <GlowFrame className="p-6">
                <div className="opacity-70">فعلاً تورنمنتی در راه نیست.</div>
              </GlowFrame>
            )}

            {upcoming.map((t) => (
              <GlowFrame key={t.id} tone="green" className="p-0">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{t.title ?? "Tournament"}</h3>
                  <span className="chip badge-success">upcoming</span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="opacity-80 text-sm">Game: {t.game ?? "-"}</div>
                  {t.start_date ? (
                    <div className="opacity-80 text-sm">Start: {shortDate(t.start_date)}</div>
                  ) : null}
                  {t.description ? (
                    <p className="opacity-80 text-sm">{t.description}</p>
                  ) : (
                    <p className="opacity-60 text-sm">بدون توضیحات</p>
                  )}
                  <Link href={`/tournaments/${t.id}`} className="btn btn-primary mt-2">
                    ورود به صفحهٔ تورنمنت
                  </Link>
                </div>
              </GlowFrame>
            ))}
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="mb-24">
          <GlowFrame className="p-8 md:p-10 text-center">
            <h3 className="text-2xl md:text-3xl font-semibold mb-3">آماده‌ای برای رقابت؟</h3>
            <p className="opacity-80 mb-6">
              به جامعهٔ {brand} بپیوند—در رویدادها شرکت کن و اسم‌ات را در لیدربورد ثبت کن.
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/auth" className="btn btn-primary">
                شروع کن
              </Link>
              <Link href="/leaderboards" className="btn btn-ghost tab">
                لیدربوردها
              </Link>
            </div>
          </GlowFrame>
        </section>
      </main>

      {/* Footer یکپارچه */}
      <Footer />
    </>
  );
}
