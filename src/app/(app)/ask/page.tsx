"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, Coins, Scale, Settings2, TrendingUp } from "lucide-react";
import AiSetup from "@/components/AiSetup";
import { AiChat, type ChatMessage } from "@/components/ui/ai-chat";
import { PageHeader } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { buildAiContext } from "@/lib/ai-context";
import { systemPrompt } from "@/lib/ai/prompt";
import { AiError, providerOf, streamChat } from "@/lib/ai/providers";
import { useAiSettings } from "@/lib/ai/settings";
import { dividendsBySymbol, summarizeCash } from "@/lib/cash";
import { useCash, useJournal } from "@/lib/data";
import { usePrices, valuePositions } from "@/lib/prices";
import { useApp } from "@/lib/useApp";

const ERR = { auth: "errAuth", limit: "errLimit", busy: "errBusy", refusal: "errRefusal", model: "errModel", network: "errNetwork", failed: "errFailed" } as const;

export default function AskPage() {
  const app = useApp();
  const cash = useCash();
  const journal = useJournal();
  const { lang, m, t } = useI18n();
  const a = m.ask;
  const ai = useAiSettings();
  const provider = providerOf(ai.settings.provider);
  const apiKey = ai.settings.keys[provider.id];
  const model = ai.settings.models[provider.id] || provider.defaultModel;
  const quotes = usePrices(app.pnl.open.map((o) => o.symbol));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
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
    if (!apiKey || !model) return;
    setError(null);
    const history: ChatMessage[] = [...messages, { role: "user" as const, content: question }].slice(-20);
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    let answer = "";
    try {
      const { cut } = await streamChat({
        provider: provider.id,
        apiKey,
        model,
        system: systemPrompt(context, lang === "th" ? "th" : "en"),
        messages: history,
        signal: ctrl.signal,
        onText: (d) => {
          answer += d;
          setMessages([...history, { role: "assistant", content: answer }]);
        },
      });
      if (cut) answer += `\n\n${a.cut}`;
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        const code = e instanceof AiError ? e.code : "failed";
        setError(t(a[ERR[code]], { company: provider.company }));
        if (code === "auth" || code === "model") setSetupOpen(true);
      }
    } finally {
      abort.current = null;
      setBusy(false);
    }
    // ไม่มีคำตอบ (ล้มเหลวหรือกดหยุดก่อน) → ตัดฟองคำตอบว่างทิ้ง
    setMessages(answer ? [...history, { role: "assistant", content: answer }] : history);
  }

  const noData = !app.loading && app.trades.length === 0;
  const connected = ai.ready && !!apiKey;

  return (
    <>
      <PageHeader eyebrow={a.eyebrow} title={a.title}>
        {connected && !setupOpen && (
          <button className="btn" onClick={() => setSetupOpen(true)}>
            <Settings2 size={15} aria-hidden="true" />
            {a.change}
          </button>
        )}
      </PageHeader>

      {ai.ready && (!connected || setupOpen) && <AiSetup settings={ai.settings} update={ai.update} onDone={connected ? () => setSetupOpen(false) : undefined} />}
      {noData && <p className="text-[13px] text-muted">{a.noData}</p>}

      {connected && (
        <AiChat
          heading={a.heading}
          placeholder={a.placeholder}
          messages={messages}
          busy={busy}
          disabled={app.loading || noData}
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
          status={
            error ? (
              <span className="text-loss">{error}</span>
            ) : (
              <span>
                <b className="font-medium">{t(a.usingModel, { name: provider.name, model })}</b> · {t(a.note, { company: provider.company })}
              </span>
            )
          }
        />
      )}
    </>
  );
}
