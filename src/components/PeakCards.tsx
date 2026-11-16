"use client";

import { useEffect, useRef, useState } from "react";
import { PeakChart } from "@/components/ui/peak-chart";
import { money } from "@/lib/format";
import type { Currency } from "@/lib/types";

const FONT = 'var(--font-thai), system-ui, -apple-system, "Segoe UI", sans-serif';
const GAIN_GLOW = "#2ec99a";
const LOSS_GLOW = "#f07a4a";

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
  const sym = currency === "USD" ? "$" : "฿";
  const data = [0, ...curve.map((p) => p.cum)];
  const labels = ["เริ่มต้นช่วง", ...curve.map((p) => new Date(p.day + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" }))];
  // มุมซ้ายบน: ช่วงวันที่ที่มีไม้ปิด (ไม่ซ้ำกับปุ่มเลือกช่วงเวลา)
  const range = curve.length === 0 ? "ไม่มีไม้ที่ปิดในช่วงนี้" : curve.length === 1 ? labels[1] : `${labels[1]} – ${labels[labels.length - 1]}`;
  return (
    <div ref={ref} className="flex w-full justify-center" aria-label={`กำไร/ขาดทุนสุทธิ ${periodLabel} ${money(net, currency, { sign: true })}`}>
      {width > 0 && (
        <PeakChart
          width={width}
          font={FONT}
          accent={net >= 0 ? GAIN_GLOW : LOSS_GLOW}
          data={data}
          labels={labels}
          value={Math.abs(net)}
          valuePrefix={(net < 0 ? "−" : net > 0 ? "+" : "") + sym}
          valueSuffix=""
          decimals={currency === "USD" ? 2 : 0}
          trend={net > 0 ? "up" : net < 0 ? "down" : "none"}
          title="กำไร/ขาดทุนสุทธิ"
          caption={`หักค่าธรรมเนียมแล้ว · ${trades} เทรด`}
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
const SAMPLES: Record<string, { data: number[]; labels: string[]; value: number }> = {
  สัปดาห์นี้: { data: [0, 22, -8, 31, 64, 52, 88], labels: ["เริ่ม", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."], value: 88 },
  เดือนนี้: {
    data: [0, 12, 30, 18, 46, 61, 40, 72, 95, 88, 120, 104, 141, 168, 150, 186, 210, 197, 236, 262, 248],
    labels: ["เริ่ม", ...Array.from({ length: 20 }, (_, i) => `วันที่ ${i + 1}`)],
    value: 248,
  },
  ปีนี้: {
    data: [0, 120, 80, 260, 410, 350, 520, 610, 560, 790, 940, 880, 1124],
    labels: ["เริ่ม", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
    value: 1124,
  },
};

/** ภาพหลักหน้าแรก (ข้อมูลตัวอย่าง) — เลือกช่วงเวลาแล้วเส้นจะเปลี่ยนรูปให้ดู */
export function PeakHero() {
  const [ref, width] = useBoxWidth(400);
  const [period, setPeriod] = useState("เดือนนี้");
  const s = SAMPLES[period];
  return (
    <div ref={ref} className="flex w-full justify-center" aria-label="ภาพตัวอย่างการ์ดกำไรสุทธิ (ข้อมูลตัวอย่าง)">
      {width > 0 && (
        <PeakChart
          width={width}
          font={FONT}
          accent={GAIN_GLOW}
          data={s.data}
          labels={s.labels}
          value={s.value}
          valuePrefix="+$"
          valueSuffix=""
          decimals={2}
          trend="up"
          title="กำไร/ขาดทุนสุทธิ"
          caption="ข้อมูลตัวอย่าง · หักค่าธรรมเนียมแล้ว"
          updatedText="ตัวอย่าง"
          periods={Object.keys(SAMPLES)}
          period={period}
          onPeriodChange={setPeriod}
          formatValue={(v) => money(v, "USD", { sign: true })}
        />
      )}
    </div>
  );
}
