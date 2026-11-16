"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import type { Currency } from "@/lib/types";

type Point = { day: string; pnl: number; cum: number };

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;
const shortDay = (d: string) => {
  const [, m, day] = d.split("-");
  return `${Number(day)}/${Number(m)}`;
};

function Tip({ active, payload, currency, field }: { active?: boolean; payload?: { payload: Point }[]; currency: Currency; field: "pnl" | "cum" }) {
  if (!active || !payload?.length) return null;
  return <TipBody p={payload[0].payload} currency={currency} field={field} />;
}

function TipBody({ p, currency, field }: { p: Point; currency: Currency; field: "pnl" | "cum" }) {
  const { m, fmt } = useI18n();
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-[0_12px_30px_-12px_var(--shadow)] ring-1 ring-[var(--border)]" style={{ background: "color-mix(in srgb, var(--panel) 94%, transparent)", backdropFilter: "blur(12px)" }}>
      <div className="text-muted">{fmt.day(p.day)}</div>
      <div className="mt-0.5 font-medium">
        {field === "cum" ? m.charts.cumulative : m.charts.thatDay}{" "}
        {money(p[field], currency, { sign: true })}
      </div>
      {field === "cum" && <div className="text-muted">{m.charts.thatDay} {money(p.pnl, currency, { sign: true })}</div>}
    </div>
  );
}

export function EquityChart({ data, currency }: { data: Point[]; currency: Currency }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--fg)" strokeOpacity={0.11} strokeDasharray="3 5" />
        <XAxis dataKey="day" tickFormatter={shortDay} {...axis} minTickGap={24} />
        <YAxis tickFormatter={(v) => money(v, currency, { compact: true })} {...axis} width={64} />
        <ReferenceLine y={0} stroke="var(--muted)" strokeOpacity={0.6} />
        <Tooltip content={<Tip currency={currency} field="cum" />} cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }} />
        <Area type="monotone" dataKey="cum" stroke="var(--accent)" strokeWidth={2.4} fill="url(#eq)" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DailyBars({ data, currency }: { data: Point[]; currency: Currency }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--fg)" strokeOpacity={0.11} strokeDasharray="3 5" />
        <XAxis dataKey="day" tickFormatter={shortDay} {...axis} minTickGap={24} />
        <YAxis tickFormatter={(v) => money(v, currency, { compact: true })} {...axis} width={64} />
        <ReferenceLine y={0} stroke="var(--muted)" strokeOpacity={0.6} />
        <Tooltip content={<Tip currency={currency} field="pnl" />} cursor={{ fill: "var(--fg)", opacity: 0.06 }} />
        <Bar dataKey="pnl" maxBarSize={18} radius={[4, 4, 4, 4]}>
          {data.map((d) => (
            <Cell key={d.day} fill={d.pnl >= 0 ? "var(--gain)" : "var(--loss)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
