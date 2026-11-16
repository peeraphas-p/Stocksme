"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase/client";
import { orderTrades } from "./pnl";
import type { Currency, ImportBatch, JournalEntry, NewTrade, Profile, Trade } from "./types";

const PAGE = 1000;

/** ดึงทุกแถว (Supabase จำกัด 1000 แถวต่อครั้ง) */
async function fetchAll<T>(table: string, order: string, ascending: boolean): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase()
      .from(table)
      .select("*")
      .order(order, { ascending })
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data as T[]));
    if (!data || data.length < PAGE) return out;
  }
}

function useLoader<T>(load: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, loading, error, reload };
}

export const useTrades = () => useLoader(async () => orderTrades(await fetchAll<Trade>("trades", "executed_at", true)), [] as Trade[]);
export const useJournal = () =>
  useLoader(() => fetchAll<JournalEntry>("journal", "entry_date", false), [] as JournalEntry[]);
export const useBatches = () =>
  useLoader(() => fetchAll<ImportBatch>("import_batches", "created_at", false), [] as ImportBatch[]);

const DEFAULT_PROFILE: Profile = {
  default_currency: "USD",
  strategy_tags: ["Breakout", "Pullback", "Gap", "Momentum", "News"],
};

export function useProfile() {
  const res = useLoader(async () => {
    const { data, error } = await supabase().from("profiles").select("default_currency, strategy_tags").maybeSingle();
    if (error) throw error;
    return (data as Profile | null) ?? DEFAULT_PROFILE;
  }, DEFAULT_PROFILE);
  return res;
}

export async function saveProfile(p: Partial<Profile>) {
  const { data: u } = await supabase().auth.getUser();
  if (!u.user) throw new Error("not signed in");
  const { error } = await supabase()
    .from("profiles")
    .upsert({ user_id: u.user.id, ...p, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** สกุลเงินที่แสดงบนอุปกรณ์นี้ (เริ่มจากค่าใน profile) */
export function useCurrency(defaultCurrency: Currency) {
  const [cur, setCur] = useState<Currency | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem("stocksme.currency");
      if (v === "USD" || v === "THB") setCur(v);
    } catch {}
  }, []);
  const set = (c: Currency) => {
    setCur(c);
    try {
      localStorage.setItem("stocksme.currency", c);
    } catch {}
  };
  return [cur ?? defaultCurrency, set] as const;
}

const clean = (t: Partial<NewTrade>) => ({
  ...t,
  symbol: t.symbol?.trim().toUpperCase(),
});

export async function insertTrade(t: NewTrade) {
  const { error } = await supabase().from("trades").insert(clean(t));
  if (error) throw error;
}

export async function updateTrade(id: string, t: Partial<NewTrade>) {
  const { error } = await supabase().from("trades").update(clean(t)).eq("id", id);
  if (error) throw error;
}

export async function deleteTrade(id: string) {
  const { error } = await supabase().from("trades").delete().eq("id", id);
  if (error) throw error;
}

export async function saveJournal(e: Omit<JournalEntry, "id">, id?: string) {
  const q = id ? supabase().from("journal").update(e).eq("id", id) : supabase().from("journal").insert(e);
  const { error } = await q;
  if (error) throw error;
}

export async function deleteJournal(id: string) {
  const { error } = await supabase().from("journal").delete().eq("id", id);
  if (error) throw error;
}

/** นำเข้ารายการเป็นชุด; รายการที่ external_key ซ้ำจะถูกข้าม */
export async function importTrades(broker: string, filename: string, rows: NewTrade[]) {
  const sb = supabase();
  const { data: batch, error: e1 } = await sb
    .from("import_batches")
    .insert({ broker, filename, row_count: 0 })
    .select()
    .single();
  if (e1) throw e1;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => ({ ...clean(r), import_batch_id: batch.id }));
    const { data, error } = await sb
      .from("trades")
      .upsert(chunk, { onConflict: "user_id,external_key", ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    inserted += data?.length ?? 0;
  }
  if (inserted === 0) {
    await sb.from("import_batches").delete().eq("id", batch.id);
  } else {
    await sb.from("import_batches").update({ row_count: inserted }).eq("id", batch.id);
  }
  return { inserted, skipped: rows.length - inserted };
}

export async function deleteBatch(id: string) {
  const { error } = await supabase().from("import_batches").delete().eq("id", id);
  if (error) throw error;
}
