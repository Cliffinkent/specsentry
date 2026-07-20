import { MockAIProvider } from "@/lib/ai/mock-provider";
import { OpenAIProvider } from "@/lib/ai/openai-provider";
import type { AIProvider, EvaluationPackage } from "@/lib/ai/types";
import { evaluationSchema, testPlanSchema, type Evaluation, type NewTestInput, type TestPlan, type TokenUsage } from "@/lib/schemas";

export class ModelOutputError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "ModelOutputError";
  }
}

export function getAIProvider(): AIProvider {
  return process.env.OPENAI_MOCK === "true" ? new MockAIProvider() : new OpenAIProvider();
}

export const zeroTokenUsage: TokenUsage = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

export function addTokenUsage(left: TokenUsage, right: TokenUsage): TokenUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
  };
}

export async function generatePlanWithUsage(input: NewTestInput, provider: AIProvider = getAIProvider()): Promise<{ plan: TestPlan; usage: TokenUsage }> {
  let usage = zeroTokenUsage;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let result;
    try {
      result = await provider.plan(input, attempt);
      usage = addTokenUsage(usage, result.usage);
    } catch (error) {
      throw new Error("The planning service is unavailable.", { cause: error });
    }
    const parsed = testPlanSchema.safeParse(result.output);
    if (parsed.success) return { plan: parsed.data, usage };
    lastError = parsed.error;
  }
  throw new ModelOutputError("The planner returned invalid structured output after one controlled retry.", lastError);
}

export async function generatePlan(input: NewTestInput, provider: AIProvider = getAIProvider()): Promise<TestPlan> {
  return (await generatePlanWithUsage(input, provider)).plan;
}

function evidenceIsRecorded(evaluation: Evaluation, input: EvaluationPackage) {
  if (!evaluation.finding) return true;
  const recorded = new Set(input.screenshots.map(({ reference }) => reference));
  return evaluation.finding.evidenceReferences.every((reference) => recorded.has(reference));
}

export async function evaluateEvidenceWithUsage(input: EvaluationPackage, provider: AIProvider = getAIProvider()): Promise<{ evaluation: Evaluation; usage: TokenUsage }> {
  let usage = zeroTokenUsage;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let result;
    try {
      result = await provider.evaluate(input, attempt);
      usage = addTokenUsage(usage, result.usage);
    } catch (error) {
      throw new Error("The evaluation service is unavailable.", { cause: error });
    }
    const parsed = evaluationSchema.safeParse(result.output);
    if (parsed.success && evidenceIsRecorded(parsed.data, input)) return { evaluation: parsed.data, usage };
    lastError = parsed.success ? new Error("The evaluator referenced evidence absent from the run.") : parsed.error;
  }
  throw new ModelOutputError("The evaluator returned invalid or unsupported evidence after one controlled retry.", lastError);
}

export async function evaluateEvidence(input: EvaluationPackage, provider: AIProvider = getAIProvider()): Promise<Evaluation> {
  return (await evaluateEvidenceWithUsage(input, provider)).evaluation;
}
