"use client";
import { useEffect, useState } from "react";
import AdminGate from "@/components/AdminGate";
import { supabase } from "@/lib/supabaseClient";


export async function saveHighlight(row: {
  type: "user" | "youtuber" | "gamenet";
  week_start: string;        // "YYYY-MM-DD"
  game_id: number | null;
  user_id: string | null;
  reason?: string | null;
}) {
  const { error } = await supabase
    .from("weekly_highlights")
    .upsert(row, { onConflict: "week_start,type,game_id" }); // 👈 همین خط
  if (error) throw error;
}

type Highlight = {
  id:number; type:"user"|"youtuber"|"gamenet";
  week_start:string; // YYYY-MM-DD (دوشنبه/شنبه هرچی در نظر گرفتید)
  game_id:number|null; user_id:string|null; reason:string|null;
};
type Game = { id:number; title:string };
type Profile = { id:string; username:string|null; email:string };

export default function AdminHighlightsPage() {
  const [items, setItems] = useState<Highlight[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [form, setForm] = useState<Partial<Highlight>>({
    type:"user", week_start:new Date().toISOString().slice(0,10), game_id:null, user_id:null, reason:""
  });

  const load = async () => {
    const [h,g,u] = await Promise.all([
      supabase.from("weekly_highlights").select("*").order("week_start",{ascending:false}).limit(50),
      supabase.from("games").select("id,title").eq("active",true).order("title"),
      supabase.from("profiles").select("id,username,email").order("username"),
    ]);
    if (!h.error) setItems(h.data||[]);
    if (!g.error) setGames(g.data||[]);
    if (!u.error) setUsers(u.data||[]);
  };
  useEffect(()=>{ load(); }, []);

  const save = async () => {
    if (!form.type || !form.week_start) { alert("نوع و هفته اجباری است"); return; }
    const payload = {
      type: form.type as Highlight["type"],
      week_start: form.week_start!,
      game_id: form.game_id || null,
      user_id: form.user_id || null,
      reason: form.reason || null,
    };
    let res;
    if ((form as any).id) res = await supabase.from("weekly_highlights").update(payload).eq("id",(form as any).id);
    else res = await supabase.from("weekly_highlights").insert(payload);
    if (res.error) { alert(res.error.message); return; }
    setForm({ type:"user", week_start:new Date().toISOString().slice(0,10), game_id:null, user_id:null, reason:"" });
    await load();
  };

  const edit = (h:Highlight)=>setForm(h);
  const del  = async (id:number)=>{
    if (!confirm("حذف هایلایت؟")) return;
    const { error } = await supabase.from("weekly_highlights").delete().eq("id", id);
    if (error) alert(error.message); else await load();
  };

  return (
    <AdminGate>
      <div className="container-page py-8 space-y-6">
        <h1 className="text-xl font-bold">هایلایت‌های هفتگی</h1>

        <section className="card space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm opacity-70 mb-1">نوع</label>
              <select className="input" value={form.type||"user"} onChange={e=>setForm(p=>({...p,type:e.target.value as any}))}>
                <option value="user">کاربر هفته</option>
                <option value="youtuber">یوتیوبر هفته</option>
                <option value="gamenet">گیم‌نت هفته</option>
              </select>
            </div>
            <div>
              <label className="block text-sm opacity-70 mb-1">هفته (شروع)</label>
              <input className="input ltr" type="date" value={form.week_start||""} onChange={e=>setForm(p=>({...p,week_start:e.target.value}))}/>
            </div>
            <div>
              <label className="block text-sm opacity-70 mb-1">بازی (اختیاری)</label>
              <select className="input" value={form.game_id||""} onChange={e=>setForm(p=>({...p,game_id:e.target.value?Number(e.target.value):null}))}>
                <option value="">—</option>
                {games.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm opacity-70 mb-1">کاربر (اختیاری)</label>
              <select className="input" value={form.user_id||""} onChange={e=>setForm(p=>({...p,user_id:e.target.value||null}))}>
                <option value="">—</option>
                {users.map(u=><option key={u.id} value={u.id}>{u.username || u.email}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm opacity-70 mb-1">دلیل/توضیح</label>
            <textarea className="input" rows={2} value={form.reason||""} onChange={e=>setForm(p=>({...p,reason:e.target.value}))}/>
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={save}>{(form as any).id ? "بروزرسانی" : "ثبت"}</button>
            {(form as any).id && <button className="btn-secondary" onClick={()=>setForm({ type:"user", week_start:new Date().toISOString().slice(0,10) })}>انصراف</button>}
          </div>
        </section>

        <section className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="opacity-70">
                <tr><th className="p-2 text-right">#</th><th className="p-2">نوع</th><th className="p-2">هفته</th><th className="p-2">بازی</th><th className="p-2">کاربر</th><th className="p-2">اکشن</th></tr>
              </thead>
              <tbody>
                {items.map(h=>(
                  <tr key={h.id} className="border-t border-neutral-800">
                    <td className="p-2">{h.id}</td>
                    <td className="p-2">{h.type}</td>
                    <td className="p-2 ltr">{h.week_start}</td>
                    <td className="p-2">{h.game_id ? (games.find(g=>g.id===h.game_id)?.title || h.game_id) : "-"}</td>
                    <td className="p-2">{h.user_id ? (users.find(u=>u.id===h.user_id)?.username || "user") : "-"}</td>
                    <td className="p-2 flex gap-2">
                      <button className="btn-secondary" onClick={()=>edit(h)}>ویرایش</button>
                      <button className="btn-secondary" onClick={()=>del(h.id)}>حذف</button>
                    </td>
                  </tr>
                ))}
                {items.length===0 && <tr><td className="p-3 opacity-70" colSpan={6}>فعلاً چیزی ثبت نشده.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminGate>
  );
}
