"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark, Wordmark } from "@/components/Brand";
import { supabase } from "@/lib/supabase/client";

// มาถึงหน้านี้จากลิงก์ "ตั้งรหัสผ่านใหม่" ในอีเมล (ผ่าน /auth/callback ซึ่งล็อกอินให้แล้ว)
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) return setErr("รหัสผ่านสองช่องไม่ตรงกัน");
    setBusy(true);
    const { error } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (error) return setErr("ตั้งรหัสผ่านไม่สำเร็จ: " + error.message);
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="glass w-full max-w-sm space-y-4 rounded-[24px] p-6 sm:p-7">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <BrandMark size={56} />
          <Wordmark className="text-[24px]" />
        </div>
        <h1 className="text-[24px] leading-tight font-medium tracking-[-0.035em]">ตั้งรหัสผ่านใหม่</h1>
        <label className="field">
          <span>รหัสผ่านใหม่</span>
          <input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="field">
          <span>ยืนยันรหัสผ่านใหม่</span>
          <input type="password" required minLength={6} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {err && <p className="text-sm text-loss">{err}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
        </button>
      </form>
      <Link href="/" className="mt-4 text-[13px] text-muted hover:text-fg">
        ข้ามไปหน้าแอป
      </Link>
    </main>
  );
}
