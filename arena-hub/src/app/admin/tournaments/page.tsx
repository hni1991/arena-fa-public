"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";

type Status = "upcoming" | "active" | "finished";
type Game = { id: string; title: string };
type TRow = {
  id: string;
  title: string;
  game_id: string;
  status: Status;
  starts_at: string;
  ends_at: string | null;
  description: string | null;
};
export async function createTournament(payload: {
  title: string;
  game_id: number;
  status: "upcoming" | "active" | "finished";
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  description?: string;
}) {
  const { error } = await supabase.from("tournaments").insert(payload);
  if (error) throw error;
}

// لیست برای جدول پایین صفحه
export async function listTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id,title,status,start_date,end_date, games(title)")
    .order("id", { ascending: false });
  if (error) throw error;
  return data;
}
export default function AdminTournamentsPage() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [rows, setRows] = useState<TRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<{
    title: string;
    game_id: string;
    status: Status;
    starts_at: string; // yyyy-mm-dd
    ends_at: string;   // yyyy-mm-dd
    description: string;
  }>({
    title: "",
    game_id: "",
    status: "upcoming",
    starts_at: "",
    ends_at: "",
    description: "",
  });

  const load = async () => {
    const { data: gs } = await supabase
      .from("games")
      .select("id,title")
      .eq("active", true)
      .order("title");
    setGames(gs ?? []);

    const { data: ts } = await supabase
      .from("tournaments")
      .select("id,title,game_id,status,starts_at,ends_at,description")
      .order("starts_at", { ascending: false });
    setRows(ts ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const createTournament = async () => {
    if (!form.title || !form.game_id || !form.starts_at) {
      return setError("عنوان، بازی و تاریخ شروع الزامی است");
    }
    setSaving(true);
    setError(null);

    const payload = {
      title: form.title,
      game_id: form.game_id,
      status: form.status,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      description: form.description || null,
      created_by: user?.id ?? null,
    };

    const { error } = await supabase.from("tournaments").insert(payload);
    if (error) setError(error.message);
    else {
      await load();
      setForm({
        title: "",
        game_id: "",
        status: "upcoming",
        starts_at: "",
        ends_at: "",
        description: "",
      });
    }
    setSaving(false);
  };

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-bold">مدیریت تورنمنت‌ها</h1>

      <div className="card grid md:grid-cols-5 gap-3 items-end">
        <input
          className="input md:col-span-2"
          placeholder="عنوان"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <select
          className="input"
          value={form.game_id}
          onChange={(e) => setForm({ ...form, game_id: e.target.value })}
        >
          <option value="">— انتخاب بازی —</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
        >
          <option value="upcoming">upcoming</option>
          <option value="active">active</option>
          <option value="finished">finished</option>
        </select>
        <input
          className="input"
          type="date"
          value={form.starts_at}
          onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
        />
        <input
          className="input"
          type="date"
          value={form.ends_at}
          onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
        />

        <textarea
          className="input md:col-span-4"
          placeholder="توضیحات"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button className="btn md:col-span-1" disabled={saving} onClick={createTournament}>
          ایجاد
        </button>
        {error && <p className="text-red-400 text-sm md:col-span-5">{error}</p>}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>#</th>
            <th>عنوان</th>
            <th>بازی</th>
            <th>وضعیت</th>
            <th>تاریخ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={t.id}>
              <td>{i + 1}</td>
              <td>{t.title}</td>
              <td>{games.find((g) => g.id === t.game_id)?.title ?? "—"}</td>
              <td>{t.status}</td>
              <td>
                {new Date(t.starts_at).toLocaleDateString()}{" "}
                {t.ends_at ? `→ ${new Date(t.ends_at).toLocaleDateString()}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
