"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import AdminGate from "@/components/AdminGate"; // اگر داری؛ وگرنه خودت چک is_admin کن
import ClanBannerUpload from "@/components/ClanBannerUpload";

type Clan = {
  id: string;
  name: string;
  tag: string | null;
  description: string | null;
  logo_url: string | null;
  game_id: string | null;
};

type Game = { id: string; title: string };

export default function AdminClansPage() {
  const { ready, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Clan[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = rows.find(r => r.id === activeId) || null;

  async function load() {
    setLoading(true); setErr(null);
    try {
      const [{ data: c, error: ce }, { data: g, error: ge }] = await Promise.all([
        supabase.from("clans").select("id,name,tag,description,logo_url,game_id").order("created_at", { ascending: false }),
        supabase.from("games").select("id,title").eq("active", true).order("title"),
      ]);
      if (ce) throw ce; if (ge) throw ge;
      setRows((c ?? []) as Clan[]);
      setGames((g ?? []) as Game[]);
      if (!activeId && c && c.length) setActiveId(c[0].id);
    } catch (e: any) {
      setErr(e?.message ?? "خطا در دریافت کلن‌ها");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (ready) load(); }, [ready]);

  async function save(form: Partial<Clan>) {
    if (!active) return;
    const payload: any = {
      name: form.name ?? active.name,
      tag: (form.tag ?? active.tag) || null,
      description: (form.description ?? active.description) || null,
      game_id: (form.game_id ?? active.game_id) || null,
    };
    const { error } = await supabase.from("clans").update(payload).eq("id", active.id);
    if (error) { alert(error.message); return; }
    await load();
  }

  return (
    <AdminGate>
      <main className="container py-8 grid gap-6">
        <header>
          <h1 className="text-2xl font-semibold">مدیریت کلن‌ها</h1>
          <p className="opacity-75 text-sm">ویرایش نام/تگ/توضیحات، تعیین بازی، و آپلود بنر.</p>
        </header>

        {err ? <div className="card p-3">{err}</div> : null}

        <section className="grid md:grid-cols-[260px_1fr] gap-4">
          {/* لیست کلن‌ها */}
          <aside className="card p-2 h-max">
            <div className="text-sm font-semibold opacity-80 mb-2 px-2">کلن‌ها</div>
            <ul className="grid">
              {loading ? <li className="px-2 py-2 opacity-60">در حال بارگذاری…</li> :
                rows.map(r => (
                  <li key={r.id}>
                    <button
                      className={`w-full text-right px-3 py-2 rounded-md transition ${activeId === r.id ? "bg-white/10" : "hover:bg-white/5"}`}
                      onClick={() => setActiveId(r.id)}
                    >
                      {r.name} {r.tag ? <span className="opacity-70">({r.tag})</span> : null}
                    </button>
                  </li>
                ))
              }
            </ul>
          </aside>

          {/* فرم ویرایش */}
          <div className="card p-4 grid gap-4">
            {!active ? (
              <div className="opacity-75">کلنی انتخاب نشده.</div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm opacity-80">نام کلن</label>
                    <input
                      className="input"
                      defaultValue={active.name}
                      onBlur={(e)=>save({ name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm opacity-80">تگ (Unique)</label>
                    <input
                      className="input"
                      defaultValue={active.tag ?? ""}
                      onBlur={(e)=>save({ tag: e.target.value || null })}
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <label className="text-sm opacity-80">توضیحات</label>
                    <textarea
                      className="input min-h-[80px]"
                      defaultValue={active.description ?? ""}
                      onBlur={(e)=>save({ description: e.target.value || null })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm opacity-80">بازی</label>
                    <select
                      className="input"
                      defaultValue={active.game_id ?? ""}
                      onChange={(e)=>save({ game_id: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {games.map(g=> <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm opacity-80">بنر / کاور</label>
                  <ClanBannerUpload
                    clanId={active.id}
                    value={active.logo_url ?? null}
                    onUploaded={() => load()}
                  />
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </AdminGate>
  );
}
