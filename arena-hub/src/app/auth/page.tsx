"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  // ورود: نام‌کاربری یا ایمیل
  const [loginId, setLoginId] = useState("");
  const [inPass, setInPass] = useState("");
  const [showInPass, setShowInPass] = useState(false);

  // ثبت‌نام: ایمیل + یوزرنیم + رمز
  const [upEmail, setUpEmail] = useState("");
  const [upUser, setUpUser] = useState("");
  const [upPass, setUpPass] = useState("");
  const [upPass2, setUpPass2] = useState("");
  const [showUpPass, setShowUpPass] = useState(false);

  const passScore = useMemo(() => {
    const p = upPass;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  }, [upPass]);

  /** ورود با یوزرنیم/ایمیل */
async function signIn() {
  setErr(null);
  if (!inPass) return setErr("رمز عبور را وارد کنید.");

  let email = loginId.trim();
  try {
    setLoading(true);

    if (!emailRx.test(email)) {
      // ✅ بجای select روی profiles، از RPC استفاده کن
      const { data, error } = await supabase.rpc("email_by_username", { u: email });
      if (error) throw error;
      if (!data) { setLoading(false); return setErr("نام‌کاربری پیدا نشد."); }
      email = data as string;
    }

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: inPass });
    setLoading(false);
    if (authErr) return setErr(authErr.message);
    router.replace("/profile");
  } catch (e: any) {
    setLoading(false);
    setErr(e?.message || "خطا در ورود.");
  }
}


  /** ثبت‌نام: اول یکتایی username چک می‌شود تا خطای DB نگیری */
  async function signUp() {
    setErr(null);
    if (!emailRx.test(upEmail)) return setErr("ایمیل معتبر نیست.");
    if (!upUser.trim()) return setErr("نام‌کاربری را وارد کنید.");
    if (upPass.length < 8) return setErr("رمز باید حداقل ۸ کاراکتر باشد.");
    if (upPass !== upPass2) return setErr("تکرار رمز درست نیست.");

    try {
      setLoading(true);

      // چک یکتایی username
      const { data: exists } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", upUser.trim())
        .maybeSingle();

      if (exists?.id) {
        setLoading(false);
        return setErr("این نام‌کاربری قبلاً گرفته شده است.");
      }

      const { error } = await supabase.auth.signUp({
        email: upEmail.trim(),
        password: upPass,
        options: {
          data: { username: upUser.trim() }, // پروفایل از همین مقدار پر می‌شود
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      setLoading(false);
      if (error) return setErr(error.message);

      alert("✅ ایمیل تأیید ارسال شد. پس از تأیید، وارد شوید.");
      setTab("signin");
      setLoginId(upEmail);
    } catch (e: any) {
      setLoading(false);
      setErr(e?.message || "خطا در ثبت‌نام.");
    }
  }

  // Enter روی تب فعال
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (tab === "signin") signIn();
      else signUp();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [tab, loginId, inPass, upEmail, upUser, upPass, upPass2]);

  return (
    <div className="min-h-[72vh] grid place-items-center px-4">
      <div className="w-full max-w-md">
        {/* کارت ثابت ارتفاع برای جلوگیری از پرش */}
        <div className="card p-0 overflow-hidden">
          {/* تب‌ها */}
          <div className="grid grid-cols-2">
            <button
              className={`py-3 font-bold nav-btn ${tab === "signin" ? "nav-active" : ""}`}
              onClick={() => setTab("signin")}
            >
              ورود
            </button>
            <button
              className={`py-3 font-bold nav-btn ${tab === "signup" ? "nav-active" : ""}`}
              onClick={() => setTab("signup")}
            >
              ثبت‌نام
            </button>
          </div>

          {/* بدنه (قدری ارتفاع ثابت تا جابه‌جایی فرم‌ها نرم باشد) */}
          <div className="p-5 space-y-4" style={{ minHeight: 340 }}>
            {err && (
              <div className="p-3 rounded border border-red-400/40 text-red-300 bg-red-950/30 text-sm">
                {err}
              </div>
            )}

            {tab === "signin" ? (
              <section className="grid gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="opacity-80">نام‌کاربری یا ایمیل</span>
                  <input
                    className="input"
                    placeholder="مثلاً gamer_legend یا email@example.com"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    autoFocus
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="opacity-80">رمز عبور</span>
                  <div className="relative">
                    {/* برای RTL: چون دکمه سمت چپ است → padding-left */}
                    <input
                      className="input pl-20 pr-3"
                      type={showInPass ? "text" : "password"}
                      value={inPass}
                      onChange={(e) => setInPass(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-ghost absolute top-1/2 -translate-y-1/2 left-2 px-2 py-1 text-xs"
                      onClick={() => setShowInPass((s) => !s)}
                    >
                      {showInPass ? "پنهان" : "نمایش"}
                    </button>
                  </div>
                </label>

                <div className="flex items-center justify-between text-sm">
                  <a className="opacity-80 hover:opacity-100" href="/auth/new-password">
                    فراموشی رمز؟
                  </a>
                  <button className="btn-ghost text-xs" type="button" onClick={() => setTab("signup")}>
                    حساب ندارم
                  </button>
                </div>

                <button className="btn btn-primary w-full" disabled={loading} onClick={signIn}>
                  {loading ? "..." : "ورود"}
                </button>
              </section>
            ) : (
              <section className="grid gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="opacity-80">ایمیل</span>
                  <input
                    className="input ltr"
                    type="email"
                    value={upEmail}
                    onChange={(e) => setUpEmail(e.target.value)}
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="opacity-80">نام‌کاربری</span>
                  <input
                    className="input"
                    placeholder="مثلاً gamer_legend"
                    value={upUser}
                    onChange={(e) => setUpUser(e.target.value)}
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="opacity-80">رمز عبور</span>
                  <div className="relative">
                    <input
                      className="input pl-20 pr-3"
                      type={showUpPass ? "text" : "password"}
                      value={upPass}
                      onChange={(e) => setUpPass(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-ghost absolute top-1/2 -translate-y-1/2 left-2 px-2 py-1 text-xs"
                      onClick={() => setShowUpPass((s) => !s)}
                    >
                      {showUpPass ? "پنهان" : "نمایش"}
                    </button>
                  </div>

                  {/* نوار قدرت رمز */}
                  <div className="progress mt-2">
                    <div
                      className="bar"
                      style={{
                        width: `${(passScore / 4) * 100}%`,
                        background:
                          passScore >= 3
                            ? "linear-gradient(90deg,#22c55e,#16a34a)"
                            : "linear-gradient(90deg,#f97316,#ef4444)",
                      }}
                    />
                  </div>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="opacity-80">تکرار رمز عبور</span>
                  <input
                    className="input"
                    type="password"
                    value={upPass2}
                    onChange={(e) => setUpPass2(e.target.value)}
                  />
                </label>

                <button className="btn btn-primary w-full" disabled={loading} onClick={signUp}>
                  {loading ? "..." : "ثبت‌نام"}
                </button>
              </section>
            )}
          </div>
        </div>

        <p className="text-center text-xs opacity-60 mt-3">
          تکمیل اطلاعات بیشتر بعد از ورود از بخش «پروفایل».
        </p>
      </div>
    </div>
  );
}
