"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

/** ====== Types kept lightweight & tolerant to schema drift ====== */
type Game = {
  id: string | number;
  slug: string;
  title: string;
  active: boolean | null;
  description?: string | null;
  official_url?: string | null;
  banner_path?: string | null;
  banner_url?: string | null; // public URL (if any)
};

type Clan = { id: string; name: string; tag: string | null; logo_url: string | null };

type Tournament = {
  id: string;
  title: string;
  status: "upcoming" | "active" | "finished";
  starts_at?: string | null;
  ends_at?: string | null;
};

type LeaderRow = { user_id: string; total_score: number; rank_global: number | null };
type ProfileLite = { id: string; username: string | null; avatar_url: string | null };

type Highlight = { id: number; week_start: string; user_id: string | null; reason: string | null };

/** ====== Storage config ====== */
const BANNERS_BUCKET = "game-banners";

/** Create signed URL for storage path or pass-through public URL */
async function resolveBanner(path?: string | null, url?: string | null) {
  if (url && url.startsWith("http")) return url;
  if (path) {
    const { data, error } = await supabase.storage
      .from(BANNERS_BUCKET)
      .createSignedUrl(path, 3600);
    if (!error) return data?.signedUrl ?? null;
  }
  return null;
}

/** Best-effort ISO -> human */
function fmt(dt?: string | null) {
  if (!dt) return "";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

export default function GameBySlugPage() {
  const p = useParams<{ slug: string }>();
  const slug = Array.isArray(p.slug) ? p.slug[0] : p.slug;

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const [clans, setClans] = useState<Clan[]>([]);
  const [events, setEvents] = useState<Tournament[]>([]);
  const [leader, setLeader] = useState<(LeaderRow & { profile?: ProfileLite | null })[]>([]);
  const [youtubers, setYoutubers] = useState<(Highlight & { profile?: ProfileLite | null })[]>([]);
  const [members, setMembers] = useState<ProfileLite[]>([]);
  const [membersCount, setMembersCount] = useState<number>(0);

  // Tabs
  const tabs = ["overview", "clans", "events", "creators", "leaderboard", "members"] as const;
  type Tab = typeof tabs[number];
  const [tab, setTab] = useState<Tab>("overview");

  /** Fetch everything (defensive: no FK joins in a single select → no 400) */
  useEffect(() => {
    let ignore = false;

    (async () => {
      setLoading(true);

      // 1) Game by slug
      const gq = await supabase
        .from("games")
        .select("id,slug,title,active,description,official_url,banner_path,banner_url")
        .eq("slug", slug)
        .maybeSingle();

      if (ignore) return;

      if (gq.error || !gq.data) {
        setGame(null);
        setLoading(false);
        return;
      }

      const g = gq.data as Game;
      setGame(g);

      // banner
      const b = await resolveBanner(g.banner_path, g.banner_url);
      if (ignore) return;
      setBannerUrl(b);

      // 2) Clans
      const cq = await supabase
        .from("clans")
        .select("id,name,tag,logo_url,game_id")
        .eq("game_id", g.id)
        .order("name");
      if (!ignore && !cq.error) {
        setClans(((cq.data as any[]) || []).map(c => ({
          id: String(c.id),
          name: c.name ?? "",
          tag: c.tag ?? null,
          logo_url: c.logo_url ?? null
        })));
      }

      // 3) Events (active + upcoming)
      const eq = await supabase
        .from("tournaments")
        .select("id,title,status,starts_at,ends_at,game_id")
        .eq("game_id", g.id)
        .in("status", ["upcoming", "active"])
        .order("starts_at");
      if (!ignore && !eq.error) setEvents((eq.data as Tournament[]) || []);

      // 4) Leaderboard (no FK join; fetch profiles separately)
      const lq = await supabase
        .from("leaderboard")
        .select("user_id,total_score,rank_global,game_id")
        .eq("game_id", g.id)
        .order("total_score", { ascending: false })
        .limit(20);
      let leaderRows: LeaderRow[] = !lq.error ? ((lq.data as LeaderRow[]) || []) : [];
      let leaderProfiles: ProfileLite[] = [];
      if (leaderRows.length) {
        const ids = Array.from(new Set(leaderRows.map(r => r.user_id)));
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,username,avatar_url")
          .in("id", ids);
        leaderProfiles = (profs as ProfileLite[]) || [];
      }
      if (!ignore) {
        setLeader(
          leaderRows.map(r => ({
            ...r,
            profile: leaderProfiles.find(p => p.id === r.user_id) || null
          }))
        );
      }

      // 5) Creators (weekly_highlights type=youtuber + attach profile)
      const hq = await supabase
        .from("weekly_highlights")
        .select("id,week_start,user_id,reason,game_id,type")
        .eq("type", "youtuber")
        .eq("game_id", g.id)
        .order("week_start", { ascending: false })
        .limit(12);
      let highs: Highlight[] = !hq.error ? ((hq.data as any[]) || []).map(x => ({
        id: x.id, week_start: x.week_start, user_id: x.user_id, reason: x.reason
      })) : [];
      if (highs.length) {
        const ids = Array.from(new Set(highs.map(x => x.user_id).filter(Boolean))) as string[];
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,username,avatar_url")
          .in("id", ids);
        const map = new Map((profs as ProfileLite[]).map(p => [p.id, p]));
        highs = highs.map(h => ({ ...h, profile: h.user_id ? map.get(h.user_id) ?? null : null }));
      }
      if (!ignore) setYoutubers(highs);

      // 6) Members & count (unique participants of this game's tournaments) – safe without views
      const tq = await supabase.from("tournaments").select("id").eq("game_id", g.id);
      if (!tq.error) {
        const tids = ((tq.data as { id: string }[]) || []).map(x => x.id);
        if (tids.length) {
          // Count
          const { count } = await supabase
            .from("tournament_participants")
            .select("user_id", { count: "exact", head: true })
            .in("tournament_id", tids);
          if (!ignore) setMembersCount(count ?? 0);

          // Latest members (last 12 distinct by created_at/inserted_at best-effort)
          const pq = await supabase
            .from("tournament_participants")
            .select("user_id,created_at,inserted_at,tournament_id")
            .in("tournament_id", tids)
            .order("created_at", { ascending: false })
            .limit(40); // then dedup
          if (!pq.error) {
            const seen = new Set<string>();
            const latestIds: string[] = [];
            for (const r of (pq.data as any[])) {
              const uid = String(r.user_id);
              if (!seen.has(uid)) {
                seen.add(uid);
                latestIds.push(uid);
              }
              if (latestIds.length >= 12) break;
            }
            if (latestIds.length) {
              const { data: profs } = await supabase
                .from("profiles")
                .select("id,username,avatar_url")
                .in("id", latestIds);
              if (!ignore) setMembers((profs as ProfileLite[]) || []);
            } else if (!ignore) {
              setMembers([]);
            }
          }
        } else {
          if (!ignore) {
            setMembersCount(0);
            setMembers([]);
          }
        }
      }

      setLoading(false);
    })();

    return () => {
      ignore = true;
    };
  }, [slug]);

  const desc = (game?.description ?? "").trim();
  const tabsUi = (
    <div className="flex flex-wrap gap-2">
      {tabs.map(t => (
        <button
          key={t}
          className={`chip ${tab === t ? "chip-primary" : ""}`}
          onClick={() => setTab(t)}
        >
          {t === "overview" ? "مرور" :
           t === "clans" ? "کلن‌ها" :
           t === "events" ? "ایونت‌ها" :
           t === "creators" ? "یوتیوبرها" :
           t === "leaderboard" ? "لیدربورد" : "اعضا"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* بنر + عنوان */}
      <section className="card overflow-hidden p-0">
        <div className="w-full aspect-[21/9] bg-black/30">
          {bannerUrl ? (
            <img src={bannerUrl} alt={game?.title || "banner"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-60">
              بدون بنر
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{game?.title || "—"}</h1>
            <div className="text-sm opacity-80 mt-1 flex gap-2 flex-wrap">
              <span className={`chip ${game?.active ? "chip-primary" : ""}`}>
                {game?.active ? "فعال" : "غیرفعال"}
              </span>
              <span className="chip">اعضا: {membersCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {game?.official_url && (
              <a href={game.official_url} target="_blank" rel="noreferrer" className="btn">
                سایت رسمی
              </a>
            )}
          </div>
        </div>
      </section>

      {/* تب‌ها */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <div className="font-bold">تب‌ها</div>
          {tabsUi}
        </div>
      </section>

      {/* محتوا */}
      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <h3 className="font-bold mb-2">معرفی بازی</h3>
            <p className="opacity-80">{desc || "معرفی این بازی هنوز ثبت نشده."}</p>
          </div>
          <div className="card p-4">
            <h3 className="font-bold mb-2">ایونت‌های فعال/آتی</h3>
            {events.length === 0 ? (
              <div className="opacity-70">ایونتی در حال حاضر نیست.</div>
            ) : (
              <ul className="space-y-2">
                {events.map(ev => (
                  <li key={ev.id} className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <div className="font-medium">{ev.title}</div>
                    <div className="text-sm opacity-80 ltr">
                      {fmt(ev.starts_at)} {ev.ends_at ? `→ ${fmt(ev.ends_at)}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "clans" && (
        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">کلن‌های این بازی</h3>
            <Link href="/admin?m=clans" className="btn-ghost text-sm">مدیریت</Link>
          </div>
          {clans.length === 0 ? (
            <div className="opacity-70">کلنی ثبت نشده.</div>
          ) : (
            <ul className="grid gap-3">
              {clans.map(c => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="size-10 rounded bg-white/10 overflow-hidden">
                    {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-cover" alt="" /> : null}
                  </span>
                  <div className="font-medium">
                    {c.name} {c.tag ? <span className="opacity-60">({c.tag})</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "events" && (
        <section className="card p-4">
          <h3 className="font-bold mb-3">رویدادها</h3>
          {events.length === 0 ? (
            <div className="opacity-70">رویدادی وجود ندارد.</div>
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
                        {fmt(ev.starts_at)} {ev.ends_at ? `→ ${fmt(ev.ends_at)}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "creators" && (
        <section className="card p-4">
          <h3 className="font-bold mb-3">یوتیوبرهای سایت</h3>
          {youtubers.length === 0 ? (
            <div className="opacity-70">فعلاً چیزی ثبت نشده.</div>
          ) : (
            <ul className="grid gap-2">
              {youtubers.map(y => (
                <li key={y.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="size-8 rounded bg-white/10 overflow-hidden">
                      {y.profile?.avatar_url ? (
                        <img src={y.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : null}
                    </span>
                    <div>
                      <div className="font-medium">{y.profile?.username || y.user_id || "user"}</div>
                      {y.reason ? <div className="opacity-70 text-sm">{y.reason}</div> : null}
                    </div>
                  </div>
                  <span className="chip ltr">{y.week_start}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "leaderboard" && (
        <section className="card p-4">
          <h3 className="font-bold mb-3">لیدربورد</h3>
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
                      <td className="p-2">{r.profile?.username || r.user_id}</td>
                      <td className="p-2">{r.total_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "members" && (
        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">اعضای اخیر</h3>
            <span className="chip">تعداد کل: {membersCount}</span>
          </div>
          {members.length === 0 ? (
            <div className="opacity-70">لیستی برای نمایش نیست.</div>
          ) : (
            <ul className="grid gap-2">
              {members.map(u => (
                <li key={u.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="size-8 rounded bg-white/10 overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : null}
                    </span>
                    <div className="font-medium">{u.username || u.id}</div>
                  </div>
                  {/* جای دکمه‌های دوستی/فالو آینده */}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {loading && <div className="card p-4">در حال بارگذاری…</div>}
    </div>
  );
}
