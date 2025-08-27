"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import AvatarUpload from "@/components/AvatarUpload";

export default function SettingsProfile() {
  const { ready, user } = useAuth();
  const userId = user?.id ?? null;

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !userId) return;
    (async () => {
      const { data } = await supabase.from("profiles")
        .select("username,bio,avatar_url").eq("id", userId).maybeSingle();
      setUsername(data?.username ?? "");
      setBio(data?.bio ?? "");
      setAvatarUrl(data?.avatar_url ?? null);
    })();
  }, [ready, userId]);

  const save = async () => {
    if (!userId) return;
    setMsg(null);
    const { error } = await supabase.from("profiles")
      .update({ username: username.trim() || null, bio: bio.trim() || null })
      .eq("id", userId);
    setMsg(error ? error.message : "ذخیره شد.");
  };

  return (
    <div className="grid gap-6">
      <div className="card p-4">
        <h1 className="text-lg font-semibold mb-4">پروفایل</h1>
        {msg && <div className="card p-3 mb-3">{msg}</div>}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="sm:w-48">
           <AvatarUpload currentUrl={avatarUrl ?? undefined} onUploaded={(url) => setAvatarUrl(url)} size={96} />
          </div>
          <div className="flex-1 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm opacity-80">نام کاربری</span>
              <input className="input" value={username} onChange={(e)=>setUsername(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm opacity-80">Bio</span>
              <textarea className="input" rows={3} value={bio} onChange={(e)=>setBio(e.target.value)} />
            </label>
            <div>
              <button className="btn btn-primary" onClick={save}>ذخیره</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
