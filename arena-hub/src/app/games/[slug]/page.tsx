"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BANNERS_BUCKET = "game-banners"; // اگر متفاوت است عوضش کن

type Game = {
  id: string;
  slug: string;
  title: string;
  active: boolean;
  banner_path?: string | null;
  description?: string | null;
  official_url?: string | null;
};

type Clan   = { id: string; name: string; tag: string | null; logo_url: string | null };
type Profile= { id: string; username: string | null; avatar_url?: string | null };
type Highlight = { id: number; week_start: string; user_id: string | null; reason: string | null };
type Tournament = {
  id: string;
  title: string;
  status: "upcoming" | "active" | "finished";
  starts_at: string;
  ends_at: string | null;
};

type LeaderRow = {
  user_id: string;
  total_score: number;
  rank_global: number | null;
  profiles: { username?: string | null } | null;
};

type MemberRow = {
  user_id: string;
  created_at: string;
  profiles: { username: string | null; avatar_url: string | null } | null;
};

export default function GameBySlugPage() {
  // Next 15: useParams (بدون دست زدن مستقیم به props)
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const [clans, setClans] = useState<Clan[]>([]);
  const [youtubers, setYoutubers] = useState<(Highlight & { profile: Profile | null })[]>([]);
  const [events, setEvents] = useState<Tournament[]>([]);
  const [leader, setLeader] = useState<LeaderRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersCount, setMembersCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);

  // —————————————————————— load
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!slug) return;
      setLoading(true);

      // 0) بازی با اسلاگ
      const gq = supabase
        .from("games")
        .select("id,slug,title,active,banner_path,description,official_url")
        .eq("slug", slug)
        .maybeSingle();

      const g = await gq;
      if (ignore) return;

      if (g.error || !g.data) {
        // اگر اسلاگ غلط بود: برگرد به لیست
        router.replace("/games");
        return;
      }
      const gameData = g.data as Game;
      setGame(gameData);

      // 1) امضای بنر (اگر مسیر استورج بود)
      if (gameData.banner_path) {
        if (gameData.banner_path.startsWith("http")) {
          setBannerUrl(gameData.banner_path);
        } else {
          const { data: signed } = await supabase
            .storage.from(BANNERS_BUCKET)
            .createSignedUrl(gameData.banner_path, 3600);
          setBannerUrl(signed?.signedUrl || null);
        }
      } else {
        setBannerUrl(null);
      }

      // 2) کلن‌ها
      const { data: clansData } = await supabase
        .from("clans")
        .select("id,name,tag,logo_url")
        .eq("game_id", gameData.id)
        .order("name");
      setClans((clansData as Clan[]) || []);

      // 3) یوتیوبرها (هایلایت type=youtuber)
      const { data: hl } = await supabase
        .from("weekly_highlights")
        .select("id,week_start,user_id,reason")
        .eq("type", "youtuber")
        .eq("game_id", gameData.id)
        .order("week_start", { ascending: false })
        .limit(12);
      const list = (hl as Highlight[]) || [];
      if (list.length) {
        const uids = list.map(x => x.user_id).filter(Boolean) as string[];
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,username");
        const merged = list.map(x => ({
          ...x,
          profile: profs?.find(p => p.id === x.user_id) || null,
        }));
        setYoutubers(merged);
      } else {
        setYoutubers([]);
      }

      // 4) ایونت‌ها
      const { data: ev } = await supabase
        .from("tournaments")
        .select("id,title,status,starts_at,ends_at")
        .eq("game_id", gameData.id)
        .in("status", ["upcoming", "active"])
        .order("starts_at");
      setEvents((ev as Tournament[]) || []);

      // 5) لیدربورد
      const { data: lb } = await supabase
        .from("leaderboard")
        .select("user_id,total_score,rank_global,profiles!inner(username)")
        .eq("game_id", gameData.id)
        .order("total_score", { ascending: false })
        .limit(20);
      setLeader((lb as LeaderRow[]) || []);

      // 6) اعضای این بازی (جدول شما: g_game_members – با جوین پروفایل‌ها)
      const { data: mem, count } = await supabase
        .from("g_game_members")
        .select("user_id,created_at,profiles!inner(username,avatar_url)", { count: "exact" })
        .eq("game_id", gameData.id)
        .order("created_at", { ascending: false })
        .limit(24);
      setMembers((mem as MemberRow[]) || []);
      setMembersCount(count ?? 0);

      setLoading(false);
    })();
    return () => { ignore = true; };
  }, [slug, router]);

  const desc = useMemo(() => (game?.description || "").trim(), [game]);

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
            <div className="text-sm opacity-80 mt-1 flex gap-2 flex-wrap">
              <span className={`chip ${game?.active ? "chip-primary" : ""}`}>{game?.active ? "فعال" : "غیرفعال"}</span>
              <span className="chip">اعضا: {membersCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {game?.official_url && (
              <a href={game.official_url} target="_blank" rel="noreferrer" className="btn">
                سایت رسمی
              </a>
            )}
            <Link className="btn-ghost" href="/games">همهٔ بازی‌ها</Link>
          </div>
        </div>
      </section>

      {/* معرفی رسمی */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">معرفی بازی</h2>
          <Link className="text-sm btn-ghost" href={`/admin?m=games`}>ویرایش</Link>
        </div>
        <p className="opacity-90 mt-2">{desc || "معرفی این بازی هنوز ثبت نشده."}</p>
      </section>

      {/* کلن‌ها + یوتیوبرها */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Clans */}
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
                  <div className="font-medium">
                    {c.name} {c.tag ? <span className="opacity-60">({c.tag})</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* YouTubers */}
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

      {/* اعضا + لیدربورد */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Members */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">اعضای این بازی</h3>
            <span className="chip ltr">{membersCount} نفر</span>
          </div>
          {members.length === 0 ? (
            <div className="opacity-70">هنوز عضویتی ثبت نشده.</div>
          ) : (
            <ul className="grid gap-2">
              {members.map(m => (
                <li key={m.user_id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="size-8 rounded-full overflow-hidden bg-white/10">
                      {m.profiles?.avatar_url
                        ? <img src={m.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                        : null}
                    </span>
                    <div className="font-medium">{m.profiles?.username || m.user_id}</div>
                  </div>
                  {/* جای دکمه ریکوئست دوست */}
                  <button className="btn-ghost text-sm">درخواست دوستی</button>
                </li>
              ))}
            </ul>
          )}
          {members.length > 0 && (
            <div className="opacity-70 text-xs mt-3 ltr">
              آخرین عضو: {new Date(members[0].created_at).toLocaleString()}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="card p-4">
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
        </div>
      </section>

      {loading && <div className="card p-4">در حال بارگذاری…</div>}
    </div>
  );
}


