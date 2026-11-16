"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileJson, KeyRound, LogOut, Trash2, TriangleAlert } from "lucide-react";
import { Note, Sheet } from "@/components/ui";
import { deleteMyAccount, exportAllData } from "@/lib/data";
import { supabase } from "@/lib/supabase/client";

const CONFIRM_WORD = "ลบบัญชี";

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function AccountCard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<"pw" | "export" | "delete" | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [delErr, setDelErr] = useState<string | null>(null);

  useEffect(() => {
    supabase().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy("pw");
    const { error } = await supabase().auth.updateUser({ password: pw });
    setBusy(null);
    setPwMsg(error ? { ok: false, text: "เปลี่ยนไม่สำเร็จ: " + error.message } : { ok: true, text: "เปลี่ยนรหัสผ่านแล้ว" });
    if (!error) setPw("");
  }

  async function exportJson() {
    setBusy("export");
    try {
      const data = await exportAllData();
      download(`stocksme-all-data-${new Date().toLocaleDateString("en-CA")}.json`, JSON.stringify(data, null, 2), "application/json");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setDelErr(null);
    try {
      await deleteMyAccount();
      router.replace("/welcome");
      router.refresh();
    } catch (e) {
      const m = String((e as { message?: string }).message ?? e);
      setDelErr(
        m.includes("delete_my_account")
          ? "ฐานข้อมูลยังไม่มีฟังก์ชันลบบัญชี — ผู้ดูแลเว็บต้องรัน migration ล่าสุดใน Supabase ก่อน"
          : "ลบไม่สำเร็จ: " + m,
      );
      setBusy(null);
    }
  }

  async function signOut() {
    await supabase().auth.signOut();
    router.replace("/welcome");
    router.refresh();
  }

  return (
    <div className="card space-y-4 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">บัญชี</h2>
          <p className="text-xs text-muted">{email || "—"}</p>
        </div>
        <button className="btn btn-danger" onClick={signOut}>
          <LogOut size={15} aria-hidden="true" />
          ออกจากระบบ
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={changePassword} className="space-y-2">
          <label className="field">
            <span className="flex items-center gap-1.5">
              <KeyRound size={13} aria-hidden="true" /> เปลี่ยนรหัสผ่าน
            </span>
            <input type="password" minLength={6} required autoComplete="new-password" placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          <button className="btn btn-primary" disabled={busy === "pw" || pw.length < 6}>
            {busy === "pw" ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
          </button>
          {pwMsg && <p className={`text-xs ${pwMsg.ok ? "text-gain" : "text-loss"}`}>{pwMsg.text}</p>}
        </form>

        <div className="space-y-2">
          <div className="field">
            <span className="flex items-center gap-1.5">
              <FileJson size={13} aria-hidden="true" /> ข้อมูลทั้งหมดของคุณ
            </span>
          </div>
          <p className="text-xs text-muted">รายการซื้อขาย สมุดบันทึก เงินเข้า-ออก ประวัติการนำเข้า และการตั้งค่า เป็นไฟล์ JSON ไฟล์เดียว</p>
          <button className="btn btn-primary" onClick={exportJson} disabled={busy === "export"}>
            {busy === "export" ? "กำลังเตรียมไฟล์…" : "ดาวน์โหลดข้อมูลทั้งหมด (JSON)"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-loss-soft p-3">
        <p className="text-xs text-loss">ลบบัญชีและข้อมูลทั้งหมดถาวร กู้คืนไม่ได้</p>
        <button className="btn btn-danger-solid !py-1.5 text-xs" onClick={() => setDelOpen(true)}>
          <Trash2 size={14} aria-hidden="true" />
          ลบบัญชี
        </button>
      </div>

      <Sheet open={delOpen} onClose={() => (busy ? null : setDelOpen(false))} title="ลบบัญชีถาวร">
        <div className="space-y-4 text-[13px]">
          <Note icon={TriangleAlert} tone="loss">
            จะลบบัญชี <b>{email}</b> พร้อมรายการซื้อขาย สมุดบันทึก เงินเข้า-ออก และการตั้งค่าทั้งหมด <b>กู้คืนไม่ได้</b>
          </Note>
          <p className="text-muted">แนะนำให้ดาวน์โหลดข้อมูลทั้งหมด (JSON) เก็บไว้ก่อน</p>
          <label className="field">
            <span>
              พิมพ์ <b className="text-fg">{CONFIRM_WORD}</b> เพื่อยืนยัน
            </span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          {delErr && <p className="text-loss">{delErr}</p>}
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setDelOpen(false)} disabled={busy === "delete"}>
              ยกเลิก
            </button>
            <button className="btn btn-danger-solid" onClick={remove} disabled={typed.trim() !== CONFIRM_WORD || busy === "delete"}>
              {busy === "delete" ? "กำลังลบ…" : "ลบบัญชีถาวร"}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
