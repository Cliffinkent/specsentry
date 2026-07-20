export const DEFAULT_RUN_TIMEOUT_MS = 5 * 60 * 1_000;
export const DEFAULT_ACTION_LIMIT = 40;
export const MAX_ACTION_RETRIES = 2;

export class RunLimitError extends Error {
  constructor(
    message: string,
    readonly reason: "timeout" | "action_limit" | "retry_limit",
  ) {
    super(message);
    this.name = "RunLimitError";
  }
}

export class RunBudget {
  private actionCount = 0;

  constructor(
    private readonly startedAtMs = Date.now(),
    private readonly timeoutMs = DEFAULT_RUN_TIMEOUT_MS,
    private readonly actionLimit = DEFAULT_ACTION_LIMIT,
  ) {}

  assertTime(now = Date.now()) {
    if (now - this.startedAtMs >= this.timeoutMs) {
      throw new RunLimitError("The run reached its five-minute time limit.", "timeout");
    }
  }

  consumeAction(now = Date.now()) {
    this.assertTime(now);
    if (this.actionCount >= this.actionLimit) {
      throw new RunLimitError("The run reached its 40-action limit.", "action_limit");
    }
    this.actionCount += 1;
    return this.actionCount;
  }

  assertRetry(retryCount: number) {
    if (retryCount > MAX_ACTION_RETRIES) {
      throw new RunLimitError("An action exceeded the two-retry limit.", "retry_limit");
    }
  }

  get actionsUsed() {
    return this.actionCount;
  }
}
