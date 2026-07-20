import path from "node:path";
import { describe, expect, it } from "vitest";
import { managedEvaluationConfig } from "@/lib/evaluation/managed-config";

describe("managed evaluation Next.js configuration", () => {
  it("isolates both generated output and Next.js TypeScript edits from the repository config", () => {
    const workspace = "/workspace/specsentry";
    const runtime = path.join(workspace, "data", "evaluation-runtime-stamp");
    const config = managedEvaluationConfig(workspace, runtime);
    expect(config.distDirectory).toBe(".next-evaluation-runtime-stamp");
    expect(config.tsconfigPath).toBe("data/evaluation-runtime-stamp/tsconfig.evaluation.json");
    expect(config.tsconfigAbsolutePath).not.toBe(path.join(workspace, "tsconfig.json"));
    expect(config.tsconfig.extends).toBe("../../tsconfig.json");
  });
});
