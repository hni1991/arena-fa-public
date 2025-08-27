"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const send = async () => {
    setMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/auth/new-password",
    });
    setMsg(error ? error.message : "Reset email sent. Check Inbox/Spam.");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">Forgot password</h1>
      <input className="w-full rounded bg-white/5 border border-white/10 px-3 py-2"
             type="email" placeholder="Your email" value={email}
             onChange={(e)=>setEmail(e.target.value)} />
      <button onClick={send} className="mt-3 px-4 py-2 rounded bg-indigo-600">Send reset link</button>
      {msg && <p className="mt-3 text-sm opacity-80">{msg}</p>}
    </div>
  );
}
