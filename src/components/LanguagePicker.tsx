"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { TH, US } from "country-flag-icons/react/3x2";
import { LANGS, type Lang } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

const FLAGS = { TH, US } as const;

/** ธงชาติ (SVG — แสดงได้ทุกระบบ ต่างจาก emoji ธงที่ Windows ไม่แสดง) */
export function Flag({ code, className = "" }: { code: Lang; className?: string }) {
  const C = FLAGS[LANGS.find((l) => l.code === code)!.flag];
  return (
    <span className={`inline-flex shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_var(--border)] ${className}`} aria-hidden="true">
      <C className="block h-full w-full" />
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
