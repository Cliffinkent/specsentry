import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { restoreManagedFile, snapshotManagedFile } from "@/lib/evaluation/managed-file";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

describe("managed generated-file restoration", () => {
  it("restores a repository file after a managed process rewrites it", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "specsentry-managed-file-"));
    temporaryDirectories.push(directory);
    const file = path.join(directory, "next-env.d.ts");
    await fs.writeFile(file, "original\n");
    const snapshot = await snapshotManagedFile(file);
    await fs.writeFile(file, "generated change\n");
    await restoreManagedFile(snapshot);
    expect(await fs.readFile(file, "utf8")).toBe("original\n");
  });

  it("removes a generated file that did not exist before the managed process", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "specsentry-managed-file-"));
    temporaryDirectories.push(directory);
    const file = path.join(directory, "next-env.d.ts");
    const snapshot = await snapshotManagedFile(file);
    await fs.writeFile(file, "generated\n");
    await restoreManagedFile(snapshot);
    await expect(fs.stat(file)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
