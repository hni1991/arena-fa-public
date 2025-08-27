"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPage(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);

  async function signIn(){
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if(error){ setError(error.message); return; }
    window.location.href="/profile";
  }

  async function signUp(){
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if(error){ setError(error.message); return; }
    alert("ایمیل تایید ارسال شد. پس از تایید وارد شوید.");
  }

  return (
    <div className="container-page">
      <h1 className="text-xl font-bold mb-4">Sign in / Sign up</h1>
      <div className="card space-y-3">
        <label className="block text-sm">
          ایمیل
          <input id="email" name="email" className="input mt-1" type="email"
                 autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} />
        </label>

        <label className="block text-sm">
          رمز
          <input id="password" name="password" className="input mt-1" type="password"
                 autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} />
        </label>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <div className="flex gap-2">
          <button disabled={loading} onClick={signUp} className="btn">Sign up</button>
          <button disabled={loading} onClick={signIn} className="btn-secondary">
            {loading ? "..." : "Sign in"}
          </button>
          <a className="text-sm opacity-80" href="/auth/new-password">فراموشی رمز؟</a>
        </div>
      </div>
    </div>
  );
}
