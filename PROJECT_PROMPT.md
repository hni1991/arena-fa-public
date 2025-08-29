# 🎮 ArenaFA – Project Prompt (Updated)

## 📌 Vision
ArenaFA is a **Persian Gaming Hub** bringing together tournaments, leaderboards, weekly highlights, gamers, streamers, and communities — all in one modern platform.  

---

## 🏗️ Tech Stack
- **Framework:** Next.js 15 + React 19  
- **Database:** Supabase (Postgres)  
- **ORM:** Prisma (types, migrations, seeding)  
- **Auth:** Supabase Auth (Email/Password)  
- **Styling:** TailwindCSS + Custom UI (dark mode, Persian RTL support)  
- **Infra:** GitHub (private → mirrored to public), Husky + Lint-Staged for pre-commit hooks  

---

## 🔑 Current Environment
- `NEXT_PUBLIC_SUPABASE_URL` → Supabase Project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Public anon key  
- `DATABASE_URL` → Prisma migrations (via Supabase pooler, 6543/pgbouncer)  
- `DIRECT_URL` → Direct DB access (5432)  

Prisma now works correctly (`schema.prisma` is synced with Supabase).  

---

## 📂 Core Modules
- **Auth & Accounts** → Sign up, login, reset password, profiles  
- **Games** → Directory, game pages (slug-based), clans, banners, leaderboards, tournaments  
- **Play & Compete** → Tournaments, weekly highlights, events calendar  
- **Community** → Profiles, players, creators/YouTubers, gamenets, follow system, teams/clans  
- **Content & Media** → Feed, posts, clips, streams, brand kit, creator program  
- **Admin** → Dashboard, manage games, tournaments, clans, highlights, site settings  

---

## 📊 Progress
- ✅ **DONE:** Auth, Profile, Admin panels, Tournament CRUD, Game CRUD, Leaderboards base, Weekly Highlights base  
- 🚧 **WIP:** Game Pages by slug (detail page with banner, clans, YouTubers, leaderboard, members)  
- ❌ **TODO:** Feed & Posts, Clips/Highlights, Community follow system, Clans directory, Search, Creator Program  

---

## 📌 Roadmap
See [SITE_MAP.md](./SITE_MAP.md) for detailed breakdown with **TODO / WIP / DONE** status per module.  

---

## 🧩 Checklist
- [x] Supabase Auth wired with custom profile schema  
- [x] Admin dashboard for games, tournaments, clans  
- [x] GitHub mirror set up (manual push working)  
- [x] Prisma schema pulled from Supabase  
- [ ] Full Game slug pages (banner, description, members, clans, yt, tournaments)  
- [ ] Feed/Posts & Content module  
- [ ] Follow / Unfollow system for users and creators  
- [ ] Search + Discover  
- [ ] Clans/Teams directory  

---

## 🔮 Next Steps
1. Finalize **Game slug pages** (banner loading, clans, YouTubers, tournaments, leaderboard, members list + friend request).  
2. Expand **Content & Media** module (feed, posts, clips, streams).  
3. Build **Community features** (follow system, clans directory, search, discover).  
4. Improve **UX/UI redesign** for auth, game detail, and roadmap dashboards.  

---
