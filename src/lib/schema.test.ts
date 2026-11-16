import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("schema.sql contains every migration, in order", () => {
  const dir = "supabase/migrations";
  const all = readFileSync("supabase/schema.sql", "utf8");
  let at = 0;
  for (const f of readdirSync(dir).sort()) {
    const body = readFileSync(`${dir}/${f}`, "utf8").trim();
    const i = all.indexOf(body, at);
    expect(i, `${f} missing or out of order in schema.sql`).toBeGreaterThanOrEqual(0);
    at = i + body.length;
  }
});
