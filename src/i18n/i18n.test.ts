import { describe, expect, it } from "vitest";
import { countryFromHeaders, fill, LANGS, pickLang } from "./config";
import { formatters } from "./core";
import { MESSAGES } from "./messages";
import { th } from "./messages/th";

/** ทุก path ของข้อความ เช่น "trades.tabOpen" */
function paths(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === "string" ? [prefix + k] : paths(v, `${prefix}${k}.`)));
}
const get = (obj: unknown, path: string) => path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  const keys = paths(th);

  for (const { code } of LANGS) {
    it(`${code} has every message, non-empty, with the same {placeholders} as Thai`, () => {
      const msgs = MESSAGES[code];
      expect(paths(msgs).sort()).toEqual([...keys].sort());
      for (const k of keys) {
        const v = get(msgs, k) as string;
        expect(v.trim(), `${code}.${k} is empty`).not.toBe("");
        expect(vars(v), `${code}.${k} placeholders`).toEqual(vars(get(th, k) as string));
      }
    });
  }

  it("English has no Thai text (catches copy-paste mistakes)", () => {
    const thaiAllowed = /^emotions\./; // keys are the stored Thai values
    for (const { code } of LANGS.filter((l) => l.code !== "th")) {
      for (const k of keys.filter((k) => !thaiAllowed.test(k))) {
        // Thai letters only — the baht sign ฿ (U+0E3F) is allowed in every language
        expect(/[ก-ฺเ-๛]/.test(get(MESSAGES[code], k) as string), `${code}.${k} still contains Thai`).toBe(false);
      }
    }
  });
});

describe("first-visit language", () => {
  it("uses Thai inside Thailand and English everywhere else", () => {
    expect(pickLang({ country: "TH", acceptLanguage: "en-US" })).toBe("th");
    expect(pickLang({ country: "th" })).toBe("th");
    expect(pickLang({ country: "US", acceptLanguage: "th-TH" })).toBe("en");
    expect(pickLang({ country: "JP", acceptLanguage: "ja" })).toBe("en");
  });
  it("falls back to the browser language when the country is unknown", () => {
    expect(pickLang({ acceptLanguage: "th-TH,th;q=0.9,en;q=0.8" })).toBe("th");
    expect(pickLang({ country: "XX", acceptLanguage: "th" })).toBe("th");
    expect(pickLang({ acceptLanguage: "fr-FR,th;q=0.5" })).toBe("en");
    expect(pickLang({})).toBe("en");
  });
  it("reads the country from host headers", () => {
    const h = (o: Record<string, string>) => (n: string) => o[n] ?? null;
    expect(countryFromHeaders(h({ "x-country": "TH" }))).toBe("TH");
    const geo = Buffer.from(JSON.stringify({ country: { code: "SG", name: "Singapore" } })).toString("base64");
    expect(countryFromHeaders(h({ "x-nf-geo": geo }))).toBe("SG");
    expect(countryFromHeaders(h({ "x-nf-geo": "not-base64-json" }))).toBe(null);
    expect(countryFromHeaders(h({}))).toBe(null);
  });
});

describe("fill and formatters", () => {
  it("fills placeholders and leaves unknown ones", () => {
    expect(fill("{a} and {b}", { a: 1 })).toBe("1 and {b}");
  });
  it("uses the Buddhist year for Thai and local words for holding time", () => {
    expect(formatters("th-TH", th).monthYear(new Date(2026, 10, 5))).toContain("2569");
    expect(formatters("en-US", MESSAGES.en).holding(90)).toBe("1.5 h");
    expect(formatters("en-US", MESSAGES.en).holding(0)).toBe("Same day");
  });
  it("shows date-only trades as the US trading day", () => {
    const f = formatters("en-US", MESSAGES.en);
    expect(f.tradeTime("2026-11-12T15:00:00.000Z")).toBe("Nov 12, 2026"); // 10:00 New York
    expect(f.tradeTime("2026-11-12T15:30:00.000Z")).toMatch(/Nov 12, 2026/);
  });
});
