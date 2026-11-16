"use client";

import { useEffect } from "react";
import { Inbox, TriangleAlert, X, type LucideIcon } from "lucide-react";
import type { Currency } from "@/lib/types";
import { useI18n } from "@/i18n/client";

export function PageHeader({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-end justify-between gap-3 sm:mb-3">
      <div>
        {eyebrow && <p className="mb-1 text-xs text-muted sm:text-[13px]">{eyebrow}</p>}
        <h1 className="text-[25px] leading-[1.15] font-medium tracking-[-0.035em] sm:text-[30px]">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="segment" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CurrencyToggle({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  const { m } = useI18n();
  return (
    <Segmented
      label={m.common.currency}
      value={value}
      onChange={onChange}
      options={[
        { value: "USD", label: "USD" },
        { value: "THB", label: "THB" },
      ]}
    />
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { m } = useI18n();
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:max-w-lg md:rounded-[24px]"
        style={{ background: "color-mix(in srgb, var(--panel) 94%, transparent)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={m.common.close}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon: Icon,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className="card">
      <div className="panel-title mb-3">
        <span>{label}</span>
        {Icon && <Icon size={16} strokeWidth={1.7} className="opacity-70" aria-hidden="true" />}
      </div>
      <div className={`big-number text-[22px] sm:text-2xl ${className}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export function Empty({ children, icon: Icon = Inbox, title }: { children?: React.ReactNode; icon?: LucideIcon; title?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-4 py-14 text-center text-[13px] text-muted">
      <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
      {title && <h3 className="text-[15px] font-medium text-fg">{title}</h3>}
      {children && <div className="max-w-sm">{children}</div>}
    </div>
  );
}

export function ErrorBox({ error }: { error: string | null }) {
  const { m, t } = useI18n();
  if (!error) return null;
  return (
    <div className="card flex items-start gap-2.5 text-sm text-loss">
      <TriangleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{t(m.common.error, { e: error })}</span>
    </div>
  );
}

/** แถบแจ้งเตือน/คำอธิบายในแผง */
export function Note({ icon: Icon, tone = "muted", children }: { icon: LucideIcon; tone?: "muted" | "loss" | "gain"; children: React.ReactNode }) {
  const color = tone === "loss" ? "text-loss" : tone === "gain" ? "text-gain" : "text-muted";
  const bg = tone === "loss" ? "bg-loss-soft" : tone === "gain" ? "bg-gain-soft" : "bg-bg";
  return (
    <div className={`flex items-start gap-2.5 rounded-[12px] p-3 text-[13px] ${bg} ${color}`}>
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** แถบโครงร่างระหว่างโหลด */
export function SkeletonBar({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-md bg-[color-mix(in_srgb,var(--fg)_9%,transparent)] ${className}`} />;
}

/** การ์ดโครงร่างระหว่างโหลด (แทนข้อความ "กำลังโหลด…") */
export function Skeleton({ cards = 1, rows = 4, className = "" }: { cards?: number; rows?: number; className?: string }) {
  const { m } = useI18n();
  return (
    <div role="status" aria-label={m.common.loading} className={`grid gap-3 sm:gap-4 ${cards > 1 ? "sm:grid-cols-2 lg:grid-cols-4" : ""} ${className}`}>
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="card space-y-3">
          <SkeletonBar className="h-3 w-1/3" />
          {Array.from({ length: rows }, (_, j) => (
            <SkeletonBar key={j} className={`h-3.5 ${j % 3 === 0 ? "w-full" : j % 3 === 1 ? "w-5/6" : "w-2/3"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** โครงร่างของหน้าภาพรวม */
export function DashboardSkeleton() {
  const { m } = useI18n();
  return (
    <div role="status" aria-label={m.common.loading} className="space-y-3 sm:space-y-4">
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[0.82fr_1.5fr]">
        <div className="card space-y-4">
          <SkeletonBar className="h-3 w-1/2" />
          <SkeletonBar className="h-10 w-3/4" />
          <SkeletonBar className="h-3 w-2/3" />
          <SkeletonBar className="mt-10 h-9 w-1/2" />
        </div>
        <div className="card space-y-4">
          <SkeletonBar className="h-3 w-1/4" />
          <SkeletonBar className="h-6 w-1/2" />
          <SkeletonBar className="h-[170px] w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-3">
            <SkeletonBar className="h-3 w-1/2" />
            <SkeletonBar className="h-7 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
