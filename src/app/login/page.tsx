"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrandMark, Wordmark } from "@/components/Brand";
import { supabase } from "@/lib/supabase/client";

/** แปลข้อความ error ที่พบบ่อยจาก Supabase Auth เป็นภาษาไทย พร้อมบอกวิธีแก้ */
function explain(error: { message: string; code?: string }) {
  const m = error.message.toLowerCase();
  const c = error.code ?? "";
  if (c === "signup_disabled" || c === "email_provider_disabled" || m.includes("signups are disabled") || m.includes("signups not allowed"))
    return "Supabase ปิดการสมัครด้วยอีเมลไว้ — ไปที่ Supabase → Authentication → Sign In / Providers แล้วเปิด “Allow new users to sign up” และเปิด Email provider (ให้ปิดแค่ “Confirm email”)";
  if (c === "invalid_credentials" || m.includes("invalid login credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง (ถ้ายังไม่มีบัญชี ให้กด “สมัครสมาชิก” ด้านล่างก่อน)";
  if (c === "email_not_confirmed" || m.includes("email not confirmed")) return "ยังไม่ได้ยืนยันอีเมล — เช็กกล่องอีเมลแล้วกดลิงก์ยืนยัน หรือปิด “Confirm email” ใน Supabase";
  if (c === "user_already_exists" || m.includes("already registered")) return "อีเมลนี้สมัครไว้แล้ว — กด “มีบัญชีแล้ว? เข้าสู่ระบบ”";
  if (c === "weak_password" || m.includes("password should")) return "รหัสผ่านสั้นหรือง่ายเกินไป (อย่างน้อย 6 ตัวอักษร)";
  if (c === "over_email_send_rate_limit" || m.includes("rate limit")) return "ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่";
  if (c === "email_address_invalid" || m.includes("is invalid")) return "รูปแบบอีเมลไม่ถูกต้อง";
  return error.message;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // เปิดมาจากปุ่ม "เริ่มใช้ฟรี" (?mode=signup) → แสดงฟอร์มสมัคร
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const sb = supabase();
    if (mode === "forgot") {
      // ลิงก์ในอีเมลจะพากลับมาที่ /auth/callback แล้วไปหน้าตั้งรหัสผ่านใหม่
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) setMsg({ kind: "err", text: "ส่งอีเมลไม่สำเร็จ: " + explain(error) });
      else setMsg({ kind: "ok", text: "ถ้าอีเมลนี้มีบัญชีอยู่ เราส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว เช็กกล่องอีเมล (และโฟลเดอร์สแปม)" });
    } else if (mode === "signin") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg({ kind: "err", text: "เข้าสู่ระบบไม่สำเร็จ: " + explain(error) });
      else {
        router.replace("/");
        router.refresh();
      }
    } else {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setMsg({ kind: "err", text: "สมัครไม่สำเร็จ: " + explain(error) });
      else if (data.session) {
        router.replace("/");
        router.refresh();
      } else setMsg({ kind: "ok", text: "สมัครแล้ว! เช็กอีเมลเพื่อกดยืนยัน แล้วกลับมาเข้าสู่ระบบ" });
    }
    setBusy(false);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="glass w-full max-w-sm space-y-4 rounded-[24px] p-6 sm:p-7">
        <div>
          <div className="mb-5 flex flex-col items-center gap-2 text-center">
            <BrandMark size={64} />
            <Wordmark className="text-[26px]" />
          </div>
          <h1 className="text-[26px] leading-tight font-medium tracking-[-0.035em]">{mode === "signin" ? "ยินดีต้อนรับกลับ" : mode === "signup" ? "สร้างบัญชี" : "ลืมรหัสผ่าน"}</h1>
          <p className="mt-1 text-[13px] text-muted">{mode === "forgot" ? "ใส่อีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้" : "บันทึกการเทรดหุ้น US ของคุณ"}</p>
        </div>
        <label className="field">
          <span>อีเมล</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== "forgot" && (
        <label className="field">
          <span className="flex items-center justify-between">
            รหัสผ่าน
            {mode === "signin" && (
              <button type="button" className="text-[12px] text-muted hover:text-fg cursor-pointer" onClick={() => { setMode("forgot"); setMsg(null); }}>
                ลืมรหัสผ่าน?
              </button>
            )}
          </span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        )}
        {msg && <p className={msg.kind === "ok" ? "text-gain text-sm" : "text-loss text-sm"}>{msg.text}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "กำลังดำเนินการ…" : mode === "signin" ? "เข้าสู่ระบบ" : mode === "signup" ? "สมัครสมาชิก" : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
        </button>
        <button
          type="button"
          className="w-full text-[13px] text-muted underline-offset-2 hover:text-fg hover:underline cursor-pointer"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMsg(null);
          }}
        >
          {mode === "signin" ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
        </button>
      </form>
      <Link href="/welcome" className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft size={14} aria-hidden="true" />
        กลับหน้าแรก
      </Link>
      {mode === "signup" && (
        <p className="mt-3 max-w-sm text-center text-[11px] text-muted">
          การสมัครถือว่ายอมรับ{" "}
          <Link href="/terms" className="underline underline-offset-2">
            เงื่อนไขการใช้งาน
          </Link>{" "}
          และ{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            นโยบายความเป็นส่วนตัว
          </Link>
        </p>
      )}
    </main>
  );
}
