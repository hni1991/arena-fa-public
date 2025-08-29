"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BANNERS_BUCKET = "game-banners";

/* ---------- TYPES (مینیمال و هماهنگ با اسکیما فعلی) ---------- */
type Game = {
  id: string | number;
  slug: string;
  title: string;
  active: boolean;
  description?: string | null;
  official_url?: string | null;
  website?: string | null;
  youtube?: string | null;
  banner_url?: string | null;
  banner_path?: string | null;
};

type Clan = { id: string; name: string; tag: string | null; logo_url: string | null };
type Highlight = { id: number; week_start: string; user_id: string | null; reason: string | null };
type Profile = { id: string; username: string | null; avatar_url: string | null };

type Tournament = {
  id: string;
  title: string;
  status: "upcoming" | "active" | "finished";
  starts_at: string | null;
  ends_at: string | null;
};

type LeaderRow = {
  user_id: string;
  total_score: number;
  rank_global: number | null;
  profiles: { username?: string | null; avatar_url?: string | null } | null;
};

export default function GameBySlugPage() {
  const p = useParams<{ slug: string }>();
  const slug = Array.isArray(p.slug) ? p.slug[0] : p.slug;

  const [game, setGame] = useState<Game | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const [clans, setClans] = useState<Clan[]>([]);
  const [youtubers, setYoutubers] = useState<(Highlight & { profile: Profile | null })[]>([]);
  const [events, setEvents] = useState<Tournament[]>([]);
  const [leader, setLeader] = useState<LeaderRow[]>([]);

  const [membersCount, setMembersCount] = useState<number>(0);
  const [latestMember, setLatestMember] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);

  // helper برای تاریخ
  function toDateStr(x?: string | null) {
    if (!x) return null;
    try { return new Date(x).toLocaleString(); } catch { return null; }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!slug) return;
      setLoading(true);

      // 1) بازی
      const gq = supabase
        .from("games")
        .select("id,slug,title,active,description,official_url,website,youtube,banner_url,banner_path")
        .eq("slug", slug)
        .maybeSingle();

      // 2) کلن‌ها
      const cq = supabase
        .from("clans")
        .select("id,name,tag,logo_url,game_slug")
        .eq("game_slug", slug)
        .order("name");

      // 3) هایلایت‌های یوتیوبر
      const hq = supabase
        .from("weekly_highlights")
        .select("id,week_start,user_id,reason,game_slug,type")
        .eq("type", "youtuber")
        .eq("game_slug", slug)
        .order("week_start", { ascending: false })
        .limit(12);

      // 4) ایونت‌ها
      const eq = supabase
        .from("tournaments")
        .select("id,title,status,starts_at,ends_at,game_slug")
        .eq("game_slug", slug)
        .in("status", ["upcoming", "active"])
        .order("starts_at", { ascending: true });

      // 5) لیدربورد
      const lq = supabase
        .from("leaderboard")
        .select("user_id,total_score,rank_global,profiles!inner(username,avatar_url),game_slug")
        .eq("game_slug", slug)
        .order("total_score", { ascending: false })
        .limit(20);

      const [g, c, h, e, l] = await Promise.all([gq, cq, hq, eq, lq]);
      if (ignore) return;

      if (!g.error) setGame(g.data as Game);
      if (!c.error) setClans((c.data as any[])?.map(d => ({
        id: d.id, name: d.name, tag: d.tag ?? null, logo_url: d.logo_url ?? null
      })) ?? []);
      if (!e.error) setEvents((e.data as Tournament[]) || []);
      if (!l.error) setLeader((l.data as LeaderRow[]) || []);

      // پروفایل‌های یوتیوبری
      if (!h.error) {
        const list = (h.data as Highlight[]) || [];
        if (list.length) {
          const userIds = list.map(x => x.user_id).filter(Boolean) as string[];
          const { data: profs } = await supabase
            .from("profiles")
            .select("id,username,avatar_url")
            .in("id", userIds);
          const merged = list.map(x => ({
            ...x,
            profile: profs?.find(p => p.id === x.user_id) || null,
          }));
          setYoutubers(merged);
        } else {
          setYoutubers([]);
        }
      }

      // بنر: url مستقیم یا امضای path
      const gb = g.data as Game | null;
      if (gb?.banner_url?.startsWith("http")) {
        setBannerUrl(gb.banner_url);
      } else if (gb?.banner_path) {
        try {
          const { data } = await supabase.storage
            .from(BANNERS_BUCKET)
            .createSignedUrl(String(gb.banner_path), 3600);
          setBannerUrl(data?.signedUrl ?? null);
        } catch {
          setBannerUrl(null);
        }
      } else {
        setBannerUrl(null);
      }

      // اعضا + آخرین عضو
      await loadMembers(slug, setMembersCount, setLatestMember);

      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [slug]);

  const desc = useMemo(() => game?.description?.trim() || "", [game]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* بنر + هدر */}
      <section className="card overflow-hidden p-0">
        <div className="w-full aspect-[21/9] bg-black/30">
          {bannerUrl ? (
            <img src={bannerUrl} alt={game?.title ?? "game"} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{game?.title ?? "—"}</h1>
            <div className="text-sm opacity-70 mt-1 flex gap-2 flex-wrap">
              <span className={`chip ${game?.active ? "chip-primary" : ""}`}>
                {game?.active ? "فعال" : "غیرفعال"}
              </span>
              <span className="chip">اعضا: {membersCount}</span>
              {latestMember && (
                <span className="chip flex items-center gap-2">
                  {latestMember.avatar_url ? (
                    <img src={latestMember.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : null}
                  آخرین عضو: {latestMember.username ?? latestMember.id.slice(0, 6)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {game?.official_url && (
              <a href={game.official_url} target="_blank" rel="noreferrer" className="btn">سایت رسمی</a>
            )}
            {game?.website && (
              <a href={game.website} target="_blank" rel="noreferrer" className="btn-ghost">وب‌سایت</a>
            )}
            {game?.youtube && (
              <a href={prependHttp(game.youtube)} target="_blank" rel="noreferrer" className="btn-ghost">YouTube</a>
            )}
          </div>
        </div>
      </section>

      {/* معرفی */}
      <section className="card p-4">
        <h2 className="font-bold mb-2">معرفی بازی</h2>
        <p className="opacity-80">{desc || "معرفی این بازی هنوز ثبت نشده."}</p>
      </section>

      {/* کلن‌ها و یوتیوبرها */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">کلن‌های این بازی</h3>
          </div>
          {clans.length === 0 ? (
            <div className="opacity-70">کلنی ثبت نشده.</div>
          ) : (
            <ul className="grid gap-2">
              {clans.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="size-8 rounded bg-white/10 overflow-hidden">
                    {c.logo_url ? (
                      <img src={c.logo_url} className="w-full h-full object-cover" alt="" />
                    ) : null}
                  </span>
                  <div className="font-medium">
                    {c.name} {c.tag ? <span className="opacity-60">({c.tag})</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">یوتیوبرهای سایت</h3>
          </div>
          {youtubers.length === 0 ? (
            <div className="opacity-70">فعلاً چیزی ثبت نشده.</div>
          ) : (
            <ul className="grid gap-2">
              {youtubers.map((y) => (
                <li key={y.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {y.profile?.avatar_url ? (
                      <img
                        src={y.profile.avatar_url}
                        className="w-6 h-6 rounded-full object-cover"
                        alt=""
                      />
                    ) : null}
                    <div className="font-medium">
                      {y.profile?.username || y.user_id || "user"}
                    </div>
                  </div>
                  <span className="chip ltr">{y.week_start}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ایونت‌ها */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">ایونت‌های این بازی</h3>
          <Link className="btn-ghost text-sm" href="/tournaments">همه تورنمنت‌ها</Link>
        </div>
        {events.length === 0 ? (
          <div className="opacity-70">ایونتی در حال حاضر نیست.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="opacity-70">
                <tr>
                  <th className="p-2 text-right">عنوان</th>
                  <th className="p-2">وضعیت</th>
                  <th className="p-2">زمان</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-t border-neutral-800">
                    <td className="p-2">{ev.title}</td>
                    <td className="p-2">{ev.status}</td>
                    <td className="p-2 ltr">
                      {toDateStr(ev.starts_at) ?? "—"}
                      {ev.ends_at ? ` → ${toDateStr(ev.ends_at)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* لیدربورد */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">لیدربورد</h3>
          <Link className="btn-ghost text-sm" href="/leaderboards">مشاهده همه</Link>
        </div>
        {leader.length === 0 ? (
          <div className="opacity-70">هنوز لیدربوردی وجود ندارد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="opacity-70">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2 text-right">کاربر</th>
                  <th className="p-2 text-right">امتیاز</th>
                </tr>
              </thead>
              <tbody>
                {leader.map((r, i) => (
                  <tr key={r.user_id} className="border-t border-neutral-800">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2 flex items-center gap-2">
                      {r.profiles?.avatar_url ? (
                        <img
                          src={r.profiles.avatar_url}
                          className="w-5 h-5 rounded-full object-cover"
                          alt=""
                        />
                      ) : null}
                      {r.profiles?.username || r.user_id}
                    </td>
                    <td className="p-2">{r.total_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {loading && <div className="card p-4">در حال بارگذاری…</div>}
    </div>
  );
}

/* ---------- helpers ---------- */

function prependHttp(u: string) {
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

/**
 * اعضا = هرکسی که آن بازی را در پروفایل انتخاب کرده باشد.
 * سناریوها:
 *  1) اگر جدول عضویت موجود است: x_game_members (یا game_members) → count + آخرین عضو با join به profiles
 *  2) در غیر این صورت، fallback خیلی سبک: از tournament_participants فقط برای اینکه صفحه خالی نباشد.
 */
async function loadMembers(
  gameSlug: string,
  setCount: (n: number) => void,
  setLatest: (p: Profile | null) => void
) {
  // گزینه 1: x_game_members با game_slug
  let { data: xm, error: xe } = await supabase
    .from("x_game_members")
    .select("user_id, created_at, game_slug")
    .eq("game_slug", gameSlug)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!xe && xm && xm.length) {
    setCount(xm.length); // اگر صفحه pagination خواستی، جداگانه count بگیر
    const latestId = xm[0].user_id;
    const { data: prof } = await supabase
      .from("profiles")
      .select("id,username,avatar_url")
      .eq("id", latestId)
      .maybeSingle();
    setLatest((prof as Profile) ?? null);
    return;
  }

  // گزینه 2: game_members با game_slug
  let { data: gm, error: ge } = await supabase
    .from("game_members")
    .select("user_id, created_at, game_slug")
    .eq("game_slug", gameSlug)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!ge && gm && gm.length) {
    setCount(gm.length);
    const latestId = gm[0].user_id;
    const { data: prof } = await supabase
      .from("profiles")
      .select("id,username,avatar_url")
      .eq("id", latestId)
      .maybeSingle();
    setLatest((prof as Profile) ?? null);
    return;
  }

  // گزینه 3 (fallback): از شرکت‌کنندگان تورنمنت‌های همین بازی صرفاً برای اینکه صفر نشود
  const { data: tids } = await supabase
    .from("tournaments")
    .select("id")
    .eq("game_slug", gameSlug);

  const tIds = (tids as { id: string }[] | null)?.map((x) => x.id) ?? [];
  if (tIds.length) {
    const { data, count } = await supabase
      .from("tournament_participants")
      .select("user_id,created_at", { count: "exact" })
      .in("tournament_id", tIds)
      .order("created_at", { ascending: false })
      .limit(1);
    setCount(count ?? 0);

    const latestUid = data?.[0]?.user_id;
    if (latestUid) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id,username,avatar_url")
        .eq("id", latestUid)
        .maybeSingle();
      setLatest((prof as Profile) ?? null);
    } else {
      setLatest(null);
    }
  } else {
    setCount(0);
    setLatest(null);
  }
}
