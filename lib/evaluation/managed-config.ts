import path from "node:path";

export function managedEvaluationConfig(workspaceRoot: string, runtimeDataDirectory: string) {
  const tsconfigAbsolutePath = path.join(runtimeDataDirectory, "tsconfig.evaluation.json");
  const tsconfigPath = path.relative(workspaceRoot, tsconfigAbsolutePath);
  const extendsPath = path.relative(path.dirname(tsconfigAbsolutePath), path.join(workspaceRoot, "tsconfig.json"));
  return {
    distDirectory: `.next-${path.basename(runtimeDataDirectory)}`,
    tsconfigAbsolutePath,
    tsconfigPath,
    tsconfig: {
      extends: extendsPath.startsWith(".") ? extendsPath : `./${extendsPath}`,
      compilerOptions: { incremental: true },
    },
  };
}
