// src/app/u/[username]/ProfileClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";

type ProfileRow = { id: string; username: string | null; avatar_url?: string | null; bio?: string | null; };
type GameRow = { id: string; title: string };
type TournamentRow = { id: string; title: string | null; status: "upcoming"|"active"|"finished"; start_date?: string | null; };
type LastParticipation = { tournament: TournamentRow | null; score?: number | null; rank?: number | null; };
type ClanRow = { id: string; name: string; tag: string | null };

export default function ProfileClient({ username }: { username: string }) {
  const { user, ready } = useAuth(); // ✅ طبق استاندارد پروژه
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [last, setLast] = useState<LastParticipation | null>(null);

  const [followers, setFollowers] = useState<number>(0);
  const [following, setFollowing] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);

  const [clan, setClan] = useState<{ clan: ClanRow; role: string } | null>(null);

  const isOwnProfile = user?.id && profile?.id && user.id === profile.id;

  const shortDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(+d)) return iso ?? "-";
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
  };

  useEffect(() => {
    (async () => {
      setLoading(true); setErrorMsg(null);
      try {
        // 1) profile
        const { data: prof, error: pe } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, bio")
          .eq("username", username)
          .maybeSingle();
        if (pe) throw pe;
        if (!prof) { setErrorMsg("کاربر پیدا نشد."); setLoading(false); return; }
        setProfile(prof as any);

        const uid = (prof as any).id;

        // 2) followers / following
        const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", uid),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", uid),
        ]);
        setFollowers(followersCount ?? 0);
        setFollowing(followingCount ?? 0);

        // 3) آیا من فالو کرده‌ام؟
        if (ready && user?.id) {
          const { count: imFollowing } = await supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", user.id)
            .eq("following_id", uid);
          setIsFollowing((imFollowing ?? 0) > 0);
        }

        // 4) clan (اگر عضو است)
        const { data: cm } = await supabase
          .from("clan_members")
          .select("role, clans(id, name, tag)")
          .eq("user_id", uid)
          .limit(1)
          .maybeSingle();
        if (cm?.clans) setClan({ clan: cm.clans as any, role: (cm as any).role });

        // 5) tournaments participated → games & last tournament
        const { data: parts } = await supabase
          .from("tournament_participants")
          .select("tournament_id")
          .eq("user_id", uid)
          .limit(500);

        const tournamentIds = Array.from(new Set((parts ?? []).map((r:any)=>r.tournament_id))).filter(Boolean);
        if (tournamentIds.length) {
          const { data: tours } = await supabase
            .from("tournaments")
            .select("id, game_id, title, status, start_date")
            .in("id", tournamentIds);

          const gameIds = Array.from(new Set((tours ?? []).map((t:any)=>t.game_id))).filter(Boolean);
          let gameMap: Record<string,string> = {};
          if (gameIds.length) {
            const { data: gamesData } = await supabase
              .from("games").select("id, title").in("id", gameIds);
            gameMap = Object.fromEntries((gamesData ?? []).map((g:any)=>[g.id, g.title]));
          }
          const distinctGames = Array.from(new Set((tours ?? []).map((t:any)=>t.game_id).filter(Boolean)))
            .map((gid:string)=>({ id: gid, title: gameMap[gid] ?? "Game" }));
          setGames(distinctGames as any);

          const sorted = [...(tours ?? [])].sort((a:any,b:any)=>{
            const ad = a.start_date ? +new Date(a.start_date) : 0;
            const bd = b.start_date ? +new Date(b.start_date) : 0;
            return bd - ad || (b.id as string).localeCompare(a.id as string);
          });
          const lastTour = sorted[0];
          if (lastTour) {
            const { data: partRow } = await supabase
              .from("tournament_participants")
              .select("score, rank")
              .eq("user_id", uid).eq("tournament_id", lastTour.id).maybeSingle();
            setLast({
              tournament: { id: lastTour.id, title: lastTour.title, status: lastTour.status, start_date: lastTour.start_date },
              score: (partRow as any)?.score ?? null,
              rank: (partRow as any)?.rank ?? null,
            });
          }
        }
      } catch (e:any) {
        console.error(e);
        setErrorMsg(e?.message ?? "خطا در لود پروفایل.");
      } finally { setLoading(false); }
    })();
  }, [username, ready, user?.id]);

  // Follow / Unfollow actions
  const doFollow = async () => {
    if (!user?.id || !profile?.id) return;
    await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
    setIsFollowing(true); setFollowers((n)=>n+1);
  };
  const doUnfollow = async () => {
    if (!user?.id || !profile?.id) return;
    await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
    setIsFollowing(false); setFollowers((n)=>Math.max(0,n-1));
  };

  // UI helpers
  const rankBadge = useMemo(() => {
    if (!last?.tournament) return null;
    if (last.tournament.status === "finished") {
      return <span className="chip">{last.rank != null ? `رتبه ${last.rank}` : "بدون رتبه"}</span>;
    }
    if (last.tournament.status === "active") return <span className="chip">در حال برگزاری</span>;
    return <span className="chip">در انتظار شروع</span>;
  }, [last]);

  return (
    <main className="container py-8">
      {errorMsg && <div className="card p-4 mb-6">{errorMsg}</div>}

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-white/10 overflow-hidden shrink-0">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={profile.username ?? "avatar"} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold mb-1">@{profile?.username}</h1>
          <p className="opacity-80 text-sm">{profile?.bio ?? "—"}</p>

          <div className="flex flex-wrap gap-3 mt-3 text-sm opacity-85">
            <span>Followers: <b>{followers}</b></span>
            <span>Following: <b>{following}</b></span>
            <span>
              Clan:{" "}
              {clan ? (
                <>
                  <b>{clan.clan.name}</b> {clan.clan.tag ? <span className="opacity-70">({clan.clan.tag})</span> : null}
                  <span className="chip ms-2">{clan.role}</span>
                </>
              ) : isOwnProfile ? (
                <Link href="/admin/clans" className="hover:underline underline-offset-4">بدون کلن — ساخت/عضویت</Link>
              ) : (
                <span className="opacity-70">—</span>
              )}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="ms-auto flex gap-2">
          {isOwnProfile ? (
            <Link href="/profile" className="btn btn-ghost">ویرایش پروفایل</Link>
          ) : ready && user?.id ? (
            isFollowing ? (
              <button className="btn btn-ghost" onClick={doUnfollow}>آن‌فالو</button>
            ) : (
              <button className="btn btn-primary" onClick={doFollow}>فالو</button>
            )
          ) : null}
        </div>
      </div>

      {/* Games */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">بازی‌های این پلیر</h2>
        {loading ? (
          <div className="card p-4">در حال بارگذاری…</div>
        ) : games.length === 0 ? (
          <div className="card p-4">فعلاً سابقهٔ شرکت در تورنمنت ثبت نشده.</div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {games.map((g) => (
              <div key={g.id} className="card p-4">
                <div className="font-medium">{g.title}</div>
                <div className="opacity-70 text-sm mt-1">
                  <Link href={`/tournaments?game=${encodeURIComponent(g.title)}`} className="hover:underline">تورنمنت‌های {g.title}</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Last tournament */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">آخرین تورنمنت</h2>
        {!last?.tournament ? (
          <div className="card p-4">هنوز در تورنمنتی شرکت نکرده.</div>
        ) : (
          <div className="card p-0">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="font-medium">{last.tournament.title ?? "Tournament"}</div>
              <div className="flex items-center gap-2">
                {rankBadge}
                <span className="chip">{last.tournament.status}</span>
              </div>
            </div>
            <div className="p-4 text-sm opacity-85 grid sm:grid-cols-3 gap-3">
              <div>تاریخ: {shortDate(last.tournament.start_date)}</div>
              <div>امتیاز: {last?.score ?? "—"}</div>
              <div>رتبه: {last?.tournament.status === "finished" ? (last?.rank ?? "—") : "در انتظار نتیجه"}</div>
            </div>
            <div className="p-4 pt-0">
              <Link href={`/tournaments/${last.tournament.id}`} className="btn btn-ghost">صفحهٔ تورنمنت</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
