
ArenaFA – Test Dataset (CSV)
Password for ALL accounts: 22334455

FILES
-----
- auth_seed.csv
  Columns: email,password,username,role,is_admin
  Use this to programmatically create users (Supabase Auth). After signup, trigger will create `profiles` rows automatically.
  ⚠️ If you import this, DO NOT also import profiles.csv (to avoid duplicates).

- profiles.csv (optional fallback)
  Direct rows for `public.profiles` if your trigger is disabled. IDs are deterministic UUID-like strings (will not match Auth IDs automatically).

- games.csv
  Includes id, title, slug, active, description, website, banner_url, banner_path.

- tournaments.csv
- tournament_participants_by_username.csv
- leaderboard_by_username.csv
  These refer to users by username for readability. After you seed Auth, you can map username → user_id and insert to real tables.

- weekly_highlights.csv
  Uses user_username; you can map to user_id post-auth.

- site_settings.csv

SUGGESTED ORDER
---------------
1) Import games.csv
2) Import site_settings.csv
3) Run a small script to create users using auth_seed.csv (so profiles are auto-created by trigger).
4) After profiles exist with correct user_id, convert *_by_username.csv to actual tables using a mapping JOIN (username -> profiles.id).

Quick pseudo-SQL for mapping after Auth seed:
  insert into tournament_participants (tournament_id, user_id, score, rank)
  select tp.tournament_id, p.id, tp.score, tp.rank
  from temp_tp_by_username tp
  join profiles p on p.username = tp.user_username;

(Do the same pattern for leaderboard and weekly_highlights.)

BUCKETS
-------
If you use storage for game banners, set `banner_path` and keep bucket policy public-read.
Otherwise set direct CDN links in `banner_url`.
