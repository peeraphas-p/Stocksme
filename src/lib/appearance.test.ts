import { describe, expect, it } from "vitest";
import { APPEARANCE_BOOT_SCRIPT, normalizeAppearance } from "./appearance";

/** รันสคริปต์ก่อนแสดงผลกับ document/localStorage จำลอง แล้วดูว่าตั้งค่าอะไรไว้ */
function boot(stored: unknown) {
  const attrs: Record<string, string> = {};
  const style: Record<string, string> = {};
  const documentElement = {
    setAttribute: (k: string, v: string) => (attrs[k] = v),
    style: { setProperty: (k: string, v: string) => (style[k] = String(v)) },
  };
  const localStorage = { getItem: () => (stored === undefined ? null : JSON.stringify(stored)) };
  new Function("document", "localStorage", APPEARANCE_BOOT_SCRIPT)({ documentElement }, localStorage);
  return { attrs, style };
}

describe("appearance boot script", () => {
  it("defaults first-time visitors to the graph-paper background", () => {
    expect(boot(undefined).attrs["data-bg"]).toBe("ledger");
  });
  it("moves settings saved by an older version to the new default once", () => {
    expect(boot({ background: "room", blur: 10 }).attrs["data-bg"]).toBe("ledger");
    expect(boot({ background: "room", blur: 10 }).style["--glass-blur"]).toBe("10px");
  });
  it("keeps a background chosen in the current version", () => {
    expect(boot({ v: 3, background: "room" }).attrs["data-bg"]).toBe("room");
    expect(boot({ v: 3, background: "stars" }).attrs["data-bg"]).toBe("stars");
    expect(boot({ v: 2, background: "stars" }).attrs["data-bg"]).toBe("ledger");
    const plain = boot({ v: 3, background: "plain", theme: "light" });
    expect(plain.attrs).toMatchObject({ "data-bg": "plain", "data-theme": "light" });
    expect(plain.style["--room-image"]).toBe("none");
  });
  it("survives broken storage", () => {
    const attrs: Record<string, string> = {};
    new Function("document", "localStorage", APPEARANCE_BOOT_SCRIPT)(
      { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v), style: { setProperty() {} } } },
      { getItem: () => "{not json" },
    );
    expect(attrs["data-bg"]).toBe("ledger");
  });
});

describe("normalizeAppearance", () => {
  it("accepts every background and defaults to graph paper", () => {
    expect(normalizeAppearance({ background: "room" }).background).toBe("room");
    expect(normalizeAppearance({ background: "plain" }).background).toBe("plain");
    expect(normalizeAppearance({ background: "stars" }).background).toBe("stars");
    expect(normalizeAppearance({}).background).toBe("ledger");
  });
});
