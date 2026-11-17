"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpIcon, RotateCcw, Sparkles, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

/** ช่องพิมพ์ที่สูงขึ้นตามข้อความ (ระหว่าง minHeight ถึง maxHeight) */
function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = `${minHeight}px`;
      if (reset) return;
      textarea.style.height = `${Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY))}px`;
    },
    [minHeight, maxHeight],
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

/** markdown แบบย่อ: ย่อหน้า, **ตัวหนา**, รายการ "- " และ "1. " (สร้างเป็น element ไม่ใช้ innerHTML) */
function Markdown({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
    );
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={cn("space-y-1 pl-5", list.ordered ? "list-decimal" : "list-disc")}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flush();
    if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ""))}</p>);
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
}

export interface AiChatProps {
  heading: string;
  placeholder: string;
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onReset: () => void;
  suggestions: { icon: React.ReactNode; label: string }[];
  labels: { send: string; stop: string; newChat: string; you: string; assistant: string; thinking: string };
  /** ข้อความใต้ช่องพิมพ์ เช่น จำนวนคำถามที่เหลือ หรือข้อผิดพลาด */
  status?: React.ReactNode;
  disabled?: boolean;
}

/** หน้าแชตกับผู้ช่วย AI (ปรับจากคอมโพเนนต์แชตแบบ v0 ให้เข้ากับธีมกระจกของเว็บ) */
export function AiChat({ heading, placeholder, messages, busy, onSend, onStop, onReset, suggestions, labels, status, disabled }: AiChatProps) {
  const [value, setValue] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 60, maxHeight: 200 });
  const bottom = useRef<HTMLDivElement>(null);
  const canSend = !!value.trim() && !busy && !disabled;

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages]);

  const send = (text = value) => {
    if (!text.trim() || busy || disabled) return;
    onSend(text.trim());
    setValue("");
    adjustHeight(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col space-y-5">
      {empty ? (
        <h2 className="pt-4 text-center text-[24px] leading-tight font-medium tracking-[-0.03em] sm:pt-8 sm:text-[30px]">{heading}</h2>
      ) : (
        <div className="space-y-4" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[88%] rounded-[16px] px-4 py-3 text-[14px] leading-relaxed",
                  m.role === "user" ? "bg-[color-mix(in_srgb,var(--cta)_18%,transparent)] whitespace-pre-wrap" : "card !rounded-[16px] !p-4",
                )}
              >
                <span className="sr-only">{m.role === "user" ? labels.you : labels.assistant}: </span>
                {m.role === "assistant" ? (
                  m.content ? (
                    <Markdown text={m.content} />
                  ) : (
                    <span className="flex items-center gap-2 text-muted">
                      <Sparkles size={14} className="animate-pulse" aria-hidden="true" />
                      {labels.thinking}
                    </span>
                  )
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          <div ref={bottom} />
        </div>
      )}

      <div className="w-full">
        <div className="glass relative rounded-[18px]" style={{ background: "color-mix(in srgb, var(--panel) 92%, transparent)" }}>
          <Textarea
            ref={textareaRef}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              setValue(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            maxLength={2000}
            className="min-h-[60px] w-full resize-none border-none bg-transparent px-4 py-3 text-[14px] focus-visible:ring-0"
            style={{ overflow: "hidden" }}
          />
          <div className="flex items-center justify-between p-2.5">
            <div>
              {!empty && (
                <button type="button" onClick={onReset} disabled={busy} className="btn-ghost">
                  <RotateCcw size={14} aria-hidden="true" />
                  {labels.newChat}
                </button>
              )}
            </div>
            {busy ? (
              <button type="button" onClick={onStop} className="btn !px-3 !py-1.5 text-xs">
                <Square size={12} fill="currentColor" aria-hidden="true" />
                {labels.stop}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => send()}
                disabled={!canSend}
                aria-label={labels.send}
                className={cn("grid h-9 w-9 place-items-center rounded-[11px] transition-colors", canSend ? "btn-primary cursor-pointer" : "bg-bg text-muted")}
              >
                <ArrowUpIcon size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {status && <div className="mt-2 px-1 text-[12px] text-muted">{status}</div>}

        {empty && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={busy || disabled}
                onClick={() => send(s.label)}
                className="chip cursor-pointer gap-2 !px-3.5 !py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
