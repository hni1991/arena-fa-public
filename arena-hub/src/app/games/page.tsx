"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Game = {
  id: string;
  title: string;
  active: boolean;
  banner_path?: string | null;   // اختیاری
};

const BANNERS_BUCKET = "game-banners"; // اگر متفاوت است، تغییر بده

export default function GamesIndexPage() {
  const [rows, setRows] = useState<Game[]>([]);
  const [q, setQ] = useState("");
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("games")
        .select("id,title,active,banner_path")
        .order("title");
      setRows((data as Game[]) || []);
    })();
  }, []);

  // امضای بنرها (lazy پس از لود لیست)
  useEffect(() => {
    let ignore = false;
    (async () => {
      const toSign = rows.filter(r => r.banner_path && !r.banner_path.startsWith("http"));
      const entries = await Promise.all(toSign.map(async g => {
        const { data } = await supabase.storage.from(BANNERS_BUCKET)
          .createSignedUrl(g.banner_path!, 3600);
        return [g.id, data?.signedUrl || ""] as const;
      }));
      if (!ignore) {
        const map: Record<string, string> = {};
        entries.forEach(([id, url]) => { if (url) map[id] = url; });
        setSigned(map);
      }
    })();
    return () => { ignore = true; };
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r => r.title.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">بازی‌ها</h1>
        <div className="flex-1" />
        <input className="input max-w-xs" placeholder="جستجوی بازی…" value={q} onChange={e=>setQ(e.target.value)} />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(g => (
          <Link key={g.id} href={`/games/${g.id}`} className="card overflow-hidden hover:bg-white/5">
            <div className="aspect-[16/9] w-full bg-black/30">
              {g.banner_path ? (
                <img
                  src={g.banner_path.startsWith("http") ? g.banner_path : (signed[g.id] || "")}
                  alt={g.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
            <div className="p-3 flex items-center justify-between">
              <div className="font-bold">{g.title}</div>
              <span className={`chip ${g.active ? "chip-primary" : ""}`}>{g.active ? "فعال" : "غیرفعال"}</span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <div className="card p-4 opacity-70">بازی‌ای مطابق جستجو پیدا نشد.</div>}
      </section>
    </div>
  );
}
