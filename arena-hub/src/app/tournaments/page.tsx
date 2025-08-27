"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type T = {
  id: number; title: string; status: "upcoming"|"active"|"finished";
  start_at: string | null; end_at: string | null; game_id: number;
  games?: { title: string }[];
};

export default function TournamentsPage() {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id,title,status,start_at,end_at,game_id, games(title)")
        .order("id", { ascending: false });
      if (!error) setItems(data as T[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold">تورنمنت‌ها</h1>
      {loading ? <div>در حال بارگذاری…</div> : (
        <div className="grid gap-3">
          {items.map(t => (
            <Link key={t.id} href={`/tournaments/${t.id}`}
              className="block bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10">
              <div className="font-semibold">{t.title}</div>
              <div className="text-sm opacity-80">
                بازی: {t.games?.[0]?.title ?? t.game_id} — وضعیت: {t.status}
              </div>
            </Link>
          ))}
          {items.length === 0 && <div className="opacity-70">فعلاً تورنمنتی ثبت نشده.</div>}
        </div>
      )}
    </div>
  );
}
