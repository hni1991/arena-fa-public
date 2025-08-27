"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SITEMAP_SECTIONS, Item, Section, Status } from "@/lib/sitemapData";

type Filters = { showDone: boolean; showWip: boolean; showTodo: boolean; q: string };

const statusOf = (i: Item): Status => i.status ?? (i.href ? "done" : "todo");

function SectionProgress({ section }: { section: Section }) {
  const { done, wip, todo } = section.items.reduce(
    (acc, it) => {
      const s = statusOf(it);
      acc[s] += 1;
      return acc;
    },
    { done: 0, wip: 0, todo: 0 }
  );
  const total = done + wip + todo || 1;
  const donePct = Math.round((done / total) * 100);
  const wipPct = Math.round((wip / total) * 100);

  return (
    <div className="progress mb-3">
      <div className="bar" style={{ width: `${donePct}%`, background: "#22c55e" }} />
      <div className="bar" style={{ width: `${wipPct}%`, background: "#f59e0b", marginTop: -8 }} />
    </div>
  );
}

function StatusChip({ s }: { s: Status }) {
  return <span className={`chip status-${s}`}>{s.toUpperCase()}</span>;
}

export default function SiteMapPage() {
  const [filters, setFilters] = useState<Filters>({ showDone: true, showWip: true, showTodo: true, q: "" });

  const flat = useMemo(() => {
    const rows: { section: string; item: Item; status: Status }[] = [];
    for (const sec of SITEMAP_SECTIONS) {
      for (const it of sec.items) rows.push({ section: sec.title, item: it, status: statusOf(it) });
    }
    return rows;
  }, []);

  const counters = useMemo(
    () =>
      flat.reduce(
        (acc, r) => {
          acc[r.status] += 1;
          return acc;
        },
        { done: 0, wip: 0, todo: 0 }
      ),
    [flat]
  );

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const pass = (s: Status) =>
      (s === "done" && filters.showDone) ||
      (s === "wip" && filters.showWip) ||
      (s === "todo" && filters.showTodo);

    return SITEMAP_SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.filter((it) => {
        const s = statusOf(it);
        if (!pass(s)) return false;
        if (!q) return true;
        const hay = `${it.label} ${it.note ?? ""} ${sec.title}`.toLowerCase();
        return hay.includes(q);
      }),
    })).filter((sec) => sec.items.length > 0);
  }, [filters]);

  const tasks = useMemo(() => {
    const lines: string[] = [];
    for (const sec of SITEMAP_SECTIONS) {
      for (const it of sec.items) {
        const s = statusOf(it);
        if (s !== "done") lines.push(`- [${s.toUpperCase()}] ${sec.title} → ${it.label} ${it.note ? `(${it.note})` : ""}`);
      }
    }
    return lines.join("\n");
  }, []);

  const copyTasks = async () => {
    try {
      await navigator.clipboard.writeText(tasks);
      alert("لیست تسک‌ها کپی شد ✅");
    } catch {
      alert("کپی به کلیپ‌بورد ناموفق بود.");
    }
  };

  return (
    <main className="container py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold mb-1">Site Map & Roadmap</h1>
          <p className="opacity-75">
            وضعیت: <b>{counters.done}</b> done — <b>{counters.wip}</b> wip — <b>{counters.todo}</b> todo
          </p>
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <input
            className="input"
            placeholder="جستجو…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
          <label className="chip">
            <input type="checkbox" checked={filters.showDone} onChange={(e) => setFilters((f) => ({ ...f, showDone: e.target.checked }))} /> Done
          </label>
          <label className="chip">
            <input type="checkbox" checked={filters.showWip} onChange={(e) => setFilters((f) => ({ ...f, showWip: e.target.checked }))} /> WIP
          </label>
          <label className="chip">
            <input type="checkbox" checked={filters.showTodo} onChange={(e) => setFilters((f) => ({ ...f, showTodo: e.target.checked }))} /> To‑Do
          </label>
          <button className="btn btn-ghost" onClick={copyTasks}>Copy Tasks</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {filtered.map((sec) => (
          <section key={sec.title} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{sec.title}</h2>
            </div>
            <SectionProgress section={sec} />
            <ul className="space-y-2">
              {sec.items.map((it) => {
                const s = statusOf(it);
                return (
                  <li key={it.label + (it.note ?? "")} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      {it.href ? (
                        <Link href={it.href} className="hover:underline underline-offset-4 break-words">
                          {it.label}
                        </Link>
                      ) : (
                        <span className="opacity-80">{it.label}</span>
                      )}
                      {it.note ? <span className="ms-2 opacity-60 text-xs">{it.note}</span> : null}
                    </div>
                    <StatusChip s={s} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <section className="card p-5 mt-6">
        <h3 className="text-base font-semibold mb-3">Next up (WIP & To‑Do)</h3>
        <pre className="text-xs whitespace-pre-wrap opacity-80">{tasks}</pre>
      </section>
    </main>
  );
}
