"use client";

import { useCallback, useEffect, useState } from "react";

/** หน้าตาแอปที่ผู้ใช้ปรับได้ (เก็บในเครื่องนี้) */
export interface Appearance {
  theme: "system" | "light" | "dark";
  background: "room" | "plain";
  blur: number; // px
  opacity: number; // 0.08–0.9
  saturation: number; // 0.5–2
  edge: number; // 0–1
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "system",
  background: "room",
  blur: 22,
  opacity: 0.3,
  saturation: 1.2,
  edge: 0.6,
};

export const GLASS_PRESETS: { name: string; value: Pick<Appearance, "blur" | "opacity" | "saturation" | "edge"> }[] = [
  { name: "ใส", value: { blur: 8, opacity: 0.14, saturation: 1.1, edge: 0.8 } },
  { name: "ฝ้า", value: { blur: 22, opacity: 0.3, saturation: 1.2, edge: 0.6 } },
  { name: "ทึบ", value: { blur: 32, opacity: 0.82, saturation: 1, edge: 0.35 } },
];

const KEY = "stocksme.appearance";
const EVENT = "stocksme:appearance";

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

export function normalizeAppearance(v: Partial<Appearance> | null | undefined): Appearance {
  const d = DEFAULT_APPEARANCE;
  return {
    theme: v?.theme === "light" || v?.theme === "dark" ? v.theme : "system",
    background: v?.background === "plain" ? "plain" : "room",
    blur: clamp(v?.blur, 0, 40, d.blur),
    opacity: clamp(v?.opacity, 0.08, 0.9, d.opacity),
    saturation: clamp(v?.saturation, 0.5, 2, d.saturation),
    edge: clamp(v?.edge, 0, 1, d.edge),
  };
}

function load(): Appearance {
  try {
    return normalizeAppearance(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function applyAppearance(a: Appearance) {
  const el = document.documentElement;
  if (a.theme === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", a.theme);
  el.style.setProperty("--glass-blur", `${a.blur}px`);
  el.style.setProperty("--glass-opacity", String(a.opacity));
  el.style.setProperty("--glass-sat", String(a.saturation));
  el.style.setProperty("--glass-edge", String(a.edge));
  if (a.background === "plain") el.style.setProperty("--room-image", "none");
  else el.style.removeProperty("--room-image");
}

/**
 * สคริปต์เล็กๆ ที่รันก่อนหน้าเว็บแสดงผล เพื่อไม่ให้ธีม/กระจกกระพริบตอนโหลด
 * (ต้องตรงกับ applyAppearance)
 */
export const APPEARANCE_BOOT_SCRIPT = `try{var a=JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})||"null");if(a){var e=document.documentElement,s=e.style;if(a.theme==="light"||a.theme==="dark")e.setAttribute("data-theme",a.theme);if(typeof a.blur==="number")s.setProperty("--glass-blur",a.blur+"px");if(typeof a.opacity==="number")s.setProperty("--glass-opacity",a.opacity);if(typeof a.saturation==="number")s.setProperty("--glass-sat",a.saturation);if(typeof a.edge==="number")s.setProperty("--glass-edge",a.edge);if(a.background==="plain")s.setProperty("--room-image","none")}}catch(_){}`;

/** อ่าน/แก้หน้าตาแอป; ทุก component ที่ใช้ hook นี้จะอัปเดตพร้อมกัน */
export function useAppearance() {
  const [value, setValue] = useState<Appearance>(DEFAULT_APPEARANCE);

  useEffect(() => {
    setValue(load());
    const sync = () => setValue(load());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((patch: Partial<Appearance>) => {
    const next = normalizeAppearance({ ...load(), ...patch });
    applyAppearance(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setValue(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [value, update] as const;
}

/** โหมดที่แสดงอยู่จริง (แปลง "system" เป็นสว่าง/มืดตามเครื่อง) */
export function useResolvedDark(theme: Appearance["theme"]) {
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return theme === "dark" || (theme === "system" && systemDark);
}
