"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = { id: string; username: string | null; email: string | null; is_admin: boolean };

export default function ModUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,email,is_admin")
        .order("username");
      if (!ignore) setRows((data as Row[]) || []);
    })();
    return () => { ignore = true; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      (r.username || "").toLowerCase().includes(s) ||
      (r.email || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <input className="input" placeholder="جستجو در کاربران…" value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="opacity-70">
            <tr><th className="p-2 text-right">نام کاربری</th><th className="p-2 text-right">ایمیل</th><th className="p-2">ادمین</th></tr>
          </thead>
          <tbody>
            {filtered.map(u=>(
              <tr key={u.id} className="border-t border-neutral-800">
                <td className="p-2">{u.username || "—"}</td>
                <td className="p-2 ltr">{u.email || "—"}</td>
                <td className="p-2 text-center">{u.is_admin ? "✅" : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={3} className="p-3 opacity-70 text-center">موردی نیست.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
