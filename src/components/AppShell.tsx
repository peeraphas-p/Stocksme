"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChartNoAxesCombined,
  Home,
  Moon,
  NotebookPen,
  ReceiptText,
  Settings,
  Settings2,
  Sun,
  Upload,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import AccountMenu from "@/components/AccountMenu";
import LanguagePicker from "@/components/LanguagePicker";
import { useI18n } from "@/i18n/client";
import type { Messages } from "@/i18n/messages/th";
import { BrandMark, Wordmark } from "@/components/Brand";
import { GLASS_PRESETS, useAppearance, useResolvedDark, type Appearance } from "@/lib/appearance";

const NAV: { href: string; key: keyof Messages["nav"]; icon: LucideIcon }[] = [
  { href: "/", key: "overview", icon: Home },
  { href: "/trades", key: "trades", icon: ReceiptText },
  { href: "/cash", key: "cash", icon: Wallet },
  { href: "/journal", key: "journal", icon: NotebookPen },
  { href: "/reports", key: "reports", icon: ChartNoAxesCombined },
  { href: "/import", key: "import", icon: Upload },
];

function Dock({ path, compact = false }: { path: string; compact?: boolean }) {
  const { m } = useI18n();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav
      aria-label={m.nav.main}
      className={`glass flex items-center gap-0.5 ${compact ? "w-full justify-between rounded-[18px] p-1" : "rounded-full p-[5px]"}`}
    >
      {NAV.map(({ href, key, icon: Icon }) => {
        const label = m.nav[key];
        const on = active(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex items-center justify-center transition-colors ${
              compact ? "flex-1 flex-col gap-0.5 rounded-[14px] py-1.5 text-[10px] whitespace-nowrap" : "gap-2 rounded-full px-4 py-2.5 text-xs whitespace-nowrap"
            } ${on ? "bg-surface text-fg shadow-[0_3px_8px_var(--soft)]" : "text-muted hover:bg-[var(--hover)] hover:text-fg"}`}
          >
            <Icon size={compact ? 19 : 15} strokeWidth={on ? 2 : 1.7} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const SLIDERS: { key: keyof Pick<Appearance, "blur" | "opacity" | "saturation" | "edge">; min: number; max: number; step: number; show: (v: number) => string }[] = [
  { key: "blur", min: 0, max: 40, step: 1, show: (v) => `${Math.round(v)} px` },
  { key: "opacity", min: 0.08, max: 0.9, step: 0.01, show: (v) => `${Math.round(v * 100)}%` },
  { key: "saturation", min: 0.5, max: 2, step: 0.05, show: (v) => `${Math.round(v * 100)}%` },
  { key: "edge", min: 0, max: 1, step: 0.05, show: (v) => `${Math.round(v * 100)}%` },
];
const PRESET_KEY = { clear: "presetClear", frosted: "presetFrosted", solid: "presetSolid" } as const;
const BG_KEY = { ledger: "bgLedger", stars: "bgStars", room: "bgRoom", plain: "bgPlain" } as const;
const THEME_KEY = { system: "themeSystem", light: "themeLight", dark: "themeDark" } as const;

/** ตัวปรับกระจก/ธีม/พื้นหลัง — ใช้ทั้งในแผงบน top bar และหน้าตั้งค่า */
export function AppearanceControls({ autoFocus = false }: { autoFocus?: boolean }) {
  const [a, set] = useAppearance();
  const { m } = useI18n();
  const ap = m.appearance;
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (autoFocus) first.current?.focus();
  }, [autoFocus]);
  return (
    <>
      <div className="mb-4 grid grid-cols-3 gap-1.5">
        {GLASS_PRESETS.map((p, i) => (
          <button key={p.id} ref={i === 0 ? first : undefined} className="btn py-1.5 text-xs" onClick={() => set(p.value)}>
            {ap[PRESET_KEY[p.id]]}
          </button>
        ))}
      </div>

      {SLIDERS.map((s) => (
        <label key={s.key} className="mb-3.5 block text-xs">
          <span className="flex justify-between">
            {ap[s.key]}
            <output className="text-muted">{s.show(a[s.key])}</output>
          </span>
          <input
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={a[s.key]}
            onChange={(e) => set({ [s.key]: Number(e.target.value) })}
            className="mt-2 w-full cursor-pointer accent-[var(--accent)]"
          />
        </label>
      ))}

      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        <span>{ap.background}</span>
        <div className="segment" role="group" aria-label={ap.background}>
          {(["ledger", "stars", "room", "plain"] as const).map((bg) => (
            <button key={bg} aria-pressed={a.background === bg} onClick={() => set({ background: bg })}>
              {ap[BG_KEY[bg]]}
            </button>
          ))}
        </div>
      </div>
      {a.background === "stars" ? (
        <p className="mt-3 text-[11px] text-muted">{ap.starsNote}</p>
      ) : (
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span>{ap.theme}</span>
        <div className="segment" role="group" aria-label={ap.theme}>
          {(["system", "light", "dark"] as const).map((t) => (
            <button key={t} aria-pressed={a.theme === t} onClick={() => set({ theme: t })}>
              {ap[THEME_KEY[t]]}
            </button>
          ))}
        </div>
      </div>
      )}
      <button className="btn mt-5 w-full text-xs" onClick={() => set({ ...GLASS_PRESETS[1].value, background: "ledger" })}>
        {ap.reset}
      </button>
    </>
  );
}

function GlassPanel({ onClose }: { onClose: () => void }) {
  const { m } = useI18n();
  return (
    <aside
      aria-label={m.appearance.title}
      className="glass absolute right-0 top-[calc(100%+10px)] z-40 w-[min(310px,calc(100vw-24px))] rounded-[22px] p-5"
      style={{ background: "color-mix(in srgb, var(--panel) 94%, transparent)" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-medium">
          <Settings2 size={17} aria-hidden="true" />
          {m.appearance.title}
        </h2>
        <button className="icon-btn" onClick={onClose} aria-label={m.common.close}>
          <X size={17} />
        </button>
      </div>
      <p className="mt-1 mb-4 text-xs text-muted">{m.appearance.desc}</p>
      <AppearanceControls autoFocus />
    </aside>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { m } = useI18n();
  const [appearance, setAppearance] = useAppearance();
  const dark = useResolvedDark(appearance);
  const [panel, setPanel] = useState(false);
  const panelWrap = useRef<HTMLDivElement>(null);

  // ปิดแผงเมื่อกด Esc หรือคลิกข้างนอก
  useEffect(() => {
    if (!panel) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setPanel(false);
    const click = (e: MouseEvent) => !panelWrap.current?.contains(e.target as Node) && setPanel(false);
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", click);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", click);
    };
  }, [panel]);

  useEffect(() => setPanel(false), [path]);

  return (
    <div className="min-h-dvh px-2.5 pt-3 pb-28 sm:px-5 sm:pt-6 md:pb-8 lg:px-7 lg:pt-8">
      <div className="mx-auto w-full max-w-[1280px]">
        <header className="glass relative z-30 mb-3 flex h-14 items-center justify-between gap-3 rounded-[18px] px-3 sm:mb-4 sm:h-[62px] sm:rounded-[20px] sm:px-5">
          <Link href="/" className="flex items-center gap-2.5 whitespace-nowrap">
            <BrandMark size={28} className="-my-1" />
            <Wordmark className="text-[17px]" />
            <span className="hidden h-4 w-px bg-[var(--border)] sm:block" />
            <span className="hidden text-xs text-muted lg:block">{m.nav.tagline}</span>
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-1.5" ref={panelWrap}>
            <LanguagePicker />
            <button
              className="flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-[13px] hover:bg-[var(--hover)] cursor-pointer"
              aria-expanded={panel}
              onClick={() => setPanel(!panel)}
            >
              <Settings2 size={16} aria-hidden="true" />
              <span className="hidden md:inline">{m.nav.adjustLook}</span>
            </button>
            {appearance.background !== "stars" && (
              <button className="icon-btn" aria-label={dark ? m.nav.toLight : m.nav.toDark} onClick={() => setAppearance({ theme: dark ? "light" : "dark" })}>
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            )}
            <Link href="/settings" className={`icon-btn ${path.startsWith("/settings") ? "bg-[var(--hover)]" : ""}`} aria-label={m.nav.settings} title={m.nav.settings}>
              <Settings size={17} />
            </Link>
            <AccountMenu />
            {panel && <GlassPanel onClose={() => setPanel(false)} />}
          </div>
        </header>

        <main className="glass relative rounded-[22px] px-3.5 pt-5 pb-6 sm:rounded-[27px] sm:px-7 sm:pt-7 md:pb-24">
          <div className="space-y-4">{children}</div>
          <div className="absolute bottom-[18px] left-1/2 hidden w-max -translate-x-1/2 md:block">
            <Dock path={path} />
          </div>
        </main>
      </div>

      <div className="fixed inset-x-2.5 bottom-[calc(10px+env(safe-area-inset-bottom))] z-30 md:hidden">
        <Dock path={path} compact />
      </div>
    </div>
  );
}
