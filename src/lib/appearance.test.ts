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
  it("defaults first-time visitors to the stars background", () => {
    expect(boot(undefined).attrs["data-bg"]).toBe("stars");
  });
  it("moves settings saved before v2 to stars once", () => {
    expect(boot({ background: "room", blur: 10 }).attrs["data-bg"]).toBe("stars");
    expect(boot({ background: "room", blur: 10 }).style["--glass-blur"]).toBe("10px");
  });
  it("keeps a background chosen after v2", () => {
    expect(boot({ v: 2, background: "room" }).attrs["data-bg"]).toBe("room");
    const plain = boot({ v: 2, background: "plain", theme: "light" });
    expect(plain.attrs).toMatchObject({ "data-bg": "plain", "data-theme": "light" });
    expect(plain.style["--room-image"]).toBe("none");
  });
  it("survives broken storage", () => {
    const attrs: Record<string, string> = {};
    new Function("document", "localStorage", APPEARANCE_BOOT_SCRIPT)(
      { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v), style: { setProperty() {} } } },
      { getItem: () => "{not json" },
    );
    expect(attrs["data-bg"]).toBe("stars");
  });
});

describe("normalizeAppearance", () => {
  it("accepts the three backgrounds and defaults to stars", () => {
    expect(normalizeAppearance({ background: "room" }).background).toBe("room");
    expect(normalizeAppearance({ background: "plain" }).background).toBe("plain");
    expect(normalizeAppearance({}).background).toBe("stars");
  });
});
