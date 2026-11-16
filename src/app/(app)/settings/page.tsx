"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CurrencyToggle, PageHeader } from "@/components/ui";
import { saveProfile } from "@/lib/data";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/lib/useApp";
import type { Currency } from "@/lib/types";

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function SettingsPage() {
  const app = useApp();
  const router = useRouter();
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => setTags(app.profile.strategy_tags), [app.profile.strategy_tags]);

  async function persist(p: { strategy_tags?: string[]; default_currency?: Currency }) {
    try {
      await saveProfile(p);
      setMsg("บันทึกแล้ว");
      app.reloadProfile();
    } catch (e) {
      setMsg("บันทึกไม่สำเร็จ: " + String((e as { message?: string }).message ?? e));
    }
  }

  function addTag() {
    const t = newTag.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setNewTag("");
    persist({ strategy_tags: next });
  }

  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    persist({ strategy_tags: next });
  }

  function exportCsv() {
    const cols = ["executed_at", "symbol", "side", "qty", "price_usd", "fee_usd", "fx_rate", "broker", "strategy_tag", "emotion", "note"] as const;
    const lines = [cols.join(","), ...app.trades.map((t) => cols.map((c) => csvCell(t[c])).join(","))];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stocksme-trades-${new Date().toLocaleDateString("en-CA")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function signOut() {
    await supabase().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <PageHeader title="ตั้งค่า" />
      {msg && <div className="text-sm text-muted">{msg}</div>}

      <div className="card space-y-2">
        <div className="text-sm font-bold">สกุลเงินเริ่มต้น</div>
        <CurrencyToggle
          value={app.profile.default_currency}
          onChange={(c) => {
            app.setCurrency(c);
            persist({ default_currency: c });
          }}
        />
        <p className="text-xs text-muted">อัตรา ฿/$ ล่าสุด: {app.latestFx.toFixed(2)} (ใช้กับรายการที่ไม่มีอัตราบันทึกไว้)</p>
      </div>

      <div className="card space-y-3">
        <div className="text-sm font-bold">กลยุทธ์ (Playbook)</div>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="chip">
              {t}
              <button className="ml-2 text-muted cursor-pointer" onClick={() => removeTag(t)} aria-label={`ลบ ${t}`}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder="เพิ่มกลยุทธ์ใหม่" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} />
          <button className="btn" onClick={addTag}>
            เพิ่ม
          </button>
        </div>
      </div>

      <div className="card space-y-2">
        <div className="text-sm font-bold">สำรองข้อมูล</div>
        <button className="btn" onClick={exportCsv} disabled={app.trades.length === 0}>
          ⬇️ ดาวน์โหลดรายการทั้งหมด (CSV)
        </button>
      </div>

      <button className="btn btn-danger" onClick={signOut}>
        ออกจากระบบ
      </button>
    </>
  );
}
