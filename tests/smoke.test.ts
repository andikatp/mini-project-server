import { describe, expect, it } from "bun:test";

describe("Smoke test", () => {
  it("verifies environment is working", () => {
    expect(1 + 1).toBe(2);
  });
});
