// ผู้ช่วย AI แบบใช้ API key ของผู้ใช้เอง (BYOK)
// เบราว์เซอร์ส่งคำขอตรงไปที่ผู้ให้บริการ AI — key และคำถามไม่ผ่าน server ของ Stocksme
// Claude ใช้ SDK ทางการของ Anthropic; OpenAI และ Gemini ใช้ REST ผ่าน fetch (ไม่ต้องลงแพ็กเกจเพิ่ม)
import Anthropic from "@anthropic-ai/sdk";

export type ProviderId = "anthropic" | "openai" | "gemini";

export const PROVIDERS: { id: ProviderId; name: string; company: string; keyUrl: string; keyPrefix: string; defaultModel: string }[] = [
  { id: "anthropic", name: "Claude", company: "Anthropic", keyUrl: "https://console.anthropic.com/settings/keys", keyPrefix: "sk-ant-", defaultModel: "claude-opus-5-5" },
  { id: "openai", name: "ChatGPT", company: "OpenAI", keyUrl: "https://platform.openai.com/api-keys", keyPrefix: "sk-", defaultModel: "" },
  { id: "gemini", name: "Gemini", company: "Google", keyUrl: "https://aistudio.google.com/apikey", keyPrefix: "", defaultModel: "gemini-3.8-flash" },
];

export const providerOf = (id: ProviderId) => PROVIDERS.find((p) => p.id === id)!;

export type AiErrorCode = "auth" | "limit" | "busy" | "refusal" | "model" | "network" | "failed";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  provider: ProviderId;
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  signal: AbortSignal;
  onText: (delta: string) => void;
}

/** ผลลัพธ์: cut = ถูกตัดเพราะยาวเกิน */
export interface StreamResult {
  cut: boolean;
}

const MAX_OUTPUT = 8000;

// ---------- ตัวช่วย ----------

/** อ่าน Server-Sent Events: คืนค่า data ของแต่ละ event */
async function* sse(res: Response): AsyncGenerator<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let end: number;
    while ((end = buf.indexOf("\n\n")) >= 0) {
      const event = buf.slice(0, end);
      buf = buf.slice(end + 2);
      const data = event
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (data) yield data;
    }
  }
}

/** แปลง HTTP error ของ OpenAI / Gemini เป็นรหัสที่หน้าเว็บแปลได้ */
async function httpError(res: Response): Promise<AiError> {
  let message = "";
  try {
    const body = await res.json();
    message = String(body?.error?.message ?? "");
  } catch {
    // ไม่ใช่ JSON
  }
  const lower = message.toLowerCase();
  if (res.status === 401 || res.status === 403 || lower.includes("api key")) return new AiError("auth", message);
  if (res.status === 429) return new AiError(lower.includes("quota") || lower.includes("billing") ? "limit" : "busy", message);
  if (res.status === 404) return new AiError("model", message);
  if (res.status >= 500) return new AiError("busy", message);
  return new AiError("failed", message || `HTTP ${res.status}`);
}

async function request(url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new AiError("network");
  }
}

// ---------- Claude (Anthropic) ----------

const claude = (apiKey: string) => new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });

function claudeError(e: unknown): unknown {
  if (e instanceof Anthropic.APIUserAbortError) return new DOMException("aborted", "AbortError");
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return new AiError("auth", e.message);
  if (e instanceof Anthropic.NotFoundError) return new AiError("model", e.message);
  if (e instanceof Anthropic.RateLimitError) return new AiError("busy", e.message);
  if (e instanceof Anthropic.APIConnectionError) return new AiError("network", e.message);
  if (e instanceof Anthropic.BadRequestError) return new AiError(/credit|billing/i.test(e.message) ? "limit" : "failed", e.message);
  if (e instanceof Anthropic.APIError) return new AiError((e.status ?? 0) >= 500 ? "busy" : "failed", e.message);
  return e;
}

async function streamClaude(o: StreamOptions): Promise<StreamResult> {
  try {
    const stream = claude(o.apiKey).beta.messages.stream(
      {
        model: o.model,
        max_tokens: MAX_OUTPUT,
        output_config: { effort: "low" }, // คำตอบแชตสั้นๆ
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        cache_control: { type: "ephemeral" },
        system: o.system,
        messages: o.messages,
      },
      { signal: o.signal },
    );
    let wrote = false;
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        wrote = true;
        o.onText(event.delta.text);
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal" && !wrote) throw new AiError("refusal");
    return { cut: final.stop_reason === "max_tokens" };
  } catch (e) {
    throw claudeError(e);
  }
}

async function listClaude(apiKey: string): Promise<string[]> {
  try {
    const ids: string[] = [];
    for await (const m of claude(apiKey).models.list()) ids.push(m.id);
    return ids;
  } catch (e) {
    throw claudeError(e);
  }
}

// ---------- OpenAI (Chat Completions) ----------

