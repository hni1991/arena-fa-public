"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type GameRow = {
  id: string | number;
  slug: string;
  title: string;
  active: boolean;
  banner_url?: string | null;
  banner_path?: string | null;
};

const BANNERS_BUCKET = "game-banners";

export default function GamesIndexPage() {
  const [rows, setRows] = useState<GameRow[]>([]);
  const [q, setQ] = useState("");
  const [signed, setSigned] = useState<Record<string | number, string>>({});

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id,slug,title,active,banner_url,banner_path")
        .order("title", { ascending: true });

      if (!error && data) {
        const list = data.map((g) => ({
          id: g.id,
          slug: g.slug,
          title: g.title ?? "",
          active: !!g.active,
          banner_url: g.banner_url,
          banner_path: g.banner_path,
        })) as GameRow[];
        setRows(list);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // امضای بنرهایی که path دارند و http نیستند
  useEffect(() => {
    let ignore = false;
    (async () => {
      const toSign = rows.filter(
        (r) => r.banner_path && !String(r.banner_path).startsWith("http")
      );
      if (!toSign.length) return;

      const entries = await Promise.all(
        toSign.map(async (r) => {
          try {
            const { data } = await supabase.storage
              .from(BANNERS_BUCKET)
              .createSignedUrl(String(r.banner_path), 3600);
            return [r.id, data?.signedUrl ?? ""] as const;
          } catch {
            return [r.id, ""] as const;
          }
        })
      );
      if (!ignore) {
        const map: Record<string | number, string> = {};
        for (const [id, url] of entries) if (url) map[id] = url;
        setSigned(map);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(s));
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((g) => {
          const img =
            g.banner_url?.startsWith("http")
              ? g.banner_url
              : g.banner_path?.startsWith("http")
              ? g.banner_path
              : signed[g.id];

        return (
          <Link
            key={g.slug}
            href={`/games/${g.slug}`}
            className="card overflow-hidden hover:bg-white/5 transition"
          >
            <div className="aspect-[16/9] w-full bg-black/30">
              {img ? (
                <img
                  src={img}
                  alt={g.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
            <div className="p-3 flex items-center justify-between">
              <div className="font-bold truncate">{g.title}</div>
              <span className={`chip ${g.active ? "chip-primary" : ""}`}>
                {g.active ? "فعال" : "غیرفعال"}
              </span>
            </div>
          </Link>
        )})}
        {!filtered.length && (
          <div className="card p-4 opacity-70">بازی مطابق جستجو پیدا نشد.</div>
        )}
      </section>
    </div>
  );
}
