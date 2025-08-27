"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";

type Game = { id: string; title: string; active: boolean };

export default function SettingsGames() {
  const { ready, user } = useAuth();
  const userId = user?.id ?? null;

  const [allGames, setAllGames] = useState<Game[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !userId) return;
    (async () => {
      setLoading(true);
      const [{ data: g }, { data: ug }] = await Promise.all([
        supabase.from("games").select("id,title,active").eq("active", true).order("title"),
        supabase.from("user_games").select("game_id").eq("user_id", userId),
      ]);
      setAllGames((g ?? []) as any);
      setSelected(new Set((ug ?? []).map((r: any) => r.game_id)));
      setLoading(false);
    })();
  }, [ready, userId]);

  const toggle = async (gameId: string) => {
    if (!userId) return;
    setMsg(null);
    const next = new Set(selected);
    const has = next.has(gameId);
    try {
      if (has) {
        const { error } = await supabase.from("user_games")
          .delete().eq("user_id", userId).eq("game_id", gameId);
        if (error) throw error;
        next.delete(gameId);
      } else {
        const { error } = await supabase.from("user_games")
          .insert({ user_id: userId, game_id: gameId });
        if (error) throw error;
        next.add(gameId);
      }
      setSelected(next);
    } catch (e: any) {
      setMsg(e?.message ?? "خطا در ذخیره‌سازی");
    }
  };

  const chosen = useMemo(() => allGames.filter(g => selected.has(g.id)), [allGames, selected]);

  return (
    <div className="grid gap-6">
      {msg && <div className="card p-3">{msg}</div>}

      <div className="card p-4">
        <h1 className="text-lg font-semibold mb-3">بازی‌های من</h1>
        {loading ? (
          <div>در حال بارگذاری…</div>
        ) : allGames.length === 0 ? (
          <div className="opacity-75">فعلاً بازی فعالی ثبت نشده.</div>
        ) : (
          <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allGames.map((g) => {
              const picked = selected.has(g.id);
              return (
                <li key={g.id}>
                  <button
                    onClick={() => toggle(g.id)}
                    className={`p-3 w-full rounded-lg border transition text-start
                      ${picked ? "border-green-500/60 bg-green-500/10" : "border-white/10 hover:border-white/20"}`}
                    aria-pressed={picked}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{g.title}</span>
                      <span className={`chip ${picked ? "" : "opacity-60"}`}>{picked ? "✓ انتخاب شد" : "+ افزودن"}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-2">خلاصهٔ انتخاب‌ها</h2>
        {chosen.length ? (
          <ul className="flex flex-wrap gap-2">
            {chosen.map((g) => (
              <li key={g.id} className="chip">{g.title}</li>
            ))}
          </ul>
        ) : (
          <div className="opacity-75">هیچ بازی‌ای انتخاب نشده.</div>
        )}
      </div>
    </div>
  );
}
