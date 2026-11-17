import { afterEach, describe, expect, it, vi } from "vitest";
import { AiError, listModels, pickDefaultModel, streamChat, type ProviderId } from "./providers";

/** จำลอง Response แบบ SSE (แบ่งเป็นหลายชิ้นเพื่อทดสอบการต่อข้อมูล) */
function sseResponse(events: string[], status = 200) {
  const text = events.map((d) => `data: ${d}\n\n`).join("");
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < text.length; i += 7) c.enqueue(enc.encode(text.slice(i, i + 7)));
      c.close();
    },
  });
  return new Response(body, { status, headers: { "content-type": "text/event-stream" } });
}

async function run(provider: ProviderId, res: Response) {
  const fetchMock = vi.fn().mockResolvedValue(res);
  vi.stubGlobal("fetch", fetchMock);
  let text = "";
  const result = await streamChat({
    provider,
    apiKey: "test-key",
    model: "m",
    system: "sys",
    messages: [{ role: "user", content: "hi" }],
    signal: new AbortController().signal,
    onText: (d) => (text += d),
  });
  return { text, result, call: fetchMock.mock.calls[0] as [string, RequestInit] };
}

afterEach(() => vi.unstubAllGlobals());

describe("OpenAI", () => {
  it("streams text deltas and sends the system prompt first", async () => {
    const { text, result, call } = await run(
      "openai",
      sseResponse([
        JSON.stringify({ choices: [{ delta: { role: "assistant" } }] }),
        JSON.stringify({ choices: [{ delta: { content: "Net " } }] }),
        JSON.stringify({ choices: [{ delta: { content: "+$46" }, finish_reason: null }] }),
        JSON.stringify({ choices: [{ delta: {}, finish_reason: "length" }] }),
        "[DONE]",
      ]),
    );
    expect(text).toBe("Net +$46");
    expect(result.cut).toBe(true);
    expect(call[0]).toBe("https://api.openai.com/v1/chat/completions");
    const body = JSON.parse(String(call[1].body));
    expect(body.messages[0]).toEqual({ role: "system", content: "sys" });
    expect((call[1].headers as Record<string, string>).authorization).toBe("Bearer test-key");
  });

  it("maps a rejected key to an auth error", async () => {
    const res = new Response(JSON.stringify({ error: { message: "Incorrect API key provided" } }), { status: 401 });
    await expect(run("openai", res)).rejects.toMatchObject({ code: "auth" });
  });

  it("maps insufficient quota to a limit error", async () => {
    const res = new Response(JSON.stringify({ error: { message: "You exceeded your current quota" } }), { status: 429 });
    await expect(run("openai", res)).rejects.toMatchObject({ code: "limit" });
  });
});

describe("Gemini", () => {
  it("streams text, maps roles and skips thought parts", async () => {
    const { text, result, call } = await run(
      "gemini",
      sseResponse([
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "thinking…", thought: true }] } }] }),
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "สรุป: " }] } }] }),
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "กำไร" }] }, finishReason: "STOP" }] }),
      ]),
    );
    expect(text).toBe("สรุป: กำไร");
    expect(result.cut).toBe(false);
    expect(call[0]).toContain(":streamGenerateContent?alt=sse");
    const body = JSON.parse(String(call[1].body));
    expect(body.systemInstruction.parts[0].text).toBe("sys");
    expect(body.contents[0]).toEqual({ role: "user", parts: [{ text: "hi" }] });
  });

  it("reports a blocked prompt as a refusal", async () => {
    await expect(run("gemini", sseResponse([JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } })]))).rejects.toBeInstanceOf(AiError);
  });

  it("treats an invalid key message as an auth error", async () => {
    const res = new Response(JSON.stringify({ error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } }), { status: 400 });
    await expect(run("gemini", res)).rejects.toMatchObject({ code: "auth" });
  });

  it("lists only text models and follows pages", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [
              { name: "models/gemini-3.6-flash", supportedGenerationMethods: ["generateContent"] },
              { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
            ],
            nextPageToken: "p2",
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [{ name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"] }] })));
    vi.stubGlobal("fetch", fetchMock);
    const ids = await listModels("gemini", "k");
    expect(ids).toEqual(["gemini-3.8-flash", "gemini-3.6-flash"]);
    expect(pickDefaultModel("gemini", ids)).toBe("gemini-3.8-flash");
    expect(String(fetchMock.mock.calls[1][0])).toContain("pageToken=p2");
  });
});

describe("OpenAI model list", () => {
  it("keeps chat models only", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "gpt-5" }, { id: "gpt-4o-audio-preview" }, { id: "text-embedding-3-small" }, { id: "o4-mini" }, { id: "dall-e-3" }] }))),
    );
    expect(await listModels("openai", "k")).toEqual(["o4-mini", "gpt-5"]);
  });
});
