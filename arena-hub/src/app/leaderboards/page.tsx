// src/app/leaderboards/page.tsx
"use client";
import GlowFrame from "@/components/GlowFrame";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

/* -------------------- Types -------------------- */
type TabKey = "tournament" | "weekly" | "global";

type TournamentRow = {
  player: string | null;
  tournament: string | null;
  score: number | null;
  rank: number | null;
  status: "upcoming" | "active" | "finished" | null;
};

type WeeklyRow = {
  type: "user" | "youtuber" | "gamenet";
  week_start: string; // YYYY-MM-DD
  reason: string | null;
  player: string | null; // profiles.username
  game: string | null;   // games.title
};

type GlobalRow = {
  player: string | null;     // profiles.username
  game: string | null;       // games.title
  total_score: number | null;
  rank_global: number | null;
};

/* -------------------- Utils -------------------- */
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

async function mapUsernamesById(ids: string[]) {
  const map: Record<string, string> = {};
  const cleaned = uniq(ids.filter(Boolean));
  if (!cleaned.length) return map;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", cleaned);

  if (!error && data) for (const r of data as any[]) map[r.id] = r.username ?? "";
  return map;
}

async function mapGameTitlesById(ids: string[]) {
  const map: Record<string, string> = {};
  const cleaned = uniq(ids.filter(Boolean));
  if (!cleaned.length) return map;
  const { data, error } = await supabase
    .from("games")
    .select("id, title")
    .in("id", cleaned);

  if (!error && data) for (const r of data as any[]) map[r.id] = r.title ?? "";
  return map;
}

async function mapTournamentMetaById(ids: string[]) {
  const titleMap: Record<string, string> = {};
  const statusMap: Record<string, "upcoming" | "active" | "finished" | null> = {};
  const cleaned = uniq(ids.filter(Boolean));
  if (!cleaned.length) return { titleMap, statusMap };
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, title, status")
    .in("id", cleaned);

  if (!error && data) {
    for (const r of data as any[]) {
      titleMap[r.id] = r.title ?? "";
      statusMap[r.id] = r.status ?? null;
    }
  }
  return { titleMap, statusMap };
}

/* -------------------- Page -------------------- */
export default function LeaderboardsPage() {
  const { ready } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>("tournament");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [tournamentRows, setTournamentRows] = useState<TournamentRow[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<WeeklyRow[]>([]);
  const [globalRows, setGlobalRows] = useState<GlobalRow[]>([]);

  /* -------------------- Fetchers -------------------- */

  // Tournament: participants + map names
  async function fetchTournament() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select("user_id, tournament_id, score, rank")
        .order("score", { ascending: false })
        .limit(100);

      if (error) throw error;

      const userIds = uniq((data ?? []).map((r: any) => r.user_id).filter(Boolean));
      const tourIds = uniq((data ?? []).map((r: any) => r.tournament_id).filter(Boolean));

      const [usersMap, tourMeta] = await Promise.all([
        mapUsernamesById(userIds),
        mapTournamentMetaById(tourIds),
      ]);

      const rows: TournamentRow[] = (data ?? []).map((r: any) => ({
        player: usersMap[r.user_id] ?? null,
        tournament: tourMeta.titleMap[r.tournament_id] ?? null,
        status: tourMeta.statusMap[r.tournament_id] ?? null,
        score: r.score ?? null,
        rank: r.rank ?? null,
      }));

      setTournamentRows(rows);
    } catch (e: any) {
      console.error("[fetchTournament]", e);
      setErrorMsg(e?.message ?? "خطای نامشخص در Tournament.");
      setTournamentRows([]);
    } finally {
      setLoading(false);
    }
  }

  // Weekly: bring ALL highlights (newest first), then map names
  async function fetchWeekly() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("weekly_highlights")
        .select("type, week_start, reason, user_id, game_id")
        .order("week_start", { ascending: false })
        .limit(200);

      if (error) throw error;

      const userIds = uniq((data ?? []).map((r: any) => r.user_id).filter(Boolean));
      const gameIds = uniq((data ?? []).map((r: any) => r.game_id).filter(Boolean));

      const [usersMap, gamesMap] = await Promise.all([
        mapUsernamesById(userIds),
        mapGameTitlesById(gameIds),
      ]);

      const rows: WeeklyRow[] = (data ?? []).map((r: any) => ({
        type: r.type,
        week_start: r.week_start,
        reason: r.reason ?? null,
        player: usersMap[r.user_id] ?? null,
        game: gamesMap[r.game_id] ?? null,
      }));

      setWeeklyRows(rows);
    } catch (e: any) {
      console.error("[fetchWeekly]", e);
      setErrorMsg(e?.message ?? "خطای نامشخص در Weekly.");
      setWeeklyRows([]);
    } finally {
      setLoading(false);
    }
  }

  // Global: optional table; handle missing table gracefully
  // ---------- Global (with fallback) ----------
