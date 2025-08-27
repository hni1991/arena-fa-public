"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Search, UsersRound, Swords } from "lucide-react";

type ClanRow = {
  id: string;
  name: string;
  tag: string | null;
  logo_url: string | null;
  description: string | null;
  owner_id: string | null;
  owner_username?: string | null; // اگر از clans_full می‌خوانیم
  created_at: string | null;
  game_id: string | null;
  game_title?: string | null;     // اگر از clans_full می‌خوانیم
  member_count: number | null;
};

type Game = { id: string; title: string };

export default function TeamsIndex() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [gameFilter, setGameFilter] = useState<string | "all">("all");

  const [games, setGames] = useState<Game[]>([]);
  const [rows, setRows] = useState<ClanRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null);
      try {
        // بازی‌های فعال برای فیلتر
        const { data: g } = await supabase
          .from("games")
          .select("id,title")
          .eq("active", true)
          .order("title");
        setGames((g ?? []) as Game[]);

        // سعی می‌کنیم از ویوی کامل بخوانیم؛ اگر نبود، از ویوی شمارش‌دار
        let clans: any[] | null = null;
        let error: any = null;

        const tryFull = await supabase
          .from("clans_full")
          .select("id,name,tag,logo_url,description,owner_id,owner_username,created_at,game_id,game_title,member_count")
          .order("created_at", { ascending: false });

        if (tryFull.error) {
          const tryCount = await supabase
            .from("clans_with_counts")
            .select("id,name,tag,logo_url,description,owner_id,created_at,game_id,member_count")
            .order("created_at", { ascending: false });
          clans = tryCount.data ?? [];
          error = tryCount.error;
        } else {
          clans = tryFull.data ?? [];
          error = tryFull.error;
        }

        if (error) throw error;
        setRows(clans as ClanRow[]);
      } catch (e: any) {
        setErr(e?.message ?? "خطا در دریافت کلن‌ها");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      r = r.filter((x) =>
        x.name?.toLowerCase().includes(s) ||
        x.tag?.toLowerCase().includes(s) ||
        x.description?.toLowerCase().includes(s) ||
        x.game_title?.toLowerCase().includes(s) ||
        x.owner_username?.toLowerCase().includes(s)
      );
    }
    if (gameFilter !== "all") r = r.filter((x) => x.game_id === gameFilter);
    return r;
  }, [rows, q, gameFilter]);

  return (
    <main className="container py-8 grid gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">کلن‌ها</h1>
          <p className="opacity-75 text-sm">کلن‌های فعال جامعه؛ جستجو کن و درخواست عضویت بده.</p>
        </div>
      </header>

      {/* Filters */}
      <div className="card p-3 grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="relative">
          <input
            className="input ps-9"
            placeholder="جستجو: نام، تگ، توضیحات…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70" />
        </label>

        <label className="grid grid-cols-[80px_1fr] items-center gap-2">
          <span className="text-sm opacity-75">بازی:</span>
          <select
            className="input appearance-none"
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value as any)}
          >
            <option value="all">همه</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </label>
      </div>

      {/* List */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full opacity-80">در حال بارگذاری…</div>
        ) : err ? (
          <div className="col-span-full card p-3">{err}</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full opacity-80">کلنی مطابق جستجو پیدا نشد.</div>
        ) : (
          filtered.map((cl) => (
            <article key={cl.id} className="card p-0 overflow-hidden flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cl.logo_url || "/clan-cover.png"}
                alt={cl.name}
                className="h-28 w-full object-cover bg-white/5"
              />
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {cl.name} {cl.tag ? <span className="opacity-70 text-sm">({cl.tag})</span> : null}
                    </h3>
                    <div className="text-sm opacity-75 mt-1">
                      {cl.game_title ? <>بازی: {cl.game_title}</> : null}
                      {cl.game_title && cl.owner_username ? " • " : null}
                      {cl.owner_username ? <>سازنده: @{cl.owner_username}</> : null}
                    </div>
                  </div>
                  <span className="chip flex items-center gap-1">
                    <UsersRound size={14}/> {cl.member_count ?? 0}
                  </span>
                </div>

                <p className="opacity-80 text-sm line-clamp-3">{cl.description || "—"}</p>

                <div className="mt-2 flex gap-2">
                  <Link href={`/teams/${cl.id}`} className="btn btn-primary flex-1">
                    <Swords size={16}/> صفحهٔ کلن
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
