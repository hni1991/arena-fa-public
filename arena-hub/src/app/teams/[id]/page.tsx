"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { UsersRound, Crown, Shield } from "lucide-react";

type Clan = {
  id: string;
  name: string;
  tag: string | null;
  logo_url: string | null;
  description: string | null;
  owner_id: string | null;
  owner_username?: string | null; // اگر از clans_full بخوانیم
  created_at: string | null;
  game_id: string | null;
  game_title?: string | null;     // اگر از clans_full بخوانیم
  member_count: number | null;
};

type MemberRow = {
  role: "leader" | "officer" | "member" | null;
  profiles: { id: string; username: string | null; avatar_url: string | null } | null;
};

export default function ClanDetailPage() {
  const params = useParams<{ id: string }>();
  const clanId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [clan, setClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);

  useEffect(() => {
    if (!clanId) return;
    (async () => {
      setLoading(true); setErr(null);
      try {
        // سعی در خواندن از ویوی کامل؛ در صورت عدم وجود، از ویوی شمارش‌دار می‌گیریم
        let c: any = null;
        let e: any = null;

        const tryFull = await supabase
          .from("clans_full")
          .select("id,name,tag,logo_url,description,owner_id,owner_username,created_at,game_id,game_title,member_count")
          .eq("id", clanId).maybeSingle();

        if (tryFull.error) {
          const tryCount = await supabase
            .from("clans_with_counts")
            .select("id,name,tag,logo_url,description,owner_id,created_at,game_id,member_count")
            .eq("id", clanId).maybeSingle();
          c = tryCount.data; e = tryCount.error;
        } else {
          c = tryFull.data; e = tryFull.error;
        }

        if (e) throw e;
        if (!c) { setErr("کلن پیدا نشد."); setLoading(false); return; }
        setClan(c as Clan);

        // اعضا (اولین 30 نفر)
        const { data: m, error: me } = await supabase
          .from("clan_members")
          .select(`
            role,
            profiles:user_id ( id, username, avatar_url )
          `)
          .eq("clan_id", clanId)
          .order("created_at", { ascending: true })
          .limit(30);
        if (me) throw me;
        setMembers((m ?? []) as any);
      } catch (e: any) {
        setErr(e?.message ?? "خطا در بارگذاری کلن");
      } finally {
        setLoading(false);
      }
    })();
  }, [clanId]);

  return (
    <main className="container py-8 grid gap-6">
      {loading ? <div>در حال بارگذاری…</div> : null}
      {err ? <div className="card p-3">{err}</div> : null}

      {clan && (
        <>
          <header className="card p-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={clan.logo_url || "/clan-cover.png"} alt="" className="h-36 w-full object-cover bg-white/5"/>
            <div className="p-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">
                  {clan.name} {clan.tag ? <span className="opacity-70 text-lg">({clan.tag})</span> : null}
                </h1>
                <div className="opacity-80 text-sm mt-1">
                  {clan.game_title ? <>بازی: {clan.game_title}</> : "—"}
                  {clan.game_title && clan.owner_username ? " • " : " "}
                  {clan.owner_username ? <>سازنده: @{clan.owner_username}</> : null}
                </div>
                <p className="opacity-80 mt-3">{clan.description || "—"}</p>
              </div>
              <span className="chip flex items-center gap-1">
                <UsersRound size={14}/> {clan.member_count ?? members.length}
              </span>
            </div>
          </header>

          <section className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">اعضا</h2>
              <div className="opacity-75 text-sm">اولین ۳۰ نفر</div>
            </div>
            {members.length === 0 ? (
              <div className="opacity-70 text-sm">هنوز عضویتی ثبت نشده.</div>
            ) : (
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {members.map((m) => {
                  const u = m.profiles;
                  if (!u) return null;
                  const badge =
                    m.role === "leader" ? <span className="chip"><Crown size={14}/> لیدر</span> :
                    m.role === "officer" ? <span className="chip"><Shield size={14}/> آفیسر</span> :
                    null;
                  return (
                    <li key={u.id} className="p-3 rounded-lg border border-white/10 bg-white/5 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u.avatar_url || "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='100%' height='100%' rx='8' fill='#0b1214'/><g fill='#f8fafc' opacity='0.75'><circle cx='16' cy='12' r='7'/><rect x='6' y='20' width='20' height='10' rx='5'/></g></svg>")}
                        className="w-8 h-8 rounded-lg object-cover bg-white/5" alt=""
                      />
                      <Link href={`/u/${encodeURIComponent(u.username || "")}`} className="hover:underline">
                        @{u.username ?? "user"}
                      </Link>
                      <div className="ms-auto">{badge}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card p-4">
            <h2 className="font-semibold mb-2">درخواست عضویت</h2>
            <p className="opacity-75 text-sm">
              به‌زودی امکان ارسال درخواست عضویت از همین‌جا فعال می‌شود.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
