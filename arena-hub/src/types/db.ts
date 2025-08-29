// src/types/db.ts
// تایپ‌های سبک و امن برای فرانت (وابسته به شکل فعلی جداول)

export type Game = {
  id: number | string;
  slug: string;
  title: string;
  active: boolean;
  description: string | null;
  official_url: string | null;
  banner_url: string | null;   // ممکن است لینک مستقیم یا مسیر استوریج باشد
  banner_path?: string | null; // اگر جداگانه استفاده شود
};

export type Clan = {
  id: string;
  name: string;
  tag: string | null;
  logo_url: string | null;
};

export type Tournament = {
  id: string;
  title: string;
  status: "upcoming" | "active" | "finished";
  starts_at: string | null;
  ends_at: string | null;
  game_id: number | string;
};

export type LeaderRow = {
  user_id: string;
  total_score: number;
  rank_global: number | null;
  // مرحله‌ای پروفایل را می‌کشیم؛ این فیلد بعداً پر می‌شود:
  profile?: { username: string | null; avatar_url: string | null } | null;
};

export type Highlight = {
  id: number;
  week_start: string;
  user_id: string | null;
  reason: string | null;
  // مرحله‌ای پروفایل را می‌کشیم
  profile?: { username: string | null; avatar_url: string | null } | null;
};

export type MemberRow = {
  user_id: string;
  joined_at: string | null;
  profile?: { username: string | null; avatar_url: string | null } | null;
};
