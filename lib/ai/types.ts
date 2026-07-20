import type { ActionRecord, NewTestInput, PlanStep, TestPlan, TokenUsage } from "@/lib/schemas";

export type AIResult<T> = {
  output: T;
  usage: TokenUsage;
};

export type ComputerAction =
  | { type: "click"; x: number; y: number; button?: "left" | "right" | "middle" }
  | { type: "double_click"; x: number; y: number }
  | { type: "drag"; path: Array<{ x: number; y: number }> }
  | { type: "keypress"; keys: string[] }
  | { type: "move"; x: number; y: number }
  | { type: "screenshot" }
  | { type: "scroll"; x: number; y: number; scrollX: number; scrollY: number }
  | { type: "type"; text: string }
  | { type: "wait" };

export type ComputerTurnRequest = {
  step: PlanStep;
  approvedHostname: string;
  screenshotDataUrl: string;
  previousResponseId?: string;
  previousCallId?: string;
};

export type ComputerTurn = {
  responseId: string;
  callId: string | null;
  actions: ComputerAction[];
  observation: string;
  pendingSafetyChecks: Array<{ id: string; code?: string | null; message?: string | null }>;
  usage: TokenUsage;
};

export type EvaluationPackage = {
  input: NewTestInput;
  approvedPlan: TestPlan;
  actions: ActionRecord[];
  observations: string[];
  errors: string[];
  screenshots: Array<{ reference: string; dataUrl: string }>;
};

export interface AIProvider {
  plan(input: NewTestInput, attempt: number): Promise<AIResult<unknown>>;
  computer(request: ComputerTurnRequest): Promise<ComputerTurn>;
  evaluate(input: EvaluationPackage, attempt: number): Promise<AIResult<unknown>>;
}
