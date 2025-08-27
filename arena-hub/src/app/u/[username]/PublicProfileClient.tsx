"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import ProfileSidebar from "@/components/ProfileSidebar";
import { UserPlus, UserMinus } from "lucide-react";

type MiniUser = { id: string; username: string | null; avatar_url: string | null; bio: string | null };
type UGRow = { games: { id: string; title: string } };
type LastTournament = { id: string; title: string | null; status: "upcoming"|"active"|"finished"; start_date: string|null; rank: number|null; score: number|null };

const fallbackAvatar =
  "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='100%' height='100%' rx='12' fill='#0b1214'/><g fill='#f8fafc' opacity='0.75'><circle cx='48' cy='36' r='18'/><rect x='18' y='62' width='60' height='22' rx='11'/></g></svg>`
  );

const shortDate = (iso?: string|null) => {
  if (!iso) return "—"; const d = new Date(iso); return isNaN(+d) ? "—" :
    d.toLocaleDateString(undefined,{year:"numeric",month:"2-digit",day:"2-digit"});
};

export default function PublicProfileClient({ username }: { username: string }) {
  const { ready, user } = useAuth();
  const viewerId = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [profile, setProfile] = useState<MiniUser | null>(null);
  const [games, setGames] = useState<{id:string; title:string}[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [iFollow, setIFollow] = useState(false);
  const [last, setLast] = useState<LastTournament | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        // 1) پروفایل
        const { data: p, error: pe } = await supabase
          .from("profiles").select("id,username,avatar_url,bio")
          .eq("username", username).maybeSingle();
        if (pe) throw pe;
        if (!p) { if (mounted) setErr("کاربر پیدا نشد."); return; }
        if (!mounted) return;
        setProfile(p as any);
        const targetId = (p as any).id as string;

        // 2,3,4 موازی
        const [
          { data: ug, error: uge },
          { count: cFollowers },
          { count: cFollowing },
          rel,
          tp,
        ] = await Promise.all([
          supabase.from("user_games").select("games(id,title)").eq("user_id", targetId),
          supabase.from("follows").select("*",{count:"exact", head:true}).eq("following_id", targetId),
          supabase.from("follows").select("*",{count:"exact", head:true}).eq("follower_id",  targetId),
          viewerId && viewerId!==targetId
            ? supabase.from("follows").select("follower_id").eq("follower_id", viewerId).eq("following_id", targetId).maybeSingle()
            : Promise.resolve({ data:null }),
          supabase.from("tournament_participants")
            .select("rank, score, tournaments:tournament_id ( id, title, status, start_date )")
            .eq("user_id", targetId).order("created_at",{ascending:false}).limit(1),
        ] as const);

        if (uge) throw uge;
        if (!mounted) return;
        setGames((ug ?? []).map((r:any)=>r.games).filter(Boolean));
        setFollowersCount(cFollowers ?? 0);
        setFollowingCount(cFollowing ?? 0);
        setIFollow(!!(rel as any)?.data);

        const row = (tp as any)?.data?.[0];
        setLast(row ? {
          id: row.tournaments?.id,
          title: row.tournaments?.title ?? null,
          status: row.tournaments?.status ?? "upcoming",
          start_date: row.tournaments?.start_date ?? null,
          rank: row.rank ?? null,
          score: row.score ?? null,
        } : null);
      } catch (e:any) {
        if (mounted) setErr(e?.message ?? "خطا در بارگذاری پروفایل.");
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [username, viewerId, ready]);

  const isMe = viewerId && profile?.id && viewerId === profile.id;
  const avatar = profile?.avatar_url || fallbackAvatar;

  // -- Follow optimistic
  const follow = async () => {
    if (!ready || !viewerId || !profile?.id || isMe) return;
    setErr(null);
    setIFollow(true); setFollowersCount(n=>n+1);
    const { error } = await supabase.from("follows")
      .insert({ follower_id: viewerId, following_id: profile.id });
    if (error) { setIFollow(false); setFollowersCount(n=>Math.max(0,n-1)); setErr(error.message); }
  };
  const unfollow = async () => {
    if (!ready || !viewerId || !profile?.id || isMe) return;
    setErr(null);
    setIFollow(false); setFollowersCount(n=>Math.max(0,n-1));
    const { error } = await supabase.from("follows")
      .delete().eq("follower_id", viewerId).eq("following_id", profile.id);
    if (error) { setIFollow(true); setFollowersCount(n=>n+1); setErr(error.message); }
  };

  return (
    <div className="container py-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
      <ProfileSidebar
  title={`@${username}`}
  username={username}
  isSelf={!!isMe}
  onProfileClick={undefined}  // اینجا لازم نیست، چون ادیت مود در صفحه پابلیک نداریم
/>


      <section className="grid gap-6">
        {err && <div className="card p-3">{err}</div>}

        {/* Header */}
        <div className="card p-4">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar} alt="" className="w-20 h-20 rounded-xl object-cover bg-white/5" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold">@{profile?.username ?? "user"}</h1>
                <span className="chip">Followers {followersCount}</span>
                <span className="chip">Following {followingCount}</span>
                {!isMe && viewerId ? (
                  iFollow
                    ? <button className="btn btn-ghost" onClick={unfollow}><UserMinus size={16}/> آن‌فالو</button>
                    : <button className="btn btn-primary" onClick={follow}><UserPlus size={16}/> فالو</button>
                ) : null}
              </div>
              <p className="opacity-80 mt-1">{profile?.bio || "—"}</p>
            </div>
          </div>
        </div>

        {/* Games */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">بازی‌های انتخاب‌شده</h2>
            {isMe && <Link href="/settings/games" className="text-sm opacity-80 hover:underline">ویرایش</Link>}
          </div>
          {loading ? <div>در حال بارگذاری…</div> :
            games.length===0 ? <div className="opacity-70 text-sm">بازی انتخاب‌شده‌ای ندارد.</div> :
            <ul className="flex flex-wrap gap-2">{games.map(g=> <li key={g.id} className="chip">{g.title}</li>)}</ul>}
        </div>

        {/* Clan + آخرین تورنمنت */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-4">
            <h3 className="font-semibold mb-2">کلن</h3>
            <p className="opacity-70 text-sm">به‌زودی از جدول کلن خوانده می‌شود. فعلاً از <Link href="/teams" className="underline">اینجا</Link> سر بزن.</p>
          </div>

          <div className="card p-4">
            <h3 className="font-semibold mb-2">آخرین تورنمنت</h3>
            {!last ? (
              <div className="opacity-70 text-sm">هنوز در تورنمنتی شرکت نکرده.</div>
            ) : (
              <div className="grid gap-1">
                <div className="flex items-center justify-between">
                  <Link href={`/tournaments/${last.id}`} className="font-medium hover:underline">
                    {last.title ?? "Tournament"}
                  </Link>
                  <span className="chip">{last.status}</span>
                </div>
                <div className="text-sm opacity-80">تاریخ شروع: {shortDate(last.start_date)}</div>
                <div className="text-sm opacity-80">رتبه: {last.rank ?? "—"} | امتیاز: {last.score ?? "—"}</div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
