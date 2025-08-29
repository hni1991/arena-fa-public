// src/types/db.ts
// هم‌راستا با schema.prisma و دیتابیس فعلی

// --- Users / Profiles
export type Profile = {
  id: string;                 // auth.uid
  username: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_admin?: boolean | null;
  created_at?: string | null;
};

// --- Games
export type Game = {
  id: number;                 // اگر در DB integer است
  slug: string;
  title: string;
  active: boolean;            // ✅ نه is_active
  description?: string | null;
  official_url?: string | null;
  banner_url?: string | null; // لینک مستقیم (یا امضا شده)
  youtube?: string | null;
  created_at?: string | null;
};

// --- Tournaments
export type TournamentStatus = "upcoming" | "active" | "finished";

export type Tournament = {
  id: string;
  title: string;
  game_id: number;            // متناسب با نوع id بازی
  status: TournamentStatus;
  starts_at: string | null;   // ✅ نه start_date
  ends_at: string | null;     // ✅ نه end_date
  description?: string | null;
  created_by?: string | null; // uid
  created_at?: string | null;
};

// --- Clans
export type Clan = {
  id: string;
  game_id: number;
  name: string;
  tag?: string | null;
  logo_url?: string | null;
};

// --- Weekly Highlights
export type HighlightType = "user" | "youtuber" | "gamenet";

export type Highlight = {
  id: number;
  type: HighlightType;
  week_start: string;         // YYYY-MM-DD
  game_id?: number | null;
  user_id?: string | null;
  reason?: string | null;
};

// --- Leaderboard (نمای لیست)
export type LeaderRow = {
  user_id: string;
  game_id?: number | null;
  total_score: number;
  rank_global?: number | null;
  profiles?: { username?: string | null; avatar_url?: string | null } | null;
};
