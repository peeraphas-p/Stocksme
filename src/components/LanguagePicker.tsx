"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { LANGS, type Lang } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

// ธงแบบ SVG ในตัว (ภาพจาก country-flag-icons, MIT) — ไม่ต้องลงแพ็กเกจธงทั้งโลกเพื่อใช้แค่ 2 ผืน
// และแสดงได้ทุกระบบ ต่างจาก emoji ธงที่ Windows ไม่แสดง
const US_STARS =
  "m47.8 138.9-4-12.8-4.4 12.8H26.2l10.7 7.7-4 12.8 10.9-7.9 10.6 7.9-4.1-12.8 10.9-7.7zM104.1 138.9l-4.1-12.8-4.2 12.8H82.6l10.7 7.7-4 12.8 10.7-7.9 10.8 7.9-4-12.8 10.7-7.7zM160.6 138.9l-4.3-12.8-4 12.8h-13.5l11 7.7-4.2 12.8 10.7-7.9 11 7.9-4.2-12.8 10.7-7.7zM216.8 138.9l-4-12.8-4.2 12.8h-13.3l10.8 7.7-4 12.8 10.7-7.9 10.8 7.9-4.3-12.8 11-7.7zM100 75.3l-4.2 12.8H82.6L93.3 96l-4 12.6 10.7-7.8 10.8 7.8-4-12.6 10.7-7.9h-13.4zM43.8 75.3l-4.4 12.8H26.2L36.9 96l-4 12.6 10.9-7.8 10.6 7.8L50.3 96l10.9-7.9H47.8zM156.3 75.3l-4 12.8h-13.5l11 7.9-4.2 12.6 10.7-7.8 11 7.8-4.2-12.6 10.7-7.9h-13.2zM212.8 75.3l-4.2 12.8h-13.3l10.8 7.9-4 12.6 10.7-7.8 10.8 7.8-4.3-12.6 11-7.9h-13.5zM43.8 24.7l-4.4 12.6H26.2l10.7 7.9-4 12.7L43.8 50l10.6 7.9-4.1-12.7 10.9-7.9H47.8zM100 24.7l-4.2 12.6H82.6l10.7 7.9-4 12.7L100 50l10.8 7.9-4-12.7 10.7-7.9h-13.4zM156.3 24.7l-4 12.6h-13.5l11 7.9-4.2 12.7 10.7-7.9 11 7.9-4.2-12.7 10.7-7.9h-13.2zM212.8 24.7l-4.2 12.6h-13.3l10.8 7.9-4 12.7 10.7-7.9 10.8 7.9-4.3-12.7 11-7.9h-13.5z";

const FLAGS = {
  US: (
    <svg viewBox="0 0 513 342" className="block h-full w-full">
      <path fill="#FFF" d="M0 0h513v342H0z" />
      <path fill="#D80027" d="M0 0h513v26.3H0zM0 52.6h513v26.3H0zM0 105.2h513v26.3H0zM0 157.8h513v26.3H0zM0 210.5h513v26.3H0zM0 263.1h513v26.3H0zM0 315.7h513V342H0z" />
      <path fill="#2E52B2" d="M0 0h256.5v184.1H0z" />
      <path fill="#FFF" d={US_STARS} />
    </svg>
  ),
  TH: (
    <svg viewBox="0 85.333 512 341.333" className="block h-full w-full">
      <path fill="#FFF" d="M0 85.334h512V426.66H0z" />
      <path fill="#0052B4" d="M0 194.056h512v123.882H0z" />
      <path fill="#D80027" d="M0 85.334h512v54.522H0zM0 372.143h512v54.522H0z" />
    </svg>
  ),
} as const;

/** ธงชาติหน้าชื่อภาษา */
export function Flag({ code, className = "" }: { code: Lang; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_var(--border)] ${className}`} aria-hidden="true">
      {FLAGS[LANGS.find((l) => l.code === code)!.flag]}
    </span>
  );
}

/** รายการภาษาพร้อมธง (ใช้ในหน้าตั้งค่า) */
export function LanguageList() {
  const { lang, setLang, switching } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {LANGS.map((l) => (
        <button
          key={l.code}
          lang={l.code}
          onClick={() => setLang(l.code)}
          disabled={switching}
          aria-pressed={lang === l.code}
          className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[13px] cursor-pointer transition-colors ${
            lang === l.code ? "bg-[color-mix(in_srgb,var(--cta)_18%,transparent)] font-medium ring-1 ring-[var(--cta)]" : "hover:bg-[var(--hover)]"
          }`}
        >
          <Flag code={l.code} className="h-[15px] w-[22px]" />
          <span className="flex-1">{l.name}</span>
          {lang === l.code && <Check size={14} className="text-[var(--cta)]" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}

/** ปุ่มเลือกภาษาบน top bar */
export default function LanguagePicker() {
  const { lang, setLang, switching, m } = useI18n();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const current = LANGS.find((l) => l.code === lang)!;

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

  return (
    <div className="relative" ref={wrap}>
      <button
        className="flex h-9 items-center gap-1.5 rounded-[9px] px-2 text-[13px] hover:bg-[var(--hover)] cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${m.common.language}: ${current.name}`}
        title={m.common.language}
        onClick={() => setOpen(!open)}
      >
        {switching ? <Languages size={16} className="animate-pulse" aria-hidden="true" /> : <Flag code={lang} className="h-[14px] w-[21px]" />}
        <span className="hidden lg:inline">{current.name}</span>
        <ChevronDown size={13} className="hidden text-muted sm:block" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={m.common.language}
          className="glass absolute right-0 top-[calc(100%+10px)] z-40 w-44 rounded-[16px] p-1.5"
          style={{ background: "color-mix(in srgb, var(--panel) 95%, transparent)" }}
        >
          {LANGS.map((l) => (
            <button
              key={l.code}
              role="menuitemradio"
              aria-checked={lang === l.code}
              lang={l.code}
              onClick={() => {
                setOpen(false);
                if (l.code !== lang) setLang(l.code);
              }}
              className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[13px] cursor-pointer hover:bg-[var(--hover)] ${lang === l.code ? "font-medium" : ""}`}
            >
              <Flag code={l.code} className="h-[15px] w-[22px]" />
              <span className="flex-1">{l.name}</span>
              {lang === l.code && <Check size={14} className="text-[var(--cta)]" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
