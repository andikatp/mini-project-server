import { describe, expect, it } from "bun:test";
import { APP_CONFIG } from "../src/configs/app.config.ts";
import { logger } from "../src/libs/logger.ts";

describe("Smoke test", () => {
  it("verifies environment is working", () => {
    expect(1 + 1).toBe(2);
  });

  it("verifies application config and versioning", () => {
    expect(APP_CONFIG.version).toBeDefined();
    expect(APP_CONFIG.port).toBeNumber();
    expect(typeof logger.info).toBe("function");
  });
});

