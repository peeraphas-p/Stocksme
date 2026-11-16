"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

/** วงกลมตัวอักษรแรกของอีเมล → เมนูบัญชี (อีเมล, ตั้งค่า, ออกจากระบบ) */
export default function AccountMenu() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const click = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", click);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", click);
    };
  }, [open]);

  async function signOut() {
    setBusy(true);
    await supabase().auth.signOut();
    router.replace("/welcome");
    router.refresh();
  }

  if (!email) return null;
  return (
    <div className="relative ml-0.5" ref={wrap}>
      <button
        className="grid h-[32px] w-[32px] cursor-pointer place-items-center rounded-full text-xs font-semibold ring-offset-2 hover:ring-2 hover:ring-[var(--border)]"
        style={{ background: "color-mix(in srgb, var(--cta) 26%, var(--panel))" }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="เมนูบัญชี"
        onClick={() => setOpen(!open)}
      >
        {email.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div
          role="menu"
          className="glass absolute right-0 top-[calc(100%+10px)] z-40 w-60 rounded-[18px] p-2"
          style={{ background: "color-mix(in srgb, var(--panel) 95%, transparent)" }}
        >
          <div className="px-3 pt-2 pb-3">
            <div className="text-[11px] text-muted">ล็อกอินอยู่ในชื่อ</div>
            <div className="truncate text-[13px] font-medium">{email}</div>
          </div>
          <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] hover:bg-[var(--hover)]">
            <Settings size={15} aria-hidden="true" />
            ตั้งค่าและบัญชี
          </Link>
          <button role="menuitem" onClick={signOut} disabled={busy} className="btn btn-danger mt-1.5 w-full justify-start">
            <LogOut size={15} aria-hidden="true" />
            {busy ? "กำลังออก…" : "ออกจากระบบ"}
          </button>
        </div>
      )}
    </div>
  );
}
