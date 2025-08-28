"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type Game = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  website: string | null;
  youtube: string | null;
  banner_url: string | null;
  active: boolean;
};

type RawGame = Partial<Game> & { id: string };

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\- ]+/g, "") // حروف/عدد/زبان فارسی/خط تیره/اسپیس
    .replace(/\s+/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");
}

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
        .select("id,title,slug,description,website,youtube,banner_url,active")
        .order("title");
      if (error) setErrorMsg(error.message);
      const mapped =
        (data as RawGame[] | null)?.map((g) => ({
          id: g.id!,
          title: (g.title ?? "").trim(),
          slug: (g.slug ?? null),
          description: g.description ?? null,
          website: g.website ?? null,
          youtube: g.youtube ?? null,
          banner_url: g.banner_url ?? null,
          active: Boolean(g.active),
        })) ?? [];
      setGames(mapped);
      setFetching(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => g.title.toLowerCase().includes(q) || g.slug?.includes(q));
  }, [games, search]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (g: Game) => { setEditing(g); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(null), 2500); };

  async function handleSave(form: Omit<Game, "id"> & { bannerFile?: File | null; }) {
    setSaving(true); setErrorMsg(null);
    try {
      if (editing) {
        // به‌روزرسانی
        const { error } = await supabase.from("games")
          .update({
            title: form.title.trim(),
            slug: form.slug ? form.slug.trim() : null,
            description: form.description || null,
            website: form.website || null,
            youtube: form.youtube || null,
            active: form.active,
          })
          .eq("id", editing.id);
        if (error) throw error;

        // بنر (اختیاری)
        if (form.bannerFile) {
          const { url } = await uploadBanner(editing.id, form.bannerFile);
          await supabase.from("games").update({ banner_url: url }).eq("id", editing.id);
        }

        showToast("بروزرسانی شد ✅");
      } else {
        // ساخت ردیف
        const { data, error } = await supabase
          .from("games")
          .insert({
            title: form.title.trim(),
            slug: form.slug?.trim() || slugify(form.title),
            description: form.description || null,
            website: form.website || null,
            youtube: form.youtube || null,
            active: form.active,
          })
          .select("id,title,slug,description,website,youtube,active")
          .single();
        if (error) throw error;

        let banner_url: string | null = null;
        if (form.bannerFile) {
          const up = await uploadBanner(data.id, form.bannerFile);
          banner_url = up.url;
          await supabase.from("games").update({ banner_url }).eq("id", data.id);
        }

        // refresh محلی
        setGames(prev => [
          ...prev,
          {
            id: data.id,
            title: data.title,
            slug: data.slug,
            description: data.description,
            website: data.website,
            youtube: data.youtube,
            banner_url,
            active: data.active,
          }
        ].sort((a,b)=>a.title.localeCompare(b.title, "fa")));
        showToast("بازی اضافه شد ✅");
      }
      // ری‌لود سبک
      const { data: list } = await supabase
        .from("games")
        .select("id,title,slug,description,website,youtube,banner_url,active")
        .order("title");
      if (list) setGames(list as Game[]);
      closeModal();
    } catch (e:any) {
      setErrorMsg(e.message ?? "خطای نامشخص");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(g: Game) {
    setGames(prev => prev.map(x => x.id===g.id?{...x,active:!x.active}:x));
    const { error } = await supabase.from("games").update({ active: !g.active }).eq("id", g.id);
    if (error) {
      setGames(prev => prev.map(x => x.id===g.id?{...x,active:g.active}:x));
      setErrorMsg(error.message);
    } else { showToast(`وضعیت ${!g.active?"فعال":"غیرفعال"} شد ✅`); }
  }

  async function handleDelete(game: Game) {
    setDeleting(null);
    const prev = games;
    setGames(cur => cur.filter(g => g.id!==game.id));
    const { error } = await supabase.from("games").delete().eq("id", game.id);
    if (error){ setGames(prev); setErrorMsg(error.message); }
    else showToast("حذف شد 🗑️");
  }

  if (loading) return <div className="p-6"><div className="card p-6 animate-pulse">در حال بارگذاری…</div></div>;
  if (!user) return <div className="p-6"><div className="card p-6">برای دسترسی وارد شوید. <a className="btn inline-block ml-2" href="/auth">ورود</a></div></div>;
  if (!profile?.is_admin) return <div className="p-6"><div className="card p-6 border-2 border-red-400">فقط ادمین‌ها</div></div>;

  return (
    <div className="p-6 space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">مدیریت بازی‌ها</h1>
          <p className="text-sm opacity-70">افزودن/ویرایش، بنر و متادیتا برای صفحهٔ گیم.</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="input" placeholder="جستجوی عنوان یا اسلاگ…" value={search} onChange={(e)=>setSearch(e.target.value)} />
          <button className="btn" onClick={openCreate}>+ افزودن بازی</button>
        </div>
      </header>

      {errorMsg && <div className="card p-4 border border-red-300 bg-red-50 text-red-700">خطا: {errorMsg}</div>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="p-3 text-right">بنر</th>
                <th className="p-3 text-right">عنوان</th>
                <th className="p-3 text-right">اسلاگ</th>
                <th className="p-3 text-right">وضعیت</th>
                <th className="p-3 text-right w-56">اکشن‌ها</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr><td className="p-4" colSpan={5}>در حال دریافت…</td></tr>
              ) : filtered.length===0 ? (
                <tr><td className="p-6 text-center opacity-70" colSpan={5}>چیزی پیدا نشد.</td></tr>
              ) : filtered.map(g => (
                <tr key={g.id} className="border-t border-white/10">
                  <td className="p-2">
                    {g.banner_url
                      ? <img src={g.banner_url} alt="" className="w-24 h-12 object-cover rounded" />
                      : <div className="w-24 h-12 rounded bg-white/5 grid place-items-center opacity-60">—</div>}
                  </td>
                  <td className="p-3">{g.title}</td>
                  <td className="p-3 ltr opacity-80">{g.slug || "—"}</td>
                  <td className="p-3">
                    <button className={`chip ${g.active ? "bg-green-100" : "bg-gray-100"}`} onClick={()=>handleToggleActive(g)}>
                      {g.active ? "فعال" : "غیرفعال"}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      <a className="btn-ghost" href={`/games/${g.id}`} target="_blank" rel="noreferrer">نمایش صفحه</a>
                      <button className="btn" onClick={()=>openEdit(g)}>ویرایش</button>
                      <button className="btn" style={{background:"#fee2e2",color:"#991b1b"}} onClick={()=>setDeleting(g)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
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
          onCancel={()=>setDeleting(null)}
          onConfirm={()=>handleDelete(deleting)}
        />
      )}

      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow card">{toast}</div>}
    </div>
  );
}

/** ---------- آپلود بنر به باکت games و برگرداندن URL عمومی ---------- */
async function uploadBanner(gameId: string, file: File): Promise<{ url: string; path: string; }> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${gameId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("games").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("games").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/* ---------------------- Modal ---------------------- */

function GameFormModal(props: {
  initial?: Game;
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (form: Omit<Game,"id"> & { bannerFile?: File | null; }) => void;
}) {
  const { initial, onClose, onSubmit, saving } = props;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState<string>(initial?.slug ?? "");
  const [description, setDescription] = useState<string>(initial?.description ?? "");
  const [website, setWebsite] = useState<string>(initial?.website ?? "");
  const [youtube, setYoutube] = useState<string>(initial?.youtube ?? "");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.banner_url ?? null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // اسلاگ خودکار از عنوان، مگر این‌که دستی تغییر داده شود
    if (!initial) setSlug(slugify(title));
  }, [title]); // eslint-disable-line

  function handleFile(f: File | null) {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f)); else setPreview(initial?.banner_url ?? null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const t = title.trim();
    if (!t) return setErr("عنوان نمی‌تواند خالی باشد.");
    const s = slug.trim() || slugify(t);
    onSubmit({
      title: t,
      slug: s,
      description: description.trim() || null,
      website: website.trim() || null,
      youtube: youtube.trim() || null,
      banner_url: initial?.banner_url ?? null,
      active,
      bannerFile: file ?? undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose} role="dialog" aria-modal="true">
      <div className="card w-full max-w-2xl p-6" onClick={(e)=>e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{initial ? "ویرایش بازی" : "افزودن بازی"}</h2>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
          <label className="grid gap-1 text-sm">
            <span className="opacity-80">عنوان</span>
            <input className="input" value={title} onChange={(e)=>setTitle(e.target.value)} autoFocus/>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="opacity-80">اسلاگ (برای URL)</span>
            <input className="input ltr" value={slug} onChange={(e)=>setSlug(e.target.value)} placeholder="مثلاً call-of-duty-mobile"/>
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="opacity-80">توضیحات کوتاه</span>
            <textarea className="input min-h-[80px]" value={description ?? ""} onChange={(e)=>setDescription(e.target.value)} />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="opacity-80">وب‌سایت رسمی (اختیاری)</span>
            <input className="input ltr" value={website ?? ""} onChange={(e)=>setWebsite(e.target.value)} placeholder="https://example.com"/>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="opacity-80">کانال/ویدیو یوتیوب (اختیاری)</span>
            <input className="input ltr" value={youtube ?? ""} onChange={(e)=>setYoutube(e.target.value)} placeholder="https://youtube.com/…"/>
          </label>

          <label className="grid gap-2 text-sm md:col-span-2">
            <span className="opacity-80">بنر بازی</span>
            {preview
              ? <img src={preview} alt="" className="h-28 w-full object-cover rounded" />
              : <div className="h-28 w-full rounded bg-white/5 grid place-items-center opacity-60">بدون بنر</div>}
            <input
              type="file"
              accept="image/*"
              onChange={(e)=>handleFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e)=>setActive(e.target.checked)} />
            <span>فعال باشد</span>
          </label>

          {err && <div className="md:col-span-2 p-2 rounded border border-red-300 bg-red-50 text-red-700 text-sm">{err}</div>}

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn" onClick={onClose}>انصراف</button>
            <button type="submit" className="btn" disabled={saving}>{saving ? "در حال ذخیره…" : initial ? "ذخیره" : "افزودن"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------- Confirm Delete ---------------------- */
function ConfirmDelete(props: { title: string; onCancel: () => void; onConfirm: () => void; }) {
  const { title, onCancel, onConfirm } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel} aria-modal="true" role="dialog">
      <div className="card w-full max-w-md p-6" onClick={(e)=>e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="opacity-80 mb-4">این عملیات غیرقابل بازگشت است. مطمئنی؟</p>
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onCancel}>انصراف</button>
          <button className="btn" style={{ background:"#fee2e2", color:"#991b1b" }} onClick={onConfirm}>حذف</button>
        </div>
      </div>
    </div>
  );
}
