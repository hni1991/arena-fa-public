"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  is_admin: boolean;
};

type AuthCtx = {
  user: any;
  profile: Profile | null;
  loading: boolean;  // در حال لود پروفایل/سشن
  ready: boolean;    // یک بار کل چرخه کامل شد
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  profile: null,
  loading: true,
  ready: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  async function loadProfile(u: any) {
    if (!u) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, is_admin")
      .eq("id", u.id)
      .single();
    if (!error && data) setProfile(data as Profile);
    else setProfile(null);
  }

  async function bootstrap() {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user ?? null;
    setUser(u);
    await loadProfile(u);
    setLoading(false);
    setReady(true);
  }

  useEffect(() => {
    // بار اول
    bootstrap();
    // لیسنر تغییرات
    const { data: listener } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(true);
      loadProfile(u).finally(() => setLoading(false));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    setLoading(true);
    await loadProfile(user);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, ready, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
