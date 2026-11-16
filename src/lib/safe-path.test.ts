import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-path";

describe("safeNextPath", () => {
  it("keeps in-site paths", () => {
    expect(safeNextPath("/reset-password")).toBe("/reset-password");
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/trades")).toBe("/trades");
  });
  it("rejects anything that could leave the site", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "/x?y=//evil.com", "/%2F%2Fevil.com", "javascript:alert(1)"]) {
      expect(safeNextPath(bad), bad).toBe("/");
    }
  });
  it("defaults to home", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });
});
