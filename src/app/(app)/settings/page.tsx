"use client";

import { useEffect, useState } from "react";
import { Download, Plus, X } from "lucide-react";
import AccountCard from "@/components/AccountCard";
import { AppearanceControls } from "@/components/AppShell";
import { CurrencyToggle, PageHeader } from "@/components/ui";
import { saveProfile } from "@/lib/data";
import { useApp } from "@/lib/useApp";
import type { Currency } from "@/lib/types";

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function SettingsPage() {
  const app = useApp();
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

  return (
    <>
      <PageHeader eyebrow="บัญชีและค่าเริ่มต้น" title="ตั้งค่า" />
      {msg && <div className="text-[13px] text-muted">{msg}</div>}

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 md:items-start">
      <AccountCard />
      <div className="card space-y-2">
        <h2 className="text-sm font-semibold tracking-tight">สกุลเงินเริ่มต้น</h2>
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
        <h2 className="text-sm font-semibold tracking-tight">กลยุทธ์ (Playbook)</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="chip">
              {t}
              <button className="-mr-1 ml-1 grid h-4 w-4 place-items-center rounded-full text-muted hover:text-loss cursor-pointer" onClick={() => removeTag(t)} aria-label={`ลบ ${t}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder="เพิ่มกลยุทธ์ใหม่" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} />
          <button className="btn" onClick={addTag}>
            <Plus size={15} aria-hidden="true" />
            เพิ่ม
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-1 text-sm font-semibold tracking-tight">หน้าตาแอป</h2>
        <p className="mb-4 text-xs text-muted">กระจก พื้นหลัง และธีม · บันทึกไว้ในเครื่องนี้</p>
        <AppearanceControls />
      </div>

      <div className="card space-y-2">
        <h2 className="text-sm font-semibold tracking-tight">สำรองข้อมูล</h2>
        <button className="btn" onClick={exportCsv} disabled={app.trades.length === 0}>
          <Download size={15} aria-hidden="true" />
          ดาวน์โหลดรายการซื้อขาย (CSV)
        </button>
      </div>

      </div>
    </>
  );
}
