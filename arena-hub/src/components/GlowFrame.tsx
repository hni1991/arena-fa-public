"use client";
import React from "react";

type Tone = "green" | "orange" | "red" | "mixed";

export default function GlowFrame({
  children,
  tone = "mixed",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const ring =
    tone === "green"
      ? "neon-ring-green"
      : tone === "orange"
      ? "neon-ring-orange"
      : tone === "red"
      ? "neon-ring-red"
      : "neon-border";
  return <div className={`card ${ring} ${className}`}>{children}</div>;
}
