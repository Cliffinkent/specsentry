import { describe, expect, it } from "vitest";
import { RunBudget, RunLimitError } from "@/lib/executor/limits";

describe("executor limits", () => {
  it("stops at the configured action limit", () => {
    const budget = new RunBudget(0, 10_000, 2);
    expect(budget.consumeAction(1)).toBe(1);
    expect(budget.consumeAction(2)).toBe(2);
    expect(() => budget.consumeAction(3)).toThrowError(new RunLimitError("The run reached its 40-action limit.", "action_limit"));
  });

  it("stops at the configured timeout", () => {
    const budget = new RunBudget(1_000, 5_000, 40);
    expect(() => budget.assertTime(6_000)).toThrow(/five-minute time limit/);
  });

  it("allows no more than two action retries", () => {
    const budget = new RunBudget();
    expect(() => budget.assertRetry(2)).not.toThrow();
    expect(() => budget.assertRetry(3)).toThrow(/two-retry limit/);
  });
});
