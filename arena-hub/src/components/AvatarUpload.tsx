"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";

type Props = {
  /** آواتار فعلی برای نمایش اولیه */
  currentUrl?: string;
  /** بعد از آپلود موفق، URL جدید را برمی‌گرداند */
  onUploaded?: (publicUrl: string) => void;
  /** اندازهٔ نمایش (px) */
  size?: number;
  /** نام باکت در Storage (پیشفرض: avatars) */
  bucket?: string;
};

export default function AvatarUpload({
  currentUrl,
  onUploaded,
  size = 96,
  bucket = "avatars",
}: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(currentUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.id) {
      setErr("ابتدا وارد شوید.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      // یک نام یکتا برای فایل
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      // 1) آپلود به باکت
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (upErr) throw upErr;

      // 2) آدرس public
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const url = pub?.publicUrl;
      if (!url) throw new Error("Public URL not available");

      setPreview(url);

      // 3) ذخیرهٔ url در پروفایل (اختیاری اما معمول)
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);

      // 4) اطلاع به پدر
      onUploaded?.(url);
    } catch (e: any) {
      setErr(e?.message ?? "خطا در آپلود آواتار");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2">
      <div
        className="relative rounded-xl overflow-hidden bg-white/5 border border-white/10"
        style={{ width: size, height: size }}
      >
        {preview ? (
          // استفاده از Image برای بهینه‌سازی
          <Image
            src={preview}
            alt="avatar"
            fill
            sizes={`${size}px`}
            className="object-cover"
          />
        ) : (
          // SVG پیشفرض اگر عکس نداشت
          <div className="w-full h-full grid place-items-center opacity-70">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button className="btn btn-ghost" type="button" onClick={pick} disabled={busy}>
          انتخاب تصویر
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onFile}
          className="hidden"
        />
        {busy ? <span className="text-sm opacity-80">در حال آپلود…</span> : null}
      </div>

      {err && <div className="text-sm text-red-400">{err}</div>}
    </div>
  );
}
