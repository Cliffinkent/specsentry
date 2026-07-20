import fs from "node:fs/promises";
import path from "node:path";
import { dataDirectory, screenshotsDirectory } from "@/lib/storage";

async function verifyWritable(directory: string) {
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const probe = path.join(directory, `.specsentry-health-${crypto.randomUUID()}`);
  try {
    await fs.writeFile(probe, "ok", { flag: "wx", mode: 0o600 });
  } finally {
    await fs.rm(probe, { force: true }).catch(() => undefined);
  }
}

export async function checkStorageHealth() {
  await verifyWritable(dataDirectory());
  await verifyWritable(screenshotsDirectory());
}
