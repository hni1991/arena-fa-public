"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient"; // اگر export پیش‌فرض دارید: import supabase from "@/lib/supabaseClient";

type Game = {
  id: string;
  title: string;
  active: boolean;
};

type RawGame = {
  id: string;
  title?: string | null;
  name?: string | null; // در صورت قدیمی بودن اسکیمای جدول
  active?: boolean | null;
};

export default function AdminGamesPage() {
  const { user, profile, loading } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [deleting, setDeleting] = useState<Game | null>(null);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .from("games")
        .select("id,title,active");
      if (error) {
        setErrorMsg(error.message);
      } else {
        const mapped =
          (data as RawGame[]).map((g) => ({
            id: g.id,
            title: (g.title ?? g.name ?? "").trim(),
            active: Boolean(g.active),
          })) ?? [];
        // مرتب‌سازی الفبایی
        mapped.sort((a, b) => a.title.localeCompare(b.title, "fa"));
        setGames(mapped);
      }
      setFetching(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => g.title.toLowerCase().includes(q));
  }, [games, search]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (g: Game) => {
    setEditing(g);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  async function handleSave(form: { title: string; active: boolean }) {
    setSaving(true);
    try {
      if (editing) {
        // optimistic update
        setGames((prev) =>
          prev.map((g) =>
            g.id === editing.id ? { ...g, title: form.title, active: form.active } : g
          )
        );
        const { error } = await supabase
          .from("games")
          .update({ title: form.title, active: form.active })
          .eq("id", editing.id);
        if (error) throw error;
        showToast("بروزرسانی شد ✅");
      } else {
        const optimistic: Game = {
          id: `tmp-${Date.now()}`,
          title: form.title,
          active: form.active,
        };
        setGames((prev) => [optimistic, ...prev]);
        const { data, error } = await supabase
          .from("games")
          .insert({ title: form.title, active: form.active })
          .select("id,title,active")
          .single();
        if (error) throw error;
        setGames((prev) =>
          [ { id: data.id, title: data.title, active: data.active }, ...prev.filter((g) => g.id !== optimistic.id) ]
            .sort((a, b) => a.title.localeCompare(b.title, "fa"))
        );
        showToast("بازی اضافه شد ✅");
      }
      closeModal();
    } catch (e: any) {
      setErrorMsg(e.message ?? "خطای نامشخص");
      // rollback ساده: رفرش لیست
      const { data } = await supabase.from("games").select("id,title,active");
      if (data) {
        const mapped = (data as RawGame[]).map((g) => ({
          id: g.id,
          title: (g.title ?? g.name ?? "").trim(),
          active: Boolean(g.active),
        }));
        mapped.sort((a, b) => a.title.localeCompare(b.title, "fa"));
        setGames(mapped);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(g: Game) {
    // optimistic
    setGames((prev) => prev.map((x) => (x.id === g.id ? { ...x, active: !x.active } : x)));
    const { error } = await supabase
      .from("games")
      .update({ active: !g.active })
      .eq("id", g.id);
    if (error) {
      // rollback
      setGames((prev) => prev.map((x) => (x.id === g.id ? { ...x, active: g.active } : x)));
      setErrorMsg(error.message);
    } else {
      showToast(`وضعیت فعال ${!g.active ? "شد" : "غیرفعال شد"} ✅`);
    }
  }

  async function handleDelete(game: Game) {
    setDeleting(null);
    // optimistic remove
    const prev = games;
    setGames((cur) => cur.filter((g) => g.id !== game.id));
    const { error } = await supabase.from("games").delete().eq("id", game.id);
    if (error) {
      setGames(prev); // rollback
      setErrorMsg(error.message);
    } else {
      showToast("حذف شد 🗑️");
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="card p-6 animate-pulse">در حال بارگذاری…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="card p-6">
          برای دسترسی، ابتدا وارد شوید.{" "}
          <a className="btn inline-block ml-2" href="/auth">
            ورود
          </a>
        </div>
      </div>
    );
  }

  if (!profile?.is_admin) {
    return (
      <div className="p-6">
        <div className="card p-6 border-2 border-red-400">
          دسترسی محدود است. این بخش فقط برای ادمین‌هاست.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">مدیریت بازی‌ها</h1>
          <p className="text-sm opacity-70">
            افزودن، ویرایش، فعال/غیرفعال کردن و حذف بازی‌ها
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input"
            placeholder="جستجوی عنوان بازی…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search games"
          />
          <button className="btn" onClick={openCreate}>
            + افزودن بازی
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="card p-4 border border-red-300 bg-red-50 text-red-700">
          خطا: {errorMsg}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="text-right p-3">عنوان</th>
                <th className="text-right p-3">وضعیت</th>
                <th className="text-right p-3 w-40">اکشن‌ها</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr>
                  <td className="p-3" colSpan={3}>
                    در حال دریافت لیست…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="p-6 text-center opacity-70" colSpan={3}>
                    چیزی پیدا نشد.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr key={g.id} className="border-t">
                    <td className="p-3">{g.title}</td>
                    <td className="p-3">
                      <button
                        className={`chip ${g.active ? "bg-green-100" : "bg-gray-100"}`}
                        onClick={() => handleToggleActive(g)}
                        aria-label={`toggle active for ${g.title}`}
                        title="Toggle Active"
                      >
                        {g.active ? "فعال" : "غیرفعال"}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <button className="btn" onClick={() => openEdit(g)}>
                          ویرایش
                        </button>
                        <button
                          className="btn"
                          style={{ background: "#fee2e2", color: "#991b1b" }}
                          onClick={() => setDeleting(g)}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <GameFormModal
          initial={editing ?? undefined}
          open={modalOpen}
          onClose={closeModal}
          onSubmit={handleSave}
          saving={saving}
        />
      )}

      {deleting && (
        <ConfirmDelete
          title={`حذف "${deleting.title}"؟`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => handleDelete(deleting)}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow card"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------------------- Components (داخل همین فایل) ---------------------- */

function GameFormModal(props: {
  initial?: Game;
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (form: { title: string; active: boolean }) => void;
}) {
  const { initial, onClose, onSubmit, saving } = props;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [err, setErr] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) {
      setErr("عنوان نمی‌تواند خالی باشد.");
      return;
    }
    onSubmit({ title: title.trim(), active });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="card w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">
          {initial ? "ویرایش بازی" : "افزودن بازی"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block mb-1">عنوان</span>
            <input
              className="input w-full"
              placeholder="مثلاً Call of Duty: Black Ops 6"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span>فعال باشد</span>
          </label>

          {err && (
            <div className="p-2 rounded border border-red-300 bg-red-50 text-red-700 text-sm">
              {err}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn" onClick={onClose}>
              انصراف
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "در حال ذخیره…" : initial ? "ذخیره" : "افزودن"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDelete(props: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { title, onCancel, onConfirm } = props;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      aria-modal="true"
      role="dialog"
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="opacity-80 mb-4">
          این عملیات غیرقابل بازگشت است. مطمئنی؟
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onCancel}>
            انصراف
          </button>
          <button
            className="btn"
            style={{ background: "#fee2e2", color: "#991b1b" }}
            onClick={onConfirm}
          >
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}