function denseRank(sortedTotals: { total_score: number }[]) {
  let rank = 0;
  let prevScore: number | null = null;
  return sortedTotals.map((row, i) => {
    if (row.total_score !== prevScore) {
      rank = i + 1;
      prevScore = row.total_score;
    }
    return rank;
  });
}

async function fetchGlobal() {
  setLoading(true);
  setErrorMsg(null);
  try {
    // 1) سعی می‌کنیم از جدول leaderboard بخوانیم
    const tryDirect = await supabase
      .from("leaderboard")
      .select("user_id, game_id, total_score, rank_global")
      .order("total_score", { ascending: false })
      .limit(200);

    if (!tryDirect.error && (tryDirect.data?.length ?? 0) > 0) {
      const userIds = Array.from(new Set(tryDirect.data!.map((r: any) => r.user_id).filter(Boolean)));
      const gameIds = Array.from(new Set(tryDirect.data!.map((r: any) => r.game_id).filter(Boolean)));

      const [usersMap, gamesMap] = await Promise.all([
        mapUsernamesById(userIds),
        mapGameTitlesById(gameIds),
      ]);

      const rows: GlobalRow[] = tryDirect.data!.map((r: any) => ({
        total_score: r.total_score ?? 0,
        rank_global: r.rank_global ?? null,
        player: usersMap[r.user_id] ?? null,
        game: gamesMap[r.game_id] ?? null,
      }));

      setGlobalRows(rows);
      return;
    }

    // 2) Fallback: جمع امتیازها از participants + گرفتن game_id از tournaments
    const { data: parts, error: partsErr } = await supabase
      .from("tournament_participants")
      .select("user_id, tournament_id, score")
      .limit(5000); // در صورت نیاز بیشتر/کمتر کن

    if (partsErr) throw partsErr;

    const tourIds = Array.from(new Set((parts ?? []).map((r: any) => r.tournament_id).filter(Boolean)));
    const { titleMap: _ignore, statusMap: _ignore2 } = await mapTournamentMetaById(tourIds); // اگر title/status نمی‌خواهی، می‌تونی این را حذف کنی

    // برای گرفتن game_id تورنمنت‌ها:
    const { data: tours, error: toursErr } = await supabase
      .from("tournaments")
      .select("id, game_id")
      .in("id", tourIds);

    if (toursErr) throw toursErr;

    const tourToGame: Record<string, string> = {};
    for (const t of tours ?? []) tourToGame[(t as any).id] = (t as any).game_id;

    // جمع امتیاز به ازای (user_id, game_id)
    type Key = string; // `${user_id}__${game_id}`
    const totals = new Map<Key, { user_id: string; game_id: string; total_score: number }>();

    for (const p of parts ?? []) {
      const user_id = (p as any).user_id;
      const game_id = tourToGame[(p as any).tournament_id];
      if (!user_id || !game_id) continue;
      const key = `${user_id}__${game_id}`;
      const prev = totals.get(key)?.total_score ?? 0;
      totals.set(key, { user_id, game_id, total_score: prev + ((p as any).score ?? 0) });
    }

    // مرتب‌سازی و محاسبه rank (Dense Rank)
    const arr = Array.from(totals.values()).sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0));
    const ranks = denseRank(arr);

    const userIds = Array.from(new Set(arr.map(r => r.user_id)));
    const gameIds = Array.from(new Set(arr.map(r => r.game_id)));
    const [usersMap, gamesMap] = await Promise.all([
      mapUsernamesById(userIds),
      mapGameTitlesById(gameIds),
    ]);

    const rows: GlobalRow[] = arr.map((r, i) => ({
      total_score: r.total_score,
      rank_global: ranks[i],
      player: usersMap[r.user_id] ?? null,
      game: gamesMap[r.game_id] ?? null,
    }));

    setGlobalRows(rows);
  } catch (e: any) {
    console.error("[fetchGlobal Fallback]", e);
    setErrorMsg(e?.message ?? "خطای Global.");
    setGlobalRows([]);
  } finally {
    setLoading(false);
  }
}


  /* -------------------- Load by tab -------------------- */
  useEffect(() => {
    if (!ready) return;
    if (activeTab === "tournament") fetchTournament();
    else if (activeTab === "weekly") fetchWeekly();
    else fetchGlobal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ready]);

  const isEmpty = useMemo(() => {
    if (activeTab === "tournament") return tournamentRows.length === 0;
    if (activeTab === "weekly") return weeklyRows.length === 0;
    return globalRows.length === 0;
  }, [activeTab, tournamentRows, weeklyRows, globalRows]);

  /* -------------------- UI -------------------- */
  return (
    <GlowFrame
  tone={activeTab === "weekly" ? "orange" : activeTab === "global" ? "green" : "mixed"}
  className="p-0 overflow-x-auto"
>


    <div className="container py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Leaderboards</h1>
        <span className="chip chip-primary">
          {activeTab === "tournament" ? "Tournament" : activeTab === "weekly" ? "Weekly" : "Global"} فعال
        </span>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          className={`btn ${activeTab === "tournament" ? "btn-primary" : "btn-ghost"}`}
          aria-pressed={activeTab === "tournament"}
          onClick={() => setActiveTab("tournament")}
        >
          Tournament
        </button>
        <button
          className={`btn ${activeTab === "weekly" ? "btn-primary" : "btn-ghost"}`}
          aria-pressed={activeTab === "weekly"}
          onClick={() => setActiveTab("weekly")}
        >
          Weekly
        </button>
        <button
          className={`btn ${activeTab === "global" ? "btn-primary" : "btn-ghost"}`}
          aria-pressed={activeTab === "global"}
          onClick={() => setActiveTab("global")}
        >
          Global
        </button>
      </div>

      {errorMsg && (
        <div className="card bg-red-900/30 border border-red-500 text-red-200 p-3 mb-4">
          <b>خطا:</b> {errorMsg}
        </div>
      )}

      <div className="card p-0 overflow-x-auto">
        {activeTab === "tournament" && (
          <>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Tournament</th>
                  <th>Status</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {tournamentRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.rank ?? i + 1}</td>
                    <td>{r.player ?? "-"}</td>
                    <td>{r.tournament ?? "-"}</td>
                    <td>{r.status ?? "-"}</td>
                    <td>{r.score ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && (
              <div className="px-4 py-2 text-xs opacity-60">{tournamentRows.length} ردیف</div>
            )}
          </>
        )}

        {activeTab === "weekly" && (
          <>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Week</th>
                  <th>Game</th>
                  <th>Player</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {weeklyRows.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{r.type}</td>
                    <td>{r.week_start}</td>
                    <td>{r.game ?? "-"}</td>
                    <td>{r.player ?? "-"}</td>
                    <td>{r.reason ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && (
              <div className="px-4 py-2 text-xs opacity-60">{weeklyRows.length} هایلایت</div>
            )}
          </>
        )}

        {activeTab === "global" && (
          <>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Total Score</th>
                  <th>Game</th>
                  <th>Player</th>
                </tr>
              </thead>
              <tbody>
                {globalRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.rank_global ?? i + 1}</td>
                    <td>{r.total_score ?? 0}</td>
                    <td>{r.game ?? "-"}</td>
                    <td>{r.player ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && (
              <div className="px-4 py-2 text-xs opacity-60">{globalRows.length} ردیف</div>
            )}
          </>
        )}

        {!loading && isEmpty && (
          <div className="p-4 text-center opacity-70">
            داده‌ای برای {activeTab === "global" ? "Global" : activeTab === "weekly" ? "Weekly" : "Tournament"} نیست.
          </div>
        )}
        {loading && <div className="p-4 text-center">در حال بارگذاری…</div>}
      </div>
    </div>
    </GlowFrame>
  );
}
