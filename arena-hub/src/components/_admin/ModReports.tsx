"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Cnts = {
  users: number; games: number; clans: number;
  highlights: number;
  tournaments_upcoming: number;
  tournaments_active: number;
  tournaments_finished: number;
};

export default function ModReports() {
  const [c, setC] = useState<Cnts | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const [{ count: users }, { count: games }, { count: clans }, { count: highlights },
        u, a, f] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("games").select("*", { count: "exact", head: true }),
        supabase.from("clans").select("*", { count: "exact", head: true }),
        supabase.from("weekly_highlights").select("*", { count: "exact", head: true }),
        supabase.from("tournaments").select("id", { count: "exact", head: true }).eq("status", "upcoming"),
        supabase.from("tournaments").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("tournaments").select("id", { count: "exact", head: true }).eq("status", "finished"),
      ]);

      if (!ignore) setC({
        users: users || 0,
        games: games || 0,
        clans: clans || 0,
        highlights: highlights || 0,
        tournaments_upcoming: u.count || 0,
        tournaments_active: a.count || 0,
        tournaments_finished: f.count || 0,
      });
    })();
    return () => { ignore = true; };
  }, []);

  if (!c) return <div className="opacity-70">در حال بارگذاری…</div>;

  const Item = ({ title, value }: { title: string; value: number }) => (
    <div className="card p-4 text-center">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="opacity-70 text-sm mt-1">{title}</div>
    </div>
  );

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Item title="کاربران" value={c.users} />
      <Item title="بازی‌ها" value={c.games} />
      <Item title="کلن‌ها" value={c.clans} />
      <Item title="هایلایت‌ها" value={c.highlights} />
      <Item title="تورنمنت (upcoming)" value={c.tournaments_upcoming} />
      <Item title="تورنمنت (active)" value={c.tournaments_active} />
      <Item title="تورنمنت (finished)" value={c.tournaments_finished} />
    </section>
  );
}
