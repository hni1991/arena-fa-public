"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Game, Clan, Tournament, LeaderRow, Highlight, Profile } from "@/types/db";

const BANNERS_BUCKET = "game-banners";

type TabKey = "overview" | "clans" | "members" | "events" | "leaderboard";

export default function GameDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [game, setGame] = useState<Game | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const [clans, setClans] = useState<Clan[]>([]);
  const [youtubers, setYoutubers] = useState<(Highlight & { profile: Profile | null })[]>([]);
  const [events, setEvents] = useState<Tournament[]>([]);
  const [leader, setLeader] = useState<LeaderRow[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [latestMember, setLatestMember] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!slug) return;
      setLoading(true);

      // 1) بازی
      const gq = await supabase
        .from("games")
        .select("id,slug,title,active,banner_path,banner_url,description,official_url")
        .eq("slug", slug)
        .maybeSingle();

      if (gq.error) {
        console.error("game error:", gq.error.message); // هندل دوستانه به‌جای ۴۰۰
        setGame(null);
        setLoading(false);
        return;
      }
      const g = gq.data as Game | null;
      if (!g) {
        setGame(null);
        setLoading(false);
        return;
      }
      setGame(g);

      // بنر
      if (g.banner_url) setBannerUrl(g.banner_url);
      else if (g.banner_path) {
        const { data: signed } = await supabase.storage.from(BANNERS_BUCKET).createSignedUrl(g.banner_path, 3600);
        setBannerUrl(signed?.signedUrl || null);
      } else setBannerUrl(null);

      // 2) کلن‌ها
      const cq = await supabase.from("clans").select("id,name,tag,logo_url").eq("game_id", g.id).order("name");
      setClans((cq.data as Clan[]) || []);

      // 3) یوتیوبرها
      const hq = await supabase
        .from("weekly_highlights")
        .select("id,week_start,user_id,reason")
        .eq("type", "youtuber")
        .eq("game_id", g.id)
        .order("week_start", { ascending: false })
        .limit(12);

      let yt: (Highlight & { profile: Profile | null })[] = [];
      if (hq.data?.length) {
        const userIds = hq.data.map((x) => x.user_id).filter(Boolean) as string[];
        const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url").in("id", userIds);
        yt = hq.data.map((x) => ({
          ...x,
          profile: profs?.find((p) => p.id === x.user_id) || null,
        }));
      }
      setYoutubers(yt);

      // 4) ایونت‌ها
      const eq = await supabase
        .from("tournaments")
        .select("id,title,status,starts_at,ends_at")
        .eq("game_id", g.id)
        .order("starts_at", { ascending: true });
      setEvents((eq.data as Tournament[]) || []);

      // 5) لیدربورد
      const lq = await supabase
        .from("leaderboard")
        .select("user_id,total_score,rank_global,profiles(username,avatar_url)")
        .eq("game_id", g.id)
        .order("total_score", { ascending: false })
        .limit(20);
      setLeader((lq.data as LeaderRow[]) || []);

      // 6) اعضا: پروفایل‌هایی که این بازی را انتخاب کرده‌اند (فیلد JSON/Array به نام games)
      const mq = await supabase.from("profiles").select("id,username,avatar_url").contains("games", [g.slug]);
      const mems = (mq.data as Profile[]) || [];
      setMembers(mems);
      setLatestMember(mems.at(-1) || null);

      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [slug]);

  if (loading) return <div className="card p-4">در حال بارگذاری…</div>;
  if (!game) return <div className="card p-4">بازی پیدا نشد.</div>;

  const Tab = ({ id, title }: { id: TabKey; title: string }) => (
    <button
      className={`chip ${activeTab === id ? "chip-primary" : ""}`}
      onClick={() => setActiveTab(id)}
      aria-current={activeTab === id ? "page" : undefined}
    >
      {title}
    </button>
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* بنر + عنوان */}
      <section className="card overflow-hidden p-0">
        <div className="w-full aspect-[21/9] bg-black/30">
          {bannerUrl && <img src={bannerUrl} alt={game.title} className="w-full h-full object-cover" />}
        </div>
        <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{game.title}</h1>
            <div className="text-sm opacity-70 mt-1 flex gap-2 flex-wrap">
              <span className={`chip ${game.active ? "chip-primary" : ""}`}>{game.active ? "فعال" : "غیرفعال"}</span>
              <span className="chip">اعضا: {members.length}</span>
              {latestMember && <span className="chip">آخرین عضو: {latestMember.username}</span>}
            </div>
          </div>
          {game.official_url && (
            <a href={game.official_url} target="_blank" className="btn" rel="noreferrer">
              سایت رسمی
            </a>
          )}
        </div>
      </section>

      {/* تب‌های بالا */}
      <nav className="flex gap-2 flex-wrap">
        <Tab id="overview" title="نمای کلی" />
        <Tab id="clans" title="کلن‌ها" />
        <Tab id="members" title="اعضا" />
        <Tab id="events" title="ایونت‌ها" />
        <Tab id="leaderboard" title="لیدربورد" />
      </nav>

      {/* محتوای تب‌ها */}
      {activeTab === "overview" && (
        <>
          <section className="card p-4">
            <h2 className="font-bold mb-2">معرفی بازی</h2>
            <p className="opacity-80">{game.description || "معرفی این بازی هنوز ثبت نشده."}</p>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="card p-4">
              <h3 className="font-bold mb-3">یوتیوبرهای سایت</h3>
              {youtubers.length === 0 ? (
                <div className="opacity-70">فعلاً چیزی ثبت نشده.</div>
              ) : (
                <ul className="grid gap-2">
                  {youtubers.map((y) => (
                    <li key={y.id} className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{y.profile?.username || y.user_id}</div>
                        {y.reason && <div className="opacity-70 text-sm">{y.reason}</div>}
                      </div>
                      <span className="chip ltr">{y.week_start}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card p-4">
              <h3 className="font-bold mb-3">ایونت‌های فعال/آتی</h3>
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
                            {ev.starts_at ? new Date(ev.starts_at).toLocaleString() : "—"}
                            {ev.ends_at ? ` → ${new Date(ev.ends_at).toLocaleString()}` : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === "clans" && (
        <section className="card p-4">
          <h3 className="font-bold mb-3">کلن‌های این بازی</h3>
          {clans.length === 0 ? (
            <div className="opacity-70">کلنی ثبت نشده.</div>
          ) : (
            <ul className="grid gap-2">
              {clans.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  {c.logo_url && (
                    <span className="size-8 rounded bg-white/10 overflow-hidden">
                      <img src={c.logo_url} className="w-full h-full object-cover" alt="" />
                    </span>
                  )}
                  <div className="font-medium">
                    {c.name} {c.tag && <span className="opacity-60">({c.tag})</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === "members" && (
        <section className="card p-4">
          <h3 className="font-bold mb-3">اعضای این بازی</h3>
          {members.length === 0 ? (
            <div className="opacity-70">فعلاً عضویتی ثبت نشده.</div>
          ) : (
            <ul className="grid gap-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  {m.avatar_url && (
                    <span className="size-8 rounded-full overflow-hidden bg-white/10">
                      <img src={m.avatar_url} className="w-full h-full object-cover" alt="" />
                    </span>
                  )}
                  <div className="font-medium">{m.username || m.id}</div>
                  {/* دکمه‌های اکشن عمومی مثل فرند ریکوئست را بعداً اضافه می‌کنیم */}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === "events" && (
        <section className="card p-4">
          <h3 className="font-bold mb-3">ایونت‌ها</h3>
          {events.length === 0 ? (
            <div className="opacity-70">ایونتی ثبت نشده.</div>
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
                        {ev.starts_at ? new Date(ev.starts_at).toLocaleString() : "—"}
                        {ev.ends_at ? ` → ${new Date(ev.ends_at).toLocaleString()}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === "leaderboard" && (
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
                      <td className="p-2">{r.profiles?.username || r.user_id}</td>
                      <td className="p-2">{r.total_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
