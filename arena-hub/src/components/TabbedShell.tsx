"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

export type TabItem = {
  key: string;
  label: string;
  content: React.ReactNode;
};

export default function TabbedShell({
  tabs,
  param = "tab",
  defaultKey,
}: {
  tabs: TabItem[];
  param?: string;
  defaultKey: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const current = sp.get(param) || defaultKey;

  const map = useMemo(() => {
    const m = new Map<string, React.ReactNode>();
    tabs.forEach((t) => m.set(t.key, t.content));
    return m;
  }, [tabs]);

  // اگر تب نامعتبر بود، به تب پیش‌فرض برگرد
  useEffect(() => {
    if (!map.has(current)) {
      const usp = new URLSearchParams(sp.toString());
      usp.set(param, defaultKey);
      router.replace(`${pathname}?${usp.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, map]);

  function setTab(k: string) {
    const usp = new URLSearchParams(sp.toString());
    usp.set(param, k);
    router.replace(`${pathname}?${usp.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = current === t.key;
          return (
            <button
              key={t.key}
              className={`btn !py-1.5 !px-3 ${active ? "ring-2 ring-[var(--c-primary)]" : ""}`}
              onClick={() => setTab(t.key)}
              aria-current={active ? "page" : undefined}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="card p-4">
        {/* فقط محتوای تب فعلی نمایش داده شود */}
        {map.get(current)}
      </div>
    </div>
  );
}
