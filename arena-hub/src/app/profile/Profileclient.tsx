"use client";
import ProfileSidebar from "@/components/ProfileSidebar";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import AvatarUpload from "@/components/AvatarUpload";
import {
  User2, Gamepad2, ShieldCheck, Settings, UsersRound, UserPlus, UserMinus,
} from "lucide-react";

type Profile = { id: string; username: string | null; bio: string | null; avatar_url?: string | null };
type GameRow = { games: { id: string; title: string } };
type MiniUser = { id: string; username: string | null; avatar_url: string | null };

export default function ProfileClient() {
  const { ready, user } = useAuth();
  const userId = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [p, setP] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);

  const [games, setGames] = useState<{ id: string; title: string }[]>([]);
  const [followers, setFollowers] = useState<MiniUser[]>([]);
  const [following, setFollowing] = useState<MiniUser[]>([]);
  const [isFollowingMe, setIsFollowingMe] = useState<boolean>(false); // در نمای خودت کاربرد ندارد، برای آینده

  useEffect(() => {
    if (!ready || !userId) return;
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        // پروفایل خودم
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, username, bio, avatar_url")
          .eq("id", userId)
          .maybeSingle();
        if (prof) {
          setP(prof as any);
          setUsername(prof.username ?? "");
          setBio(prof.bio ?? "");
          setAvatarUrl(prof.avatar_url ?? null);
        }

        // بازی‌های انتخاب‌شده از user_games → games
        const { data: ug } = await supabase
          .from("user_games")
          .select("games(id,title)")
          .eq("user_id", userId);
        setGames((ug ?? []).map((r: any) => r.games).filter(Boolean));

        // Followers: کسانی که من را فالو کرده‌اند
        const { data: flw } = await supabase
          .from("follows")
          .select("follower_id, profiles:follower_id(id,username,avatar_url)")
          .eq("following_id", userId)
          .limit(50);
        setFollowers((flw ?? []).map((r: any) => r.profiles).filter(Boolean));

        // Following: کسانی که من فالو کرده‌ام
        const { data: fwg } = await supabase
          .from("follows")
          .select("following_id, profiles:following_id(id,username,avatar_url)")
          .eq("follower_id", userId)
          .limit(50);
        setFollowing((fwg ?? []).map((r: any) => r.profiles).filter(Boolean));
      } catch (e: any) {
        setMsg(e?.message ?? "خطا در لود پروفایل");
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, userId]);

  const saveProfile = async () => {
    if (!userId) return;
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ username: username.trim() || null, bio: bio.trim() || null, avatar_url: avatarUrl })
      .eq("id", userId);
    setMsg(error ? error.message : "ذخیره شد.");
    if (!error) setEdit(false);
  };

  // UI: آواتار پیشفرض
  const avatar =
    avatarUrl ||
    "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='100%' height='100%' rx='12' fill='#0b1214'/><g fill='#f8fafc' opacity='0.75'><circle cx='48' cy='36' r='18'/><rect x='18' y='62' width='60' height='22' rx='11'/></g></svg>`
      );

  return (
    <div className="container py-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
      {/* Sidebar */}
      <ProfileSidebar
  title="پروفایل من"
  username={p?.username ?? null}
  isSelf={true}
  onProfileClick={() => setEdit(false)}  // ←  این خط: خروج از ادیت
  />


      {/* Content */}
      <section className="grid gap-6">
        {msg && <div className="card p-3">{msg}</div>}

        {/* Header */}
        <div className="card p-4">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar} alt="avatar" className="w-20 h-20 rounded-xl object-cover bg-white/5" />
            <div className="flex-1">
              {!edit ? (
                <>
                  <h1 className="text-2xl font-semibold">@{p?.username ?? "بدون‌نام"}</h1>
                  <p className="opacity-80 mt-1">{p?.bio || "بیوگرافی هنوز ثبت نشده."}</p>
                </>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <span className="text-sm opacity-80">نام کاربری</span>
                    <input className="input" value={username} onChange={(e)=>setUsername(e.target.value)} />
                  </label>
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-sm opacity-80">Bio</span>
                    <textarea className="input" rows={3} value={bio} onChange={(e)=>setBio(e.target.value)} />
                  </label>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                {!edit ? (
                  <>
                    <button className="btn btn-primary" onClick={() => setEdit(true)}>ویرایش سریع</button>
                    <Link href="/settings/profile" className="btn btn-ghost">تنظیمات کامل</Link>
                  </>
                ) : (
                  <>
                    <button className="btn btn-primary" onClick={saveProfile}>ذخیره</button>
                    <button className="btn btn-ghost" onClick={() => setEdit(false)}>انصراف</button>
                  </>
                )}
              </div>
            </div>

            {/* Inline avatar edit */}
            {edit && (
              <div className="ms-auto">
                <AvatarUpload
                  currentUrl={avatarUrl ?? undefined}
                  onUploaded={(url) => setAvatarUrl(url)}
                  size={96}
                />
              </div>
            )}
          </div>
        </div>

        {/* Games */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">بازی‌های انتخاب‌شده</h2>
            <Link href="/settings/games" className="text-sm opacity-80 hover:underline">ویرایش</Link>
          </div>
          {loading ? (
            <div>در حال بارگذاری…</div>
          ) : games.length === 0 ? (
            <div className="opacity-75">هنوز هیچ بازی‌ای اضافه نشده — <Link href="/settings/games" className="underline">افزودن بازی</Link></div>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {games.map((g) => (
                <li key={g.id} className="chip">{g.title}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Followers / Following */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Followers</h3>
              <span className="chip">{followers.length}</span>
            </div>
            {followers.length === 0 ? (
              <div className="opacity-70 text-sm">فعلاً کسی شما را دنبال نمی‌کند.</div>
            ) : (
              <ul className="grid gap-2">
                {followers.map((u) => (
                  <li key={u.id} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        u.avatar_url ||
                        "data:image/svg+xml;utf8," +
                          encodeURIComponent(
                            `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='100%' height='100%' rx='8' fill='#0b1214'/><g fill='#f8fafc' opacity='0.75'><circle cx='16' cy='12' r='7'/><rect x='6' y='20' width='20' height='10' rx='5'/></g></svg>`
                          )
                      }
                      className="w-8 h-8 rounded-lg object-cover bg-white/5"
                      alt=""
                    />
                    <Link href={`/u/${encodeURIComponent(u.username || "")}`} className="hover:underline">
                      @{u.username ?? "user"}
                    </Link>
                    {/* برای آینده: فالو بک */}
                    <span className="ms-auto opacity-60 text-xs">از شما دنبال می‌کند</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Following</h3>
              <span className="chip">{following.length}</span>
            </div>
            {following.length === 0 ? (
              <div className="opacity-70 text-sm">کسی را دنبال نمی‌کنید.</div>
            ) : (
              <ul className="grid gap-2">
                {following.map((u) => (
                  <li key={u.id} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        u.avatar_url ||
                        "data:image/svg+xml;utf8," +
                          encodeURIComponent(
                            `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='100%' height='100%' rx='8' fill='#0b1214'/><g fill='#f8fafc' opacity='0.75'><circle cx='16' cy='12' r='7'/><rect x='6' y='20' width='20' height='10' rx='5'/></g></svg>`
                          )
                      }
                      className="w-8 h-8 rounded-lg object-cover bg-white/5"
                      alt=""
                    />
                    <Link href={`/u/${encodeURIComponent(u.username || "")}`} className="hover:underline">
                      @{u.username ?? "user"}
                    </Link>
                    {/* آینده: آن‌فالو سریع */}
                    {/* <button className="btn btn-ghost ms-auto"><UserMinus size={16}/></button> */}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