async function streamOpenAI(o: StreamOptions): Promise<StreamResult> {
  const res = await request("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: o.signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${o.apiKey}` },
    body: JSON.stringify({
      model: o.model,
      stream: true,
      max_completion_tokens: MAX_OUTPUT,
      messages: [{ role: "system", content: o.system }, ...o.messages],
    }),
  });
  if (!res.ok || !res.body) throw await httpError(res);
  let finish: string | null = null;
  for await (const data of sse(res)) {
    if (data === "[DONE]") break;
    const chunk = JSON.parse(data);
    const choice = chunk?.choices?.[0];
    const text = choice?.delta?.content;
    if (typeof text === "string" && text) o.onText(text);
    if (choice?.finish_reason) finish = choice.finish_reason;
  }
  if (finish === "content_filter") throw new AiError("refusal");
  return { cut: finish === "length" };
}

/** เฉพาะโมเดลแชต (ตัดโมเดลเสียง รูป embedding ฯลฯ ออก) */
const OPENAI_NON_CHAT = /(audio|realtime|tts|whisper|transcribe|dall-e|image|embedding|moderation|search|instruct|babbage|davinci|codex|computer-use)/;

async function listOpenAI(apiKey: string): Promise<string[]> {
  const res = await request("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${apiKey}` } });
  if (!res.ok) throw await httpError(res);
  const body = await res.json();
  return ((body?.data ?? []) as { id: string }[])
    .map((m) => m.id)
    .filter((id) => /^(gpt-|o\d|chatgpt-)/.test(id) && !OPENAI_NON_CHAT.test(id));
}

// ---------- Gemini (Google) ----------

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";

async function streamGemini(o: StreamOptions): Promise<StreamResult> {
  const model = o.model.replace(/^models\//, "");
  const res = await request(`${GEMINI}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
    method: "POST",
    signal: o.signal,
    headers: { "content-type": "application/json", "x-goog-api-key": o.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: o.system }] },
      contents: o.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: MAX_OUTPUT },
    }),
  });
  if (!res.ok || !res.body) throw await httpError(res);
  let finish: string | null = null;
  let wrote = false;
  for await (const data of sse(res)) {
    const chunk = JSON.parse(data);
    if (chunk?.promptFeedback?.blockReason) throw new AiError("refusal");
    const cand = chunk?.candidates?.[0];
    for (const part of cand?.content?.parts ?? []) {
      // ข้ามส่วนที่เป็นความคิดของโมเดล (thought) แสดงเฉพาะคำตอบ
      if (typeof part?.text === "string" && part.text && !part.thought) {
        wrote = true;
        o.onText(part.text);
      }
    }
    if (cand?.finishReason) finish = cand.finishReason;
  }
  if (!wrote && finish && !["STOP", "MAX_TOKENS"].includes(finish)) throw new AiError("refusal");
  return { cut: finish === "MAX_TOKENS" };
}

async function listGemini(apiKey: string): Promise<string[]> {
  const ids: string[] = [];
  let page = "";
  for (let i = 0; i < 10; i++) {
    const res = await request(`${GEMINI}/models?pageSize=1000${page ? `&pageToken=${encodeURIComponent(page)}` : ""}`, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (!res.ok) throw await httpError(res);
    const body = await res.json();
    for (const m of (body?.models ?? []) as { name: string; supportedGenerationMethods?: string[] }[]) {
      const id = m.name.replace(/^models\//, "");
      if (m.supportedGenerationMethods?.includes("generateContent") && /^gemini/.test(id) && !/(image|tts|audio|embedding|transcribe|live)/.test(id)) ids.push(id);
    }
    page = body?.nextPageToken ?? "";
    if (!page) break;
  }
  return ids;
}

// ---------- ใช้งาน ----------

export function streamChat(o: StreamOptions): Promise<StreamResult> {
  if (o.provider === "anthropic") return streamClaude(o);
  if (o.provider === "openai") return streamOpenAI(o);
  return streamGemini(o);
}

/** รายชื่อโมเดลที่ key นี้ใช้ได้ (ใช้ตรวจว่า key ถูกต้องด้วย) */
export async function listModels(provider: ProviderId, apiKey: string): Promise<string[]> {
  const ids = provider === "anthropic" ? await listClaude(apiKey) : provider === "openai" ? await listOpenAI(apiKey) : await listGemini(apiKey);
  return [...new Set(ids)].sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
}

/** โมเดลเริ่มต้นจากรายการ: ใช้ค่าแนะนำถ้ามี ไม่อย่างนั้นใช้ตัวแรก (เรียงชื่อใหม่ก่อน) */
export function pickDefaultModel(provider: ProviderId, ids: string[]): string {
  const preferred = providerOf(provider).defaultModel;
  if (preferred && ids.includes(preferred)) return preferred;
  return ids[0] ?? preferred;
}
