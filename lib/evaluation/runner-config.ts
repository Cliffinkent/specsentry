export type EvaluationRunnerConfig = {
  mock: boolean;
  caseIds: string[];
  port: number;
  help: boolean;
};

export function assertEvaluationConfiguration(config: Pick<EvaluationRunnerConfig, "mock">, env: Record<string, string | undefined> = process.env) {
  if (!config.mock && !env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for the live ten-case evaluation. Use --mock only when an explicit mocked run is intended.");
  }
}

export function parseEvaluationRunnerArgs(args: string[]): EvaluationRunnerConfig {
  const caseIds: string[] = [];
  let mock = false;
  let port = Number.parseInt(process.env.EVALUATION_PORT || "3127", 10);
  let help = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--mock") mock = true;
    else if (argument === "--help" || argument === "-h") help = true;
    else if (argument === "--case") {
      const value = args[index + 1];
      if (!value) throw new Error("--case requires a case ID.");
      caseIds.push(...value.split(",").filter(Boolean));
      index += 1;
    } else if (argument.startsWith("--case=")) caseIds.push(...argument.slice("--case=".length).split(",").filter(Boolean));
    else if (argument === "--port") {
      const value = args[index + 1];
      if (!value) throw new Error("--port requires a number.");
      port = Number.parseInt(value, 10);
      index += 1;
    } else if (argument.startsWith("--port=")) port = Number.parseInt(argument.slice("--port=".length), 10);
    else throw new Error(`Unknown evaluation option: ${argument}`);
  }

  if (!Number.isInteger(port) || port < 1_024 || port > 65_535) throw new Error("Evaluation port must be an integer from 1024 to 65535.");
  return { mock, caseIds: [...new Set(caseIds)], port, help };
}

export const evaluationHelp = `Usage: npm run evaluate [-- --mock] [--case SS-EVAL-01[,SS-EVAL-02]] [--port 3127]

Runs all ten cases with the real OpenAI workflow by default. --mock is the only way to select the deterministic mock provider.`;
