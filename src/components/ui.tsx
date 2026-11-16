"use client";

import type { Currency } from "@/lib/types";

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1 cursor-pointer ${value === o.value ? "bg-accent text-white" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CurrencyToggle({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <Segmented
      value={value}
      onChange={onChange}
      options={[
        { value: "USD", label: "$ USD" },
        { value: "THB", label: "฿ THB" },
      ]}
    />
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full md:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="text-2xl leading-none text-muted cursor-pointer" onClick={onClose} aria-label="ปิด">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, className = "" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className="card">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-xl font-bold ${className}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card text-center text-sm text-muted py-10">{children}</div>;
}

export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="card border-loss text-loss text-sm">เกิดข้อผิดพลาด: {error}</div>;
}
