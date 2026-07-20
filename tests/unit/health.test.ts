import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkStorageHealth } from "@/lib/health";

let temporaryDirectory: string | null = null;

afterEach(async () => {
  vi.unstubAllEnvs();
  if (temporaryDirectory) await fs.rm(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = null;
});

describe("storage health", () => {
  it("confirms the SQLite parent and screenshot directories are writable without creating a database", async () => {
    temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "specsentry-health-"));
    vi.stubEnv("SPECSENTRY_DATA_DIR", temporaryDirectory);
    await expect(checkStorageHealth()).resolves.toBeUndefined();
    await expect(fs.stat(path.join(temporaryDirectory, "screenshots"))).resolves.toMatchObject({});
    await expect(fs.stat(path.join(temporaryDirectory, "specsentry.sqlite"))).rejects.toThrow();
  });
});
