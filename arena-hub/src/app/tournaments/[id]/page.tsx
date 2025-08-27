"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";

type T = { id:number; title:string; description:string|null; status:string; game_id:number; start_at:string|null; end_at:string|null; games?:{title:string}[] };
type P = { id:number; user_id:string; score:number; rank:number|null; profiles?:{username:string|null; avatar_url:string|null}[] };

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tid = Number(params.id);
  const { ready, user } = useAuth();

  const [t, setT] = useState<T|null>(null);
  const [joined, setJoined] = useState<boolean>(false);
  const [players, setPlayers] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [{ data: tdata }, { data: pdata }] = await Promise.all([
        supabase.from("tournaments").select("*, games(title)").eq("id", tid).single(),
        supabase.from("tournament_participants")
          .select("id,user_id,score,rank, profiles(username,avatar_url)")
          .eq("tournament_id", tid)
          .order("score", { ascending: false })
      ]);

      setT(tdata as T);
      const list = (pdata||[]) as P[];
      setPlayers(list);
      if (user) setJoined(list.some(x => x.user_id === user.id));
      setLoading(false);
    })();
  }, [tid, user?.id]);

  const join = async () => {
    if (!ready) return;        // هنوز auth آماده نیست
    if (!user) return router.push("/auth");
    setBusy(true); setMsg("");
    const { error } = await supabase.from("tournament_participants").insert({ tournament_id: tid, user_id: user.id });
    if (error) setMsg(error.message); else setJoined(true);
    setBusy(false);
  };

  const leave = async () => {
    if (!ready || !user) return;
    setBusy(true); setMsg("");
    const { error } = await supabase.from("tournament_participants").delete()
      .eq("tournament_id", tid).eq("user_id", user.id);
    if (error) setMsg(error.message); else setJoined(false);
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      {loading ? <div>Loading…</div> : !t ? <div>Not found</div> : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t.title}</h1>
              <div className="text-sm opacity-80">
                بازی: {t.games?.[0]?.title ?? t.game_id} — وضعیت: {t.status}
              </div>
            </div>
            <div className="flex gap-2">
              {!joined ? (
                <button onClick={join} disabled={!ready || busy}
                  className="px-3 py-1 rounded btn-accent hover:opacity-90 disabled:opacity-50">Join</button>
              ) : (
                <button onClick={leave} disabled={!ready || busy}
                  className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 disabled:opacity-50">Leave</button>
              )}
            </div>
          </div>

          {t.description && <p className="opacity-90">{t.description}</p>}
          {msg && <p className="text-sm text-red-400">{msg}</p>}

          <section>
            <h2 className="text-lg font-bold mb-2">Leaderboard</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg">
              <table className="w-full text-sm">
                <thead className="opacity-70">
                  <tr><th className="text-left p-2">#</th><th className="text-left p-2">Player</th><th className="text-left p-2">Score</th></tr>
                </thead>
                <tbody>
                  {players.map((p, idx) => (
                    <tr key={p.id} className="border-t border-white/10">
                      <td className="p-2">{idx+1}</td>
                      <td className="p-2">{p.profiles?.[0]?.username ?? p.user_id}</td>
                      <td className="p-2">{p.score}</td>
                    </tr>
                  ))}
                  {players.length === 0 && <tr><td className="p-2" colSpan={3}>هنوز کسی جوین نشده.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
