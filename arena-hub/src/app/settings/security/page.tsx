"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SettingsSecurity() {
  const [cur, setCur] = useState("");
  const [pwd, setPwd] = useState("");
  const [conf, setConf] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const changePassword = async () => {
    setMsg(null);
    if (pwd !== conf) { setMsg("پسورد جدید با تکرار مطابقت ندارد."); return; }
    // Supabase فقط پسورد جدید می‌خواهد؛ current را برای ولیدیشن UI گرفتیم
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setMsg(error ? error.message : "پسورد با موفقیت تغییر کرد.");
    if (!error) { setCur(""); setPwd(""); setConf(""); }
  };

  const signOutAll = async () => {
    setMsg(null);
    // signOut همه‌جا (کلاینت فعلی) — برای جهانی، پنل Supabase یا Endpoint server لازم است.
    const { error } = await supabase.auth.signOut();
    setMsg(error ? error.message : "خارج شدید.");
  };

  return (
    <div className="grid gap-6">
      {msg && <div className="card p-3">{msg}</div>}

      <div className="card p-4">
        <h1 className="text-lg font-semibold mb-3">امنیت</h1>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm opacity-80">پسورد فعلی</span>
            <input className="input" type="password" value={cur} onChange={e=>setCur(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm opacity-80">پسورد جدید</span>
            <input className="input" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm opacity-80">تکرار پسورد جدید</span>
            <input className="input" type="password" value={conf} onChange={e=>setConf(e.target.value)} />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn btn-primary" onClick={changePassword}>تغییر پسورد</button>
          <button className="btn btn-ghost" onClick={signOutAll}>خروج از حساب</button>
        </div>
      </div>

      <div className="card p-4 opacity-70">
        <h2 className="font-semibold">Two‑Factor (به‌زودی)</h2>
        <p className="text-sm mt-1">فعلاً غیر‌فعال است.</p>
      </div>
    </div>
  );
}
