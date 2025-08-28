"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BANNERS_BUCKET = "game-banners"; // اگر اسم باکت فرق داره عوضش کن

type Game = {
  id: string;
  title: string;
  active: boolean;
  banner_path?: string | null;
  description?: string | null;
  official_url?: string | null;
};

type Clan = { id: string; name: string; tag: string | null; logo_url: string | null };
type Highlight = { id: number; week_start: string; user_id: string | null; reason: string | null };
type Profile = { id: string; username: string | null };
type Tournament = {
  id: string;
  title: string;
  status: "upcoming" | "active" | "finished";
  starts_at: string;
  ends_at: string | null;
};

// 🔧 username اختیاری شد تا با خروجی Supabase جور باشد
type LeaderRow = {
  user_id: string;
  total_score: number;
  rank_global: number | null;
  profiles: { username?: string | null } | null;
};

export default function GameDetailPage() {
  // ✅ Next 15+: در کلاینت params را با useParams بگیر (خطای Promise حل می‌شود)
  const p = useParams<{ id: string }>();
  const gameId = Array.isArray(p.id) ? p.id[0] : p.id;

  const [game, setGame] = useState<Game | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const [clans, setClans] = useState<Clan[]>([]);
  const [youtubers, setYoutubers] = useState<(Highlight & { profile: Profile | null })[]>([]);
  const [events, setEvents] = useState<Tournament[]>([]);
  const [leader, setLeader] = useState<LeaderRow[]>([]);
  const [membersCount, setMembersCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!gameId) return;
      setLoading(true);

      // 1) خود بازی
      const gq = supabase
        .from("games")
        .select("id,title,active,banner_path,description,official_url")
        .eq("id", gameId)
        .maybeSingle();

      // 2) کلن‌ها
      const cq = supabase
        .from("clans")
        .select("id,name,tag,logo_url")
        .eq("game_id", gameId)
        .order("name");

      // 3) هایلایت‌های یوتیوبر مرتبط
      const hq = supabase
        .from("weekly_highlights")
        .select("id,week_start,user_id,reason")
        .eq("type", "youtuber")
        .eq("game_id", gameId)
        .order("week_start", { ascending: false })
        .limit(12);

      // 4) ایونت‌ها (تورنمنت‌های active/upcoming)
      const eq = supabase
        .from("tournaments")
        .select("id,title,status,starts_at,ends_at")
        .eq("game_id", gameId)
        .in("status", ["upcoming", "active"])
        .order("starts_at");

      // 5) لیدربورد
      const lq = supabase
        .from("leaderboard")
        .select("user_id,total_score,rank_global,profiles!inner(username)")
        .eq("game_id", gameId)
        .order("total_score", { ascending: false })
        .limit(20);

      // 6) شناسهٔ تورنمنت‌ها برای شمارش اعضا
      const tq = supabase
        .from("tournaments")
        .select("id")
        .eq("game_id", gameId);

      const [g, c, h, e, l, t] = await Promise.all([gq, cq, hq, eq, lq, tq]);
      if (ignore) return;

      if (!g.error) setGame(g.data as Game);
      if (!c.error) setClans((c.data as Clan[]) || []);
      if (!e.error) setEvents((e.data as Tournament[]) || []);
      if (!l.error) setLeader((l.data as LeaderRow[]) || []);

      // اتصال هایلایت‌ها به پروفایل‌ها
      if (!h.error) {
        const list = (h.data as Highlight[]) || [];
        if (list.length) {
          const userIds = list.map(x => x.user_id).filter(Boolean) as string[];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id,username")
            .in("id", userIds);
          const merged = list.map(x => ({
            ...x,
            profile: profiles?.find(p => p.id === x.user_id) || null,
          }));
          setYoutubers(merged);
        } else {
          setYoutubers([]);
        }
      }

      // امضای بنر
      if (!g.error && g.data?.banner_path) {
        if (g.data.banner_path.startsWith("http")) {
          setBannerUrl(g.data.banner_path);
        } else {
          const { data: signed } = await supabase.storage
            .from(BANNERS_BUCKET)
            .createSignedUrl(g.data.banner_path, 3600);
          setBannerUrl(signed?.signedUrl || null);
        }
      } else {
        setBannerUrl(null);
      }

      // شمارش اعضا: تعداد یکتا از شرکت‌کننده‌های تورنمنت‌های این گیم
      if (!t.error) {
        const ids = (t.data as { id: string }[]).map(x => x.id);
        if (ids.length) {
          const { count } = await supabase
            .from("tournament_participants")
            .select("user_id", { count: "exact", head: true })
            .in("tournament_id", ids);
          setMembersCount(count ?? 0);
        } else {
          setMembersCount(0);
        }
      }

      setLoading(false);
    })();
    return () => { ignore = true; };
  }, [gameId]);

  const desc = game?.description?.trim();

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* بنر + عنوان */}
      <section className="card overflow-hidden p-0">
        <div className="w-full aspect-[21/9] bg-black/30">
          {bannerUrl ? (
            <img src={bannerUrl} alt={game?.title || "game"} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{game?.title || "—"}</h1>
            <div className="text-sm opacity-70 mt-1 flex gap-2 flex-wrap">
              <span className={`chip ${game?.active ? "chip-primary" : ""}`}>{game?.active ? "فعال" : "غیرفعال"}</span>
              {typeof membersCount === "number" && <span className="chip">اعضا: {membersCount}</span>}
            </div>
          </div>
          {game?.official_url && (
            <a href={game.official_url} target="_blank" className="btn" rel="noreferrer">سایت رسمی</a>
          )}
        </div>
      </section>

      {/* معرفی رسمی */}
      <section className="card p-4">
        <h2 className="font-bold mb-2">معرفی بازی</h2>
        <p className="opacity-80">{desc || "معرفی این بازی هنوز ثبت نشده."}</p>
      </section>

      {/* کلن‌ها + یوتیوبرها */}
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
              {clans.map(c => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="size-8 rounded bg-white/10 overflow-hidden">
                    {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-cover" alt="" /> : null}
                  </span>
                  <div className="font-medium">{c.name} {c.tag ? <span className="opacity-60">({c.tag})</span> : null}</div>
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
              {youtubers.map(y => (
                <li key={y.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{y.profile?.username || y.user_id || "user"}</div>
                    {y.reason ? <div className="opacity-70 text-sm">{y.reason}</div> : null}
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
                {events.map(ev => (
                  <tr key={ev.id} className="border-t border-neutral-800">
                    <td className="p-2">{ev.title}</td>
                    <td className="p-2">{ev.status}</td>
                    <td className="p-2 ltr">
                      {new Date(ev.starts_at).toLocaleString()}
                      {ev.ends_at ? ` → ${new Date(ev.ends_at).toLocaleString()}` : ""}
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
