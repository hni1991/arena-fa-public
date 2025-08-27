"use client";
import { useEffect } from "react";

export default function ThemeLoader({
  settings,
}: {
  settings?: {
    brand_name?: string;
    primary_hex?: string;
    accent_hex?: string;
    bg_hex?: string;
    font_family?: string;
  };
}) {
  useEffect(() => {
    const root = document.documentElement;

    const bg = settings?.bg_hex || "#0d0d0d";
    const primary = settings?.primary_hex || "#22c55e";
    const accent = settings?.accent_hex || "#f97316";
    const font =
      settings?.font_family ||
      'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif';

    root.style.setProperty("--c-bg", bg);
    root.style.setProperty("--c-primary", primary);
    root.style.setProperty("--c-accent", accent);
    root.style.setProperty("--f-base", font);

    // ثابت‌ها (در آینده اگر خواستی به settings اضافه می‌کنیم)
    root.style.setProperty("--c-danger", "#ef4444");
    root.style.setProperty("--c-text", "#ffffff");

    root.style.setProperty("--neon-soft", "0 0 10px");
    root.style.setProperty("--neon-mid", "0 0 18px");
    root.style.setProperty("--neon-hard", "0 0 28px");
  }, [settings]);

  return null;
}
