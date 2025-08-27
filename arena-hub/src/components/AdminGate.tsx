"use client";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminGate({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ready) return;
      if (!user) { router.replace("/auth"); return; }
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (error) { console.error(error); setAllowed(false); return; }
      if (!ignore) setAllowed(Boolean(data?.is_admin));
      if (!data?.is_admin) router.replace("/"); // غیر ادمین → خانه
    };
    run();
    return () => { ignore = true; };
  }, [ready, user, router]);

  if (!ready || allowed === null) {
    return <div className="container-page py-10 text-center">در حال بررسی دسترسی…</div>;
  }
  if (!allowed) return null;
  return <>{children}</>;
}
