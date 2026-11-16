"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrency, useProfile, useTrades } from "./data";
import { fetchFxRates } from "./fx";
import { computePnl } from "./pnl";

/** ข้อมูลที่ทุกหน้าใช้: รายการ, ผล FIFO, ตั้งค่า, สกุลเงินที่แสดง */
export function useApp() {
  const trades = useTrades();
  const profile = useProfile();
  const [currency, setCurrency] = useCurrency(profile.data.default_currency);
  const [latestFx, setLatestFx] = useState(35);

  useEffect(() => {
    fetchFxRates([]).then(({ latest }) => latest && setLatestFx(latest));
  }, []);

  const pnl = useMemo(() => computePnl(trades.data, latestFx), [trades.data, latestFx]);

  return {
    trades: trades.data,
    loading: trades.loading || profile.loading,
    error: trades.error ?? profile.error,
    reload: trades.reload,
    profile: profile.data,
    reloadProfile: profile.reload,
    currency,
    setCurrency,
    latestFx,
    pnl,
  };
}
