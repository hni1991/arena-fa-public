"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  clanId: string;
  value?: string | null;            // url فعلی (اختیاری)
  onUploaded?: (publicUrl: string) => void;
};

export default function ClanBannerUpload({ clanId, value, onUploaded }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${clanId}/banner_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("clans").upload(path, file, {
        cacheControl: "3600", upsert: true,
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("clans").getPublicUrl(path);
      const publicUrl = pub?.publicUrl || "";

      // در DB هم ذخیره کن
      const { error: updErr } = await supabase
        .from("clans")
        .update({ logo_url: publicUrl })
        .eq("id", clanId);
      if (updErr) throw updErr;

      onUploaded?.(publicUrl);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={value || "/clan-cover.png"} alt="" className="w-full h-32 object-cover rounded-md bg-white/5" />
      <label className="btn btn-ghost w-max">
        {busy ? "در حال آپلود…" : "آپلود بنر"}
        <input type="file" accept="image/*" className="hidden" onChange={onChange} disabled={busy} />
      </label>
      {error ? <div className="text-red-400 text-sm">{error}</div> : null}
    </div>
  );
}
