// src/types/db.ts

// ---- Games ----
export type Game = {
  id: number;               // Prisma/DB: integer (serial)
  slug: string;             // مثل "CODM" , "BO6"
  title: string;
  active: boolean;          // ✅ ستون نهایی (به‌جای is_active)
  description?: string | null;
  official_url?: string | null;
  banner_path?: string | null;  // مسیر داخل باکت
  banner_url?: string | null;   // لینک مستقیم (در صورت ذخیره)
  // فیلدهای قدیمی که بعضی صفحه‌ها هنوز صدا می‌زنند:
  website?: string | null;      // (اختیاری برای سازگاری)
  youtube?: string | null;      // (اختیاری برای سازگاری)
};

// ---- Tournaments ----
export type TournamentStatus = 'upcoming' | 'active' | 'finished';

export type Tournament = {
  id: string;
  game_id?: string | number | null;
  title: string;
  status: TournamentStatus;
  // تاریخ‌ها: هر دو حالت را پشتیبانی می‌کنیم تا ارور نده
  starts_at?: string | null;   // شکل نهایی
  ends_at?: string | null;     // شکل نهایی
  // شکل‌های قدیمی/متناظر برای سازگاری
  start_at?: string | null;
  end_at?: string | null;
  start_date?: string | null;  // YYYY-MM-DD
  end_date?: string | null;    // YYYY-MM-DD
};

// نرمالایزر امن تاریخ برای UI
export function normStartISO(t: Tournament): string | null {
  return t.starts_at ?? t.start_at ?? (t.start_date ? `${t.start_date}T00:00:00Z` : null);
}
export function normEndISO(t: Tournament): string | null {
  return t.ends_at ?? t.end_at ?? (t.end_date ? `${t.end_date}T23:59:59Z` : null);
}

// ---- Clans ----
export type Clan = {
  id: string;
  game_id?: string | number | null;
  name: string;
  tag?: string | null;
  logo_url?: string | null;
};

// ---- Profiles / Leaderboard / Highlights ----
export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export type LeaderRow = {
  user_id: string;
  total_score: number;
  rank_global: number | null;
  profiles: { username?: string | null; avatar_url?: string | null } | null;
};

export type HighlightType = 'user' | 'youtuber' | 'gamenet';

export type Highlight = {
  id: number;
  type: HighlightType;
  week_start: string;         // YYYY-MM-DD
  user_id: string | null;
  game_id?: string | null;
  reason?: string | null;
};
