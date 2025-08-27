"use client";
import { useEffect, useState } from "react";
import AdminGate from "@/components/AdminGate";
import { supabase } from "@/lib/supabaseClient";

type Settings = {
  id:number; brand_name:string|null;
  primary_hex:string|null; accent_hex:string|null; bg_hex:string|null;
  font_family:string|null; hero_title:string|null; hero_body:string|null;
};

export default function AdminSettingsPage() {
  const [s, setS] = useState<Settings|null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("site_settings").select("*").order("id").limit(1).maybeSingle();
    setS(data || { id: 1, brand_name:"ArenaFA", primary_hex:"#10b981", accent_hex:"#3b82f6", bg_hex:"#0b0f1a", font_family:"Arial, Helvetica, sans-serif", hero_title:"هاب گیمینگ فارسی؛ رقابت، دیده‌شدن، جامعه", hero_body:"..." } as any);
  };
  useEffect(()=>{ load(); }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const payload = { ...s };
    delete (payload as any).id;
    let res;
    if ((s as any).id) res = await supabase.from("site_settings").update(payload).eq("id",(s as any).id);
    else res = await supabase.from("site_settings").insert(payload);
    if (res.error) alert(res.error.message);
    setSaving(false);
  };

  return (
    <AdminGate>
      <div className="container-page py-8 space-y-6">
        <h1 className="text-xl font-bold">تنظیمات سایت</h1>
        {!s ? "در حال بارگذاری…" : (
          <section className="card space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm opacity-70 mb-1">نام برند</label>
                <input className="input" value={s.brand_name||""} onChange={e=>setS(p=>({...p!,brand_name:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm opacity-70 mb-1">Primary</label>
                <input className="input ltr" type="color" value={s.primary_hex||"#10b981"} onChange={e=>setS(p=>({...p!,primary_hex:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm opacity-70 mb-1">Accent</label>
                <input className="input ltr" type="color" value={s.accent_hex||"#3b82f6"} onChange={e=>setS(p=>({...p!,accent_hex:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm opacity-70 mb-1">Background</label>
                <input className="input ltr" type="color" value={s.bg_hex||"#0b0f1a"} onChange={e=>setS(p=>({...p!,bg_hex:e.target.value}))}/>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm opacity-70 mb-1">Font family (CSS)</label>
                <input className="input ltr" value={s.font_family||""} onChange={e=>setS(p=>({...p!,font_family:e.target.value}))}/>
              </div>
            </div>
            <div>
              <label className="block text-sm opacity-70 mb-1">Hero Title</label>
              <input className="input" value={s.hero_title||""} onChange={e=>setS(p=>({...p!,hero_title:e.target.value}))}/>
            </div>
            <div>
              <label className="block text-sm opacity-70 mb-1">Hero Body</label>
              <textarea className="input" rows={3} value={s.hero_body||""} onChange={e=>setS(p=>({...p!,hero_body:e.target.value}))}/>
            </div>
            <button className="btn" onClick={save} disabled={saving}>{saving?"...":"ذخیره"}</button>
          </section>
        )}
        <p className="opacity-70 text-sm">نکته: ThemeLoader این مقادیر را به CSS Variables ست می‌کند؛ نیازی به ری‌استارت نیست.</p>
      </div>
    </AdminGate>
  );
}
