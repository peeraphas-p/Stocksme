"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, Coins, Scale, TrendingUp } from "lucide-react";
import { AiChat, type ChatMessage } from "@/components/ui/ai-chat";
import { PageHeader } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { buildAiContext } from "@/lib/ai-context";
import { dividendsBySymbol, summarizeCash } from "@/lib/cash";
import { useCash, useJournal } from "@/lib/data";
import { usePrices, valuePositions } from "@/lib/prices";
import { useApp } from "@/lib/useApp";

const ERRORS = {
  auth: "errAuth",
  not_configured: "errNotConfigured",
  missing_migration: "errMissingMigration",
  limit: "errLimit",
  busy: "errBusy",
  refusal: "errRefusal",
} as const;

export default function AskPage() {
  const app = useApp();
  const cash = useCash();
  const journal = useJournal();
  const { lang, m, t } = useI18n();
  const a = m.ask;
  const quotes = usePrices(app.pnl.open.map((o) => o.symbol));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);

  // สรุปบัญชีที่ส่งไปพร้อมคำถาม (คำนวณจากข้อมูลที่หน้าเว็บมีอยู่แล้ว)
  const context = useMemo(
    () =>
      buildAiContext({
        now: new Date(),
        closed: app.pnl.closed,
        open: valuePositions(app.pnl.open, quotes.prices, app.latestFx),
        latestFx: app.latestFx,
        cash: cash.error ? null : { summary: summarizeCash(cash.data, app.trades), dividends: dividendsBySymbol(cash.data) },
        journal: journal.data,
        strategyTags: app.profile.strategy_tags,
      }),
    [app.pnl, app.latestFx, app.trades, app.profile.strategy_tags, quotes.prices, cash.data, cash.error, journal.data],
  );

  async function ask(question: string) {
    setError(null);
    const history: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    let answer = "";
    let failed: string | null = null;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-20), context, lang }),
        signal: ctrl.signal,
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const ev = JSON.parse(buf.slice(0, nl)) as { t: string; v?: string; code?: string; left?: number; cut?: boolean };
          buf = buf.slice(nl + 1);
          if (ev.t === "text" && ev.v) {
            answer += ev.v;
            setMessages([...history, { role: "assistant", content: answer }]);
          } else if (ev.t === "done") {
            if (typeof ev.left === "number") setLeft(ev.left);
            if (ev.cut) answer += `\n\n${a.cut}`;
          } else if (ev.t === "error") {
            failed = ev.code ?? "failed";
          }
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) failed = "failed";
    } finally {
      abort.current = null;
      setBusy(false);
    }
    if (failed) {
      setError(a[ERRORS[failed as keyof typeof ERRORS] ?? "errFailed"]);
      if (failed === "limit") setLeft(0);
    }
    // ไม่มีคำตอบ (ล้มเหลวหรือกดหยุดก่อน) → เอาคำถามกลับไปไว้ในประวัติแต่ตัดฟองคำตอบว่างทิ้ง
    setMessages(answer ? [...history, { role: "assistant", content: answer }] : history.length > 1 ? history.slice(0, -1) : []);
  }

  const noData = !app.loading && app.trades.length === 0;
  const status = error ? (
    <span className="text-loss">{error}</span>
  ) : (
    <span>
      {left != null && <b className="font-medium">{t(a.left, { n: left })} · </b>}
      {a.note}
    </span>
  );

  return (
    <>
      <PageHeader eyebrow={a.eyebrow} title={a.title} />
      {noData && <p className="text-[13px] text-muted">{a.noData}</p>}
      <AiChat
        heading={a.heading}
        placeholder={a.placeholder}
        messages={messages}
        busy={busy}
        disabled={app.loading || noData || left === 0}
        onSend={ask}
        onStop={() => abort.current?.abort()}
        onReset={() => {
          setMessages([]);
          setError(null);
        }}
        suggestions={[
          { icon: <CalendarDays size={14} aria-hidden="true" />, label: a.s1 },
          { icon: <TrendingUp size={14} aria-hidden="true" />, label: a.s2 },
          { icon: <Scale size={14} aria-hidden="true" />, label: a.s3 },
          { icon: <Coins size={14} aria-hidden="true" />, label: a.s4 },
        ]}
        labels={{ send: a.send, stop: a.stop, newChat: a.newChat, you: a.you, assistant: a.assistant, thinking: a.thinking }}
        status={status}
      />
    </>
  );
}
