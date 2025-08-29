"use client";

import {useEffect, useMemo, useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {supabase} from "@/lib/supabaseClient";

const BANNERS_BUCKET = "game-banners";

/** ———— Types kept lightweight to avoid tight-coupling with db.ts ———— */
type Game = {
  id: number | string;
  slug: string;
  title: string;
  active: boolean;
  description?: string | null;
  official_url?: string | null;
  banner_path?: string | null;  // storage path or http url
};

type Clan = { id: string; name: string; tag: string | null; logo_url: string | null };
type Tournament = {
  id: string; title: string; status: "upcoming"|"active"|"finished";
  starts_at?: string | null;   // might be null in db
  ends_at?: string | null;
  start_date?: string | null;  // in case your schema uses *_date
  end_date?: string | null;
};

type LeaderRow = { user_id: string; total_score: number; rank_global: number | null };
type ProfileLite = { id: string; username: string | null; avatar_url: string | null };
type Highlight = { id: number; week_start: string; user_id: string | null; reason: string | null };

function safeDateStr(x?: string | null) {
  if (!x) return null;
  // supports both full timestamps and YYYY-MM-DD
  try { return new Date(x).toISOString(); } catch { try { return new Date(`${x}T00:00:00Z`).toISOString(); } catch { return null; } }
}
function pickWindow(t: Tournament) {
  const s = t.starts_at || t.start_date;
  const e = t.ends_at || t.end_date;
  return {
    startISO: safeDateStr(s),
    endISO: safeDateStr(e),
  };
}

export default function GameBySlugPage() {
  const p = useParams<{ slug: string }>();
  const slug = Array.isArray(p.slug) ? p.slug[0] : p.slug;

  // tabs
  const tabs = ["overview","clans","events","creators","leaderboard","members"] as const;
  type Tab = typeof tabs[number];
  const [tab, setTab] = useState<Tab>("overview");

  // data
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const [clans, setClans] = useState<Clan[]>([]);
  const [events, setEvents] = useState<Tournament[]>([]);
  const [leader, setLeader] = useState<(LeaderRow & { profile?: ProfileLite | null })[]>([]);
  const [creators, setCreators] = useState<(Highlight & { profile?: ProfileLite | null })[]>([]);

  const [membersCount, setMembersCount] = useState<number>(0);
  const [members, setMembers] = useState<ProfileLite[]>([]);
  const [latestMember, setLatestMember] = useState<ProfileLite | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!slug) return;
      setLoading(true);

      // 1) GAME (by slug)
      const gq = await supabase
        .from("games")
        .select("id,slug,title,active,description,official_url,banner_path")
        .eq("slug", slug)
        .maybeSingle();

      if (!gq.error && gq.data) {
        const g = gq.data as Game;
        if (ignore) return;
        setGame(g);

        // banner
        if (g.banner_path) {
          if (g.banner_path.startsWith("http")) setBannerUrl(g.banner_path);
          else {
            const { data: signed } = await supabase.storage.from(BANNERS_BUCKET)
              .createSignedUrl(g.banner_path, 3600);
            if (!ignore) setBannerUrl(signed?.signedUrl || null);
          }
        } else setBannerUrl(null);

        // 2) CLANS for game
        const cq = await supabase
          .from("clans")
          .select("id,name,tag,logo_url")
          .eq("game_id", g.id)
          .order("name", { ascending: true });
        if (!ignore) setClans((cq.data as Clan[]) || []);

        // 3) EVENTS (active+upcoming)
        const eq = await supabase
          .from("tournaments")
          .select("id,title,status,starts_at,ends_at,start_date,end_date")
          .eq("game_id", g.id)
          .in("status", ["upcoming","active"])
          .order("starts_at", { ascending: true });
        if (!ignore) setEvents((eq.data as Tournament[]) || []);

        // 4) LEADERBOARD (fetch rows, then profiles in second call) — no REST join
        const lq = await supabase
          .from("leaderboard")
          .select("user_id,total_score,rank_global")
          .eq("game_id", g.id)
          .order("total_score", { ascending: false })
          .limit(20);
        let lr: LeaderRow[] = (lq.data as LeaderRow[]) || [];
        let leaderWithProfiles: (LeaderRow & { profile?: ProfileLite | null })[] = lr;
        if (lr.length) {
          const ids = lr.map(x => x.user_id);
          const { data: profs } = await supabase
            .from("profiles")
            .select("id,username,avatar_url")
            .in("id", ids);
          const map = new Map((profs || []).map(p => [p.id, p as ProfileLite]));
          leaderWithProfiles = lr.map(x => ({ ...x, profile: map.get(x.user_id) || null }));
        }
        if (!ignore) setLeader(leaderWithProfiles);

        // 5) CREATORS (weekly_highlights where type='youtuber' & game_id=? or null)
        const hq = await supabase
          .from("weekly_highlights")
          .select("id,week_start,user_id,reason,game_id,type")
          .eq("type", "youtuber")
          .or(`game_id.eq.${g.id},game_id.is.null`)
          .order("week_start", { ascending: false })
          .limit(12);

        let hs: Highlight[] = [];
        if (!hq.error && hq.data) hs = (hq.data as any[]).map(x => ({
          id: x.id, week_start: x.week_start, user_id: x.user_id, reason: x.reason
        }));

        if (hs.length) {
          const uids = hs.map(h => h.user_id).filter(Boolean) as string[];
          const { data: profs } = await supabase
            .from("profiles")
            .select("id,username,avatar_url")
            .in("id", uids);
          const map = new Map((profs || []).map(p => [p.id, p as ProfileLite]));
          const merged = hs.map(h => ({ ...h, profile: h.user_id ? (map.get(h.user_id) || null) : null }));
          if (!ignore) setCreators(merged);
        } else {
          if (!ignore) setCreators([]);
        }

        // 6) MEMBERS
        //   تعریف: هر کاربری که در هر تورنمنتی از این بازی شرکت کرده → عضو
        //   (چون selected_games در جدول profiles نداری)
        const tq = await supabase
          .from("tournaments")
          .select("id")
          .eq("game_id", g.id);

        const tids = (tq.data as {id:string}[] | null)?.map(x => x.id) || [];

        // count (head)
        if (tids.length) {
          const { count } = await supabase
            .from("tournament_participants")
            .select("user_id", { head: true, count: "exact" })
            .in("tournament_id", tids);
          if (!ignore) setMembersCount(count || 0);

          // latest member: بر اساس جدیدترین created_at اگر ستون نبود، ساده‌ترین راه: یک ردیف بگیر
          const latestQ = await supabase
            .from("tournament_participants")
            .select("user_id,created_at")
            .in("tournament_id", tids)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!latestQ.error && latestQ.data?.user_id) {
            const { data: p } = await supabase
              .from("profiles")
              .select("id,username,avatar_url")
              .eq("id", latestQ.data.user_id)
              .maybeSingle();
            if (!ignore) setLatestMember((p as ProfileLite) || null);
          } else {
            if (!ignore) setLatestMember(null);
          }

          // members list (distinct 24 ids → profiles)
          const listQ = await supabase
            .from("tournament_participants")
            .select("user_id")
            .in("tournament_id", tids)
            .limit(2000);

          const uniq = Array.from(new Set((listQ.data || []).map((r:any)=>r.user_id))).slice(0, 24);
          if (uniq.length) {
            const { data: profs } = await supabase
              .from("profiles")
              .select("id,username,avatar_url")
              .in("id", uniq);
            if (!ignore) setMembers((profs as ProfileLite[]) || []);
          } else {
            if (!ignore) setMembers([]);
          }
        } else {
          if (!ignore) {
            setMembersCount(0);
            setMembers([]);
            setLatestMember(null);
          }
        }
      } else {
        // not found by slug → state clean
        if (!ignore) {
          setGame(null);
          setBannerUrl(null);
          setClans([]); setEvents([]); setLeader([]); setCreators([]);
          setMembers([]); setMembersCount(0); setLatestMember(null);
        }
      }

      if (!ignore) setLoading(false);
    })();
    return () => { ignore = true; };
  }, [slug]);

  const desc = game?.description?.trim() || null;

  // ———— UI ————
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* HERO */}
      <section className="card overflow-hidden p-0">
        <div className="w-full aspect-[21/9] bg-black/30">
          {bannerUrl ? (
            <img src={bannerUrl} alt={game?.title || "game"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center opacity-60 text-sm">بدون بنر</div>
          )}
        </div>
        <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{game?.title || "—"}</h1>
            <div className="text-sm opacity-70 mt-1 flex gap-2 flex-wrap">
              <span className={`chip ${game?.active ? "chip-primary" : ""}`}>{game?.active ? "فعال" : "غیرفعال"}</span>
              <span className="chip">اعضا: {membersCount}</span>
              {latestMember && <span className="chip">آخرین عضو: {latestMember.username ?? latestMember.id.slice(0,6)}</span>}
            </div>
          </div>
          {game?.official_url && (
            <a href={game.official_url} target="_blank" className="btn" rel="noreferrer">سایت رسمی</a>
          )}
        </div>
      </section>

      {/* TABS */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button
              key={t}
              className={`chip cursor-pointer ${tab===t ? "chip-primary" : ""}`}
              onClick={()=>setTab(t)}
            >
              {t==="overview" ? "مرور" :
               t==="clans" ? "کلن‌ها" :
               t==="events" ? "ایونت‌ها" :
               t==="creators" ? "یوتیوبرها" :
               t==="leaderboard" ? "لیدربورد" :
               "اعضا"}
            </button>
          ))}
        </div>
      </div>

      {/* PANELS */}
      {tab === "overview" && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <h3 className="font-bold mb-2">معرفی بازی</h3>
            <p className="opacity-80">{desc || "معرفی این بازی هنوز ثبت نشده."}</p>
          </div>
          <div className="card p-4">
            <h3 className="font-bold mb-2">وضعیت</h3>
            <ul className="grid gap-2 text-sm opacity-80">
              <li>شناسه: <span className="ltr">{game?.id ?? "—"}</span></li>
              <li>اسلاگ: <span className="ltr">{game?.slug ?? "—"}</span></li>
              <li>فعال: {game?.active ? "بله" : "خیر"}</li>
              <li>وب‌سایت رسمی: {game?.official_url ? <a className="link" href={game.official_url} target="_blank">مشاهده</a> : "—"}</li>
            </ul>
          </div>
        </section>
      )}

      {tab === "clans" && (
        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">کلن‌های این بازی</h3>
            <Link className="btn-ghost text-sm" href="/admin?m=clans">مدیریت</Link>
          </div>
          {clans.length === 0 ? (
            <div className="opacity-70">کلنی ثبت نشده.</div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clans.map(c => (
                <li key={c.id} className="flex items-center gap-3 card p-3">
                  <span className="size-10 rounded bg-white/10 overflow-hidden shrink-0">
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
                  {events.map(ev => {
                    const w = pickWindow(ev);
                    return (
                      <tr key={ev.id} className="border-t border-neutral-800">
                        <td className="p-2">{ev.title}</td>
                        <td className="p-2">{ev.status}</td>
                        <td className="p-2 ltr">
                          {w.startISO ? new Date(w.startISO).toLocaleString() : "—"}
                          {w.endISO ? ` → ${new Date(w.endISO).toLocaleString()}` : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "creators" && (
        <section className="card p-4">
          <h3 className="font-bold mb-3">یوتیوبرهای سایت</h3>
          {creators.length === 0 ? (
            <div className="opacity-70">فعلاً چیزی ثبت نشده.</div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {creators.map(y => (
                <li key={y.id} className="card p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="size-10 rounded bg-white/10 overflow-hidden shrink-0">
                      {y.profile?.avatar_url ? <img src={y.profile.avatar_url} className="w-full h-full object-cover" alt="" /> : null}
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
                    <tr key={`${r.user_id}-${i}`} className="border-t border-neutral-800">
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
          <h3 className="font-bold mb-3">اعضای این بازی</h3>
          {members.length === 0 ? (
            <div className="opacity-70">فعلاً عضویتی ثبت نشده.</div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map(m => (
                <li key={m.id} className="card p-3 flex items-center gap-3">
                  <span className="size-10 rounded bg-white/10 overflow-hidden shrink-0">
                    {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" /> : null}
                  </span>
                  <div className="font-medium">{m.username || m.id}</div>
                  {/* اینجا جای دکمهٔ فرند ریکوئست در آینده */}
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
