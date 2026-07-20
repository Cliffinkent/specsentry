import fs from "node:fs/promises";

export type ManagedFileSnapshot = {
  path: string;
  existed: boolean;
  content: Buffer | null;
  mode: number | null;
};

export async function snapshotManagedFile(filePath: string): Promise<ManagedFileSnapshot> {
  try {
    const [content, metadata] = await Promise.all([fs.readFile(filePath), fs.stat(filePath)]);
    return { path: filePath, existed: true, content, mode: metadata.mode & 0o777 };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { path: filePath, existed: false, content: null, mode: null };
    }
    throw error;
  }
}

export async function restoreManagedFile(snapshot: ManagedFileSnapshot) {
  if (!snapshot.existed) {
    await fs.rm(snapshot.path, { force: true });
    return;
  }
  await fs.writeFile(snapshot.path, snapshot.content!, { mode: snapshot.mode || 0o644 });
}
