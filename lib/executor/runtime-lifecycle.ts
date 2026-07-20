import type { RunRepository } from "@/lib/repository";

type ActiveRun = {
  runId: string;
  repository: RunRepository;
  closeResources: () => Promise<void>;
};

type LifecycleState = {
  activeRuns: Map<string, ActiveRun>;
  handlersInstalled: boolean;
  terminationRequested: boolean;
};

const lifecycleGlobal = globalThis as typeof globalThis & { specsentryLifecycle?: LifecycleState };
const state = lifecycleGlobal.specsentryLifecycle ||= {
  activeRuns: new Map(),
  handlersInstalled: false,
  terminationRequested: false,
};

function markInterrupted(activeRun: ActiveRun) {
  try {
    const run = activeRun.repository.getRun(activeRun.runId);
    if (!run || ["passed", "failed", "blocked", "inconclusive", "cancelled", "timed_out", "error"].includes(run.status)) return;
    activeRun.repository.appendError(activeRun.runId, "The run was interrupted by deployment shutdown. Partial evidence was retained.");
    activeRun.repository.setStatus(activeRun.runId, "error", true);
  } catch {
    console.error("[SpecSentry:shutdown] An active run could not be marked as interrupted.");
  }
}

function handleTermination() {
  if (state.terminationRequested) return;
  state.terminationRequested = true;
  const activeRuns = [...state.activeRuns.values()];
  for (const activeRun of activeRuns) markInterrupted(activeRun);
  void Promise.allSettled(activeRuns.map(({ closeResources }) => closeResources()));
}

function installTerminationHandlers() {
  if (state.handlersInstalled || process.env.NODE_ENV !== "production") return;
  state.handlersInstalled = true;
  process.once("SIGTERM", handleTermination);
  process.once("SIGINT", handleTermination);
}

export function registerActiveRun(runId: string, repository: RunRepository, closeResources: () => Promise<void>) {
  installTerminationHandlers();
  state.activeRuns.set(runId, { runId, repository, closeResources });
  return () => state.activeRuns.delete(runId);
}

export function hasActiveRuns() {
  return state.activeRuns.size > 0;
}

export function terminationWasRequested() {
  return state.terminationRequested;
}
