import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { LOGO_SVG } from "./brand";

it("in-app logo matches the favicon file", () => {
  expect(LOGO_SVG).toBe(readFileSync("src/app/icon.svg", "utf8").trim());
});
