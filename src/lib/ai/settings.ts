"use client";

// การตั้งค่าผู้ช่วย AI ของผู้ใช้ — เก็บในเบราว์เซอร์นี้เท่านั้น (localStorage) ไม่ส่งไปที่ server ของ Stocksme
import { useCallback, useEffect, useState } from "react";
import type { ProviderId } from "./providers";

const STORAGE = "stocksme-ai";

export interface AiSettings {
  provider: ProviderId;
  keys: Partial<Record<ProviderId, string>>;
  models: Partial<Record<ProviderId, string>>;
}

const EMPTY: AiSettings = { provider: "anthropic", keys: {}, models: {} };

function read(): AiSettings {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return EMPTY;
    const v = JSON.parse(raw) as Partial<AiSettings>;
    const provider = v.provider === "openai" || v.provider === "gemini" ? v.provider : "anthropic";
    return { provider, keys: v.keys ?? {}, models: v.models ?? {} };
  } catch {
    return EMPTY;
  }
}

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(read());
    setReady(true);
  }, []);

  const update = useCallback((patch: (s: AiSettings) => AiSettings) => {
    setSettings((prev) => {
      const next = patch(prev);
      try {
        localStorage.setItem(STORAGE, JSON.stringify(next));
      } catch {
        // โหมดไม่ระบุตัวตนหรือปิด storage — ใช้ได้จนกว่าจะปิดหน้า
      }
      return next;
    });
  }, []);

  return { settings, ready, update };
}
