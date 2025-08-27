// src/lib/sitemapData.ts
export type Status = "done" | "wip" | "todo";
export type Item = { label: string; href?: string; note?: string; status?: Status; ext?: boolean };
export type Section = { title: string; items: Item[] };

export const SITEMAP_SECTIONS: Section[] = [
  // ---- Play & Compete
  {
    title: "Play & Compete",
    items: [
      { label: "Tournaments", href: "/tournaments", status: "done" },
      { label: "Leaderboards", href: "/leaderboards", status: "done" },
      { label: "Weekly Highlights", href: "/highlights", status: "done" },
      { label: "Tournament Detail", note: "/tournaments/[id]", status: "done" },
      { label: "Events Calendar", note: "/events", status: "todo" },
    ],
  },

  // ---- Games
  {
    title: "Games",
    items: [
      { label: "Games Directory (Admin)", href: "/admin/games", note: "CRUD", status: "wip" },
      { label: "COD: Mobile", href: "/tournaments?game=codm", status: "done" },
      { label: "Warzone", href: "/tournaments?game=warzone", status: "done" },
      { label: "General (All Games)", href: "/tournaments?game=general", status: "done" },
      { label: "Game Page", note: "/g/[slug]", status: "todo" },
      { label: "Players of a Game", note: "/g/[slug]/players", status: "todo" },
      { label: "Leaderboards of a Game", note: "/g/[slug]/leaderboards", status: "todo" },
    ],
  },

  // ---- Community & Social
  {
    title: "Community",
    items: [
      { label: "Public Profiles", note: "/u/[username]", status: "wip" },
      { label: "Players Directory", note: "/players", status: "todo" },
      { label: "Creators / YouTubers", note: "/creators", status: "todo" },
      { label: "Gamenets", note: "/gamenets", status: "todo" },
      { label: "Discover", note: "/discover", status: "todo" },
      { label: "Follow / Unfollow", note: "feature", status: "wip" },
      { label: "Teams / Clans", note: "/teams", status: "todo" },
      { label: "Search", note: "/search", status: "todo" },
    ],
  },

  // ---- Content & Media
  {
    title: "Content & Media",
    items: [
      { label: "Feed", note: "/feed", status: "todo" },
      { label: "Posts", note: "/posts", status: "todo" },
      { label: "Clips / Highlights", note: "/clips", status: "todo" },
      { label: "Streams", note: "/streams", status: "todo" },
      { label: "Creator Program", note: "/creator-program", status: "todo" },
      { label: "Brand Kit", note: "/brand", status: "todo" },
    ],
  },

  // ---- Account
  {
    title: "Account",
    items: [
      { label: "Login / Signup", href: "/auth", status: "done" },
      { label: "New Password", href: "/auth/new-password", status: "done" },
      { label: "Profile", href: "/profile", status: "done" },
      { label: "User Settings", href: "/settings", status: "done" },
      { label: "Notifications", note: "/notifications", status: "todo" },
      { label: "Messages", note: "/messages", status: "todo" },
    ],
  },

  // ---- Admin & Ops
  {
    title: "Admin",
    items: [
      { label: "Dashboard", href: "/admin", status: "done" },
      { label: "Manage Tournaments", href: "/admin/tournaments", status: "done" },
      { label: "Manage Games", href: "/admin/games", status: "wip" },
      { label: "Theme & Site Settings", href: "/admin/settings", status: "done" },
      { label: "Reports / Analytics", note: "/admin/reports", status: "todo" },
      { label: "User Management", note: "/admin/users", status: "todo" },
    ],
  },

  // ---- Info & Legal
  {
    title: "Info",
    items: [
      { label: "About", note: "/about", status: "todo" },
      { label: "Help / FAQ", note: "/help", status: "todo" },
      { label: "Terms", note: "/legal/terms", status: "todo" },
      { label: "Privacy", note: "/legal/privacy", status: "todo" },
      { label: "Contact", note: "/contact", status: "todo" },
    ],
  },
];
