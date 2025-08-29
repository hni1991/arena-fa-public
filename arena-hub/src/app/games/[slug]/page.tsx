"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Game, Clan, Tournament, LeaderRow, Highlight } from "@/types/db";

const BANNERS_BUCKET = "game-banners";

function toDateStr(x?: string | null) {
  if (!x) return null;
  try { return new Date(x).toISOString(); } catch { return null; }
}

function pickEventWindow(t: Tournament) {
  // اولویت: starts_at/ends_at → start_at/end_at → start_date/end_date
  const s =
    t.starts_at ||
    t.start_at ||
    (t.start_date ? `${t.start_date}T00:00:00Z` : null);
  const e =
    t.ends_at ||
    t.end_at ||
    (t.end_date ? `${t.end_date}T00:00:00Z` : null);
  return { start: s, end: e };
}

export default function GameBySlugPage() {
  const p = useParams<{ slug: string }>();
  const key = Array.isArray(p.slug) ? p.slug[0] : p.slug;

  const [game, setGame] = useState<Game | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [clans, setClans] = useState<Clan[]>([]);
  const [youtubers, setYoutubers] = useState<(Highlight & { username: string | null })[]>([]);
  const [events, setEvents] = useState<Tournament[]>([]);
  const [leader, setLeader] = useState<LeaderRow[]>([]);
  const [membersCount, setMembersCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!key) return;
      setLoading(true);

      // 1) بازی (با اسلاگ یا آی‌دی)
      const isNumeric = /^\d+$/.test(key);
      const gq = isNumeric
        ? supabase.from("games").select("id,slug,title,active,is_active,banner_path,banner_url,description,official_url,website,youtube").eq("id", Number(key)).maybeSingle()
        : supabase.from("games").select("id,slug,title,active,is_active,banner_path,banner_url,description,official_url,website,youtube").eq("slug", key).maybeSingle();

      const [g] = await Promise.all([gq]);
      if (g.error || !g.data) { setLoading(false); return; }
      const G = g.data as Game;
      if (ignore) return;
      setGame(G);

      // 2) بنر
      if (G.banner_url) setBannerUrl(G.banner_url);
      else if (G.banner_path) {
        const { data } = await supabase.storage.from(BANNERS_BUCKET).createSignedUrl(G.banner_path, 3600);
        if (!ignore) setBannerUrl(data?.signedUrl || null);
      } else { setBannerUrl(null); }

      // 3) کلن‌ها
      const cq = await supabase.from("clans").select("id,name,tag,logo_url").eq("game_id", G.id).order("name");
      if (!ignore && !cq.error) setClans((cq.data as Clan[]) || []);

      // 4) یوتیوبرهای مرتبط
      const hq = await supabase
        .from("weekly_highlights")
        .select("id,week_start,user_id,reason,type,game_id")
        .eq("type", "youtuber")
        .eq("game_id", G.id)
        .order("week_start", { ascending: false })
        .limit(12);
      if (!ignore && !hq.error) {
        const list = (hq.data as Highlight[]) || [];
        if (list.length) {
          const userIds = list.map((x) => x.user_id).filter(Boolean) as string[];
          const { data: profs } = await supabase
            .from("profiles")
            .select("id,username")
            .in("id", userIds);
          const merged = list.map((x) => ({
            ...x,
            username: profs?.find((p) => p.id === x.user_id)?.username ?? null,
          }));
          setYoutubers(merged);
        } else setYoutubers([]);
      }

      // 5) ایونت‌ها
      const eq = await supabase
        .from("tournaments")
        .select("id,title,game_id,status,starts_at,ends_at,start_at,end_at,start_date,end_date,description")
        .eq("game_id", G.id)
        .in("status", ["upcoming", "active"])
        .order("starts_at", { ascending: true });
      if (!ignore && !eq.error) setEvents((eq.data as Tournament[]) || []);

      // 6) لیدربورد (+پروفایل)
      const lq = await supabase
        .from("leaderboard")
        .select("user_id,game_id,total_score,rank_global, profiles:profiles!inner(id,username,avatar_url)")
        .eq("game_id", G.id)
        .order("total_score", { ascending: false })
        .limit(20);
      if (!ignore && !lq.error) setLeader((lq.data as LeaderRow[]) || []);

      // 7) تعداد اعضا: user_games برای این بازی
      const { count } = await supabase
        .from("user_games")
        .select("user_id", { count: "exact", head: true })
        .eq("game_id", G.id);
      if (!ignore) setMembersCount(count ?? 0);

      setLoading(false);
    })();
    return () => { ignore = true; };
  }, [key]);

  const desc = game?.description?.trim();
  const isActive = (game?.active ?? game?.is_active) ?? true;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <section className="card overflow-hidden p-0">
        <div className="w-full aspect-[21/9] bg-black/30">
          {bannerUrl ? <img src={bannerUrl} alt={game?.title || "game"} className="w-full h-full object-cover" /> : null}
        </div>
        <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{game?.title || "—"}</h1>
            <div className="text-sm opacity-70 mt-1 flex gap-2 flex-wrap">
              <span className={`chip ${isActive ? "chip-primary" : ""}`}>{isActive ? "فعال" : "غیرفعال"}</span>
              {typeof membersCount === "number" && <span className="chip">اعضا: {membersCount}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {game?.official_url && <a href={game.official_url} target="_blank" rel="noreferrer" className="btn">سایت رسمی</a>}
            {game?.website && <a href={game.website} target="_blank" rel="noreferrer" className="btn-ghost">Website</a>}
            {game?.youtube && <a href={game.youtube} target="_blank" rel="noreferrer" className="btn-ghost">YouTube</a>}
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-bold mb-2">معرفی بازی</h2>
        <p className="opacity-80">{desc || "معرفی این بازی هنوز ثبت نشده."}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">کلن‌های این بازی</h3>
            <Link className="btn-ghost text-sm" href="/admin?m=clans">مدیریت</Link>
          </div>
          {clans.length === 0 ? (
            <div className="opacity-70">کلنی ثبت نشده.</div>
          ) : (
            <ul className="grid gap-2">
              {clans.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="size-8 rounded bg-white/10 overflow-hidden">
                    {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-cover" alt="" /> : null}
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
            <Link className="btn-ghost text-sm" href="/admin?m=highlights">مدیریت</Link>
          </div>
          {youtubers.length === 0 ? (
            <div className="opacity-70">فعلاً چیزی ثبت نشده.</div>
          ) : (
            <ul className="grid gap-2">
              {youtubers.map((y) => (
                <li key={y.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{y.username || y.user_id || "user"}</div>
                    {y.reason ? <div className="opacity-70 text-sm">{y.reason}</div> : null}
                  </div>
                  <span className="chip ltr">{y.week_start}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">ایونت‌های این بازی</h3>
          <Link className="btn-ghost text-sm" href="/admin?m=tournaments">مدیریت</Link>
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
                {events.map((ev) => {
                  const { start, end } = pickEventWindow(ev);
                  return (
                    <tr key={ev.id} className="border-t border-neutral-800">
                      <td className="p-2">{ev.title}</td>
                      <td className="p-2">{ev.status}</td>
                      <td className="p-2 ltr">
                        {start ? new Date(start).toLocaleString() : "—"}
                        {end ? ` → ${new Date(end).toLocaleString()}` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
                    <td className="p-2">{r.profiles?.username || r.user_id}</td>
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
