"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Game } from "@/types/db";

const BANNERS_BUCKET = "game-banners";

export default function GamesIndexPage() {
  const [rows, setRows] = useState<Game[]>([]);
  const [signed, setSigned] = useState<Record<string | number, string>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("games")
        .select("id,slug,title,active,description,official_url,banner_url")
        .order("title", { ascending: true });

      if (!ignore) {
        if (error) {
          console.error("load games:", error.message);
          setRows([]);
        } else {
          setRows((data || []) as Game[]);
        }
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // امضای بنرهایی که مسیر استوریج‌اند
  useEffect(() => {
    let ignore = false;
    (async () => {
      const targets = rows.filter(
        (g) => g.banner_url && !/^https?:\/\//i.test(g.banner_url)
      );
      const pairs = await Promise.all(
        targets.map(async (g) => {
          const { data, error } = await supabase.storage
            .from(BANNERS_BUCKET)
            .createSignedUrl(g.banner_url as string, 60 * 60);
          if (error) {
            console.warn("sign banner failed:", g.slug, error.message);
          }
          return [g.id, data?.signedUrl ?? ""] as const;
        })
      );
      if (!ignore) {
        const m: Record<string | number, string> = {};
        pairs.forEach(([id, url]) => url && (m[id] = url));
        setSigned(m);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(s) || r.slug.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">بازی‌ها</h1>
        <div className="flex-1" />
        <input
          className="input max-w-xs"
          placeholder="جستجوی بازی…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="aspect-[16/9] bg-black/20" />
              <div className="p-3 h-10 bg-black/5" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-4 opacity-70">بازی‌ای مطابق جستجو پیدا نشد.</div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => {
            const url =
              g.banner_url && /^https?:\/\//i.test(g.banner_url)
                ? g.banner_url
                : signed[g.id] || "";

            return (
              <Link
                key={g.id}
                href={`/games/${g.slug}`}
                className="card overflow-hidden hover:bg-white/5"
              >
                <div className="aspect-[16/9] w-full bg-black/30">
                  {url ? (
                    <img
                      src={url}
                      alt={g.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="font-bold">{g.title}</div>
                  <span className={`chip ${g.active ? "chip-primary" : ""}`}>
                    {g.active ? "فعال" : "غیرفعال"}
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
