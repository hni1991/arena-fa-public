"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NewPasswordPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const update = async () => {
    setMsg("");
    const { error } = await supabase.auth.updateUser({ password });
    setMsg(error ? error.message : "Password updated. You can sign in now.");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">Set a new password</h1>
      <input className="w-full rounded bg-white/5 border border-white/10 px-3 py-2"
             type="password" placeholder="New password"
             value={password} onChange={(e)=>setPassword(e.target.value)} />
      <button onClick={update} className="mt-3 px-4 py-2 rounded bg-indigo-600">Update</button>
      {msg && <p className="mt-3 text-sm opacity-80">{msg}</p>}
    </div>
  );
}
