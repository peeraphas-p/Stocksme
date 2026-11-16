"use client";

import { useEffect, useRef, useState } from "react";
import { PeakChart } from "@/components/ui/peak-chart";
import { money } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { useI18n } from "@/i18n/client";

const FONT = 'var(--font-thai), system-ui, -apple-system, "Segoe UI", sans-serif';
// สีเรืองแสงจากชุดสีของเว็บ (เขียวโลโก้ / ส้มอิฐ) และลดความสดลง ไม่ให้การ์ดเด่นจนขัดตา
const GAIN_GLOW = "#3e9a6f";
const LOSS_GLOW = "#c0603f";
const MUTED = 0.55;

/** ความกว้างของกล่อง (ปัดทีละ 10px เพื่อไม่ให้วาดการ์ดใหม่ทุกพิกเซลตอนย่อขยาย) */
function useBoxWidth(max: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.min(max, Math.floor(e.contentRect.width / 10) * 10)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [max]);
  return [ref, w] as const;
}

type Point = { day: string; cum: number };

/** การ์ดกำไร/ขาดทุนสุทธิบนหน้าภาพรวม: เส้นกำไรสะสม จุดเรืองแสงที่จุดสูงสุด และตัวเลขนับขึ้น */
export function PnlPeakCard<P extends string>({
  curve,
  net,
  trades,
  currency,
  periodLabel,
  periods,
  onPeriod,
}: {
  curve: Point[];
  net: number;
  trades: number;
  currency: Currency;
  periodLabel: string;
  periods: { value: P; label: string }[];
  onPeriod: (p: P) => void;
}) {
  const [ref, width] = useBoxWidth(420);
  const { m, t, fmt } = useI18n();
  const sym = currency === "USD" ? "$" : "฿";
  const data = [0, ...curve.map((p) => p.cum)];
  const labels = [m.peak.periodStart, ...curve.map((p) => fmt.dayMonth(p.day))];
  // มุมซ้ายบน: ช่วงวันที่ที่มีไม้ปิด (ไม่ซ้ำกับปุ่มเลือกช่วงเวลา)
  const range = curve.length === 0 ? m.overview.noClosed : curve.length === 1 ? labels[1] : `${labels[1]} – ${labels[labels.length - 1]}`;
  return (
    <div ref={ref} className="flex w-full justify-center" aria-label={`${m.peak.net} ${periodLabel} ${money(net, currency, { sign: true })}`}>
      {width > 0 && (
        <PeakChart
          width={width}
          font={FONT}
          accent={net >= 0 ? GAIN_GLOW : LOSS_GLOW}
          muted={MUTED}
          data={data}
          labels={labels}
          value={Math.abs(net)}
          valuePrefix={(net < 0 ? "−" : net > 0 ? "+" : "") + sym}
          valueSuffix=""
          decimals={currency === "USD" ? 2 : 0}
          trend={net > 0 ? "up" : net < 0 ? "down" : "none"}
          title={m.peak.net}
          caption={t(m.peak.feesCaption, { n: trades })}
          updatedText={range}
          periods={periods.map((p) => p.label)}
          period={periodLabel}
          onPeriodChange={(label) => {
            const p = periods.find((x) => x.label === label);
            if (p) onPeriod(p.value);
          }}
          formatValue={(v) => money(v, currency, { sign: true })}
        />
      )}
    </div>
  );
}

// ข้อมูลตัวอย่างสำหรับหน้าแรกเท่านั้น (ไม่ใช่ข้อมูลของใคร)
const SAMPLES = {
  thisWeek: { data: [0, 22, -8, 31, 64, 52, 88], value: 88 },
  thisMonth: { data: [0, 12, 30, 18, 46, 61, 40, 72, 95, 88, 120, 104, 141, 168, 150, 186, 210, 197, 236, 262, 248], value: 248 },
  thisYear: { data: [0, 120, 80, 260, 410, 350, 520, 610, 560, 790, 940, 880, 1124], value: 1124 },
} as const;
type SampleKey = keyof typeof SAMPLES;
const SAMPLE_KEYS = Object.keys(SAMPLES) as SampleKey[];

/** ภาพหลักหน้าแรก (ข้อมูลตัวอย่าง) — เลือกช่วงเวลาแล้วเส้นจะเปลี่ยนรูปให้ดู */
export function PeakHero() {
  const [ref, width] = useBoxWidth(400);
  const { m, t, fmt } = useI18n();
  const [period, setPeriod] = useState<SampleKey>("thisMonth");
  const s = SAMPLES[period];
  const labels = [
    m.peak.sampleStart,
    ...(period === "thisWeek"
      ? [1, 2, 3, 4, 5, 6].map((d) => fmt.weekdayShort(d))
      : period === "thisMonth"
        ? Array.from({ length: 20 }, (_, i) => t(m.peak.dayN, { n: i + 1 }))
        : Array.from({ length: 12 }, (_, i) => fmt.monthShort(i))),
  ];
  return (
    <div ref={ref} className="flex w-full justify-center" aria-label={m.peak.sampleAria}>
      {width > 0 && (
        <PeakChart
          width={width}
          font={FONT}
          accent={GAIN_GLOW}
          muted={MUTED}
          data={[...s.data]}
          labels={labels}
          value={s.value}
          valuePrefix="+$"
          valueSuffix=""
          decimals={2}
          trend="up"
          title={m.peak.net}
          caption={m.peak.sampleCaption}
          updatedText={m.peak.sampleTag}
          periods={SAMPLE_KEYS.map((k) => m.periods[k])}
          period={m.periods[period]}
          onPeriodChange={(label) => setPeriod(SAMPLE_KEYS.find((k) => m.periods[k] === label) ?? "thisMonth")}
          formatValue={(v) => money(v, "USD", { sign: true })}
        />
      )}
    </div>
  );
}
