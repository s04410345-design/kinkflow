"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const checkAdminAndRedirect = async (userId: string) => {
    const { data, error: roleError } = await supabase
      .from("admin_roles")
      .select("role_level")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleError || !data) {
      await supabase.auth.signOut();
      setError("此 Google 帳號沒有管理員權限。請確認你使用的是已授權的帳號。");
      setLoading(false);
      return false;
    }

    router.replace("/admin");
    return true;
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      if (session?.user) {
        await checkAdminAndRedirect(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && active) {
        window.setTimeout(() => {
          void checkAdminAndRedirect(session.user.id);
        }, 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handlePasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError || !data.user) {
      setError(loginError?.message || "登入失敗，請檢查帳號與密碼。");
      setSubmitting(false);
      return;
    }

    await checkAdminAndRedirect(data.user.id);
    setSubmitting(false);
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    setError("");

    const { error: loginError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/admin/login`,
      },
    });

    if (loginError) {
      setError(loginError.message || "Google 登入失敗，請稍後再試。");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FDFBF7] text-[#4A4238]">
        <p className="text-sm">正在檢查管理員登入狀態……</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FDFBF7] px-6 text-[#4A4238]">
      <section className="w-full max-w-md rounded-3xl border border-[#D1C6B4]/40 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-bold tracking-[0.2em] text-[#8B7E70]">秋DAY · KINKFLOW</p>
          <h1 className="text-3xl font-bold">後台專用登入</h1>
          <p className="mt-3 text-sm text-[#4A4238]/60">這裡只接受具備管理員權限的帳號。</p>
        </div>

        {error && <p className="mb-5 rounded-xl border border-[#E08A8A]/30 bg-[#E08A8A]/10 p-3 text-sm font-semibold text-[#B85C5C]">{error}</p>}

        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <label className="block text-sm font-semibold">
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-2 w-full rounded-xl border border-[#D1C6B4]/60 px-4 py-3 outline-none focus:border-[#4A4238]" placeholder="管理員 Email" />
          </label>
          <label className="block text-sm font-semibold">
            密碼
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required className="mt-2 w-full rounded-xl border border-[#D1C6B4]/60 px-4 py-3 outline-none focus:border-[#4A4238]" placeholder="帳號密碼" />
          </label>
          <button disabled={submitting} type="submit" className="w-full rounded-xl bg-[#4A4238] py-3 font-bold text-white disabled:opacity-50">
            {submitting ? "登入中……" : "使用 Email 登入後台"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-[#4A4238]/40"><span className="h-px flex-1 bg-[#D1C6B4]/50" />或<span className="h-px flex-1 bg-[#D1C6B4]/50" /></div>

        <button disabled={submitting} onClick={handleGoogleLogin} className="w-full rounded-xl border border-[#D1C6B4]/70 bg-white py-3 font-bold text-[#4A4238] hover:bg-[#F8F4ED] disabled:opacity-50">
          使用 Google 登入後台
        </button>

        <button onClick={() => router.push("/")} className="mt-6 w-full text-center text-sm text-[#4A4238]/50 hover:text-[#4A4238]">回到前台</button>
      </section>
    </main>
  );
}
