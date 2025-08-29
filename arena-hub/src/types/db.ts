// یک منبع واحد برای تایپ‌ها که دقیقاً با SELECT های فعلی مچ است.

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export type Game = {
  id: number | string;
  slug: string;
  title: string;
  active: boolean;
  banner_path?: string | null;
  banner_url?: string | null;
  description?: string | null;
  official_url?: string | null;
};

export type Clan = {
  id: string;
  name: string;
  tag: string | null;
  logo_url: string | null;
  game_id?: number | string;
};

export type Tournament = {
  id: string;
  title: string;
  status: "upcoming" | "active" | "finished";
  starts_at: string | null;
  ends_at: string | null;
  game_id?: number | string;
};

export type LeaderRow = {
  user_id: string;
  total_score: number;
  rank_global: number | null;
  // دقیقا همون چیزی که select می‌گیریم: profiles(username,avatar_url)
  profiles: { username: string | null; avatar_url: string | null } | null;
};

export type Highlight = {
  id: number;
  week_start: string;
  user_id: string | null;
  reason: string | null;
  // یادآوری: توی SELECT نوع رو نمی‌گیریم، چون eq("type","youtuber") زدیم
  // پس فیلد type اینجا لازم نیست.
};
