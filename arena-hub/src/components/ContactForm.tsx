"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ok:boolean; text:string} | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setStatus(null);
    const { error } = await supabase.from("contacts").insert({ name, email, message });
    if (error) setStatus({ ok:false, text: error.message });
    else {
      setStatus({ ok:true, text: "پیام شما ثبت شد. مرسی! ✅" });
      setName(""); setEmail(""); setMessage("");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <input className="rounded bg-white/5 border border-white/10 px-3 py-2" placeholder="نام"
               value={name} onChange={e=>setName(e.target.value)} />
        <input className="rounded bg-white/5 border border-white/10 px-3 py-2" placeholder="ایمیل"
               type="email" value={email} onChange={e=>setEmail(e.target.value)} />
      </div>
      <textarea className="w-full min-h-[120px] rounded bg-white/5 border border-white/10 px-3 py-2"
                placeholder="پیام شما..." value={message} onChange={e=>setMessage(e.target.value)} />
      <button disabled={busy} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">
        {busy ? "در حال ارسال..." : "ارسال پیام"}
      </button>
      {status && <p className={`text-sm ${status.ok ? "text-emerald-400" : "text-red-400"}`}>{status.text}</p>}
    </form>
  );
}
