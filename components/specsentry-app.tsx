"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RunReport } from "@/lib/report";
import type { ActionRecord, DemoMode, FindingReviewContent, NewTestInput, TestPlan } from "@/lib/schemas";

type Phase = "input" | "plan" | "running" | "report";
type LiveEvent = { type: string; payload: unknown; createdAt: string };
type IssuePreview = { title: string; body: string; repository: string; previewToken: string; exportDisabled: boolean };

const emptyInput: NewTestInput = {
  stagingUrl: "",
  allowedHostname: "",
  userStory: "",
  acceptanceCriteria: "",
  startingInstructions: "",
};

const terminalStatuses = new Set(["passed", "failed", "blocked", "inconclusive", "cancelled", "timed_out", "error"]);

function evidenceUrl(reference: string) {
  const [runId, file] = reference.split("/");
  return `/api/evidence/${encodeURIComponent(runId)}/${encodeURIComponent(file)}`;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function Header({ phase }: { phase: Phase }) {
  const stages: Array<[Phase, string]> = [
    ["input", "Define"],
    ["plan", "Approve"],
    ["running", "Run"],
    ["report", "Report"],
  ];
  const current = stages.findIndex(([value]) => value === phase);
  return (
    <header className="border-b border-[var(--line)] bg-[rgb(255_253_247/88%)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div>
          <p className="text-xl font-black tracking-[-0.04em]">SPEC / SENTRY</p>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--teal)]">Evidence-backed acceptance testing</p>
        </div>
        <ol aria-label="Workflow progress" className="flex items-center gap-1 text-xs font-bold uppercase tracking-[0.12em]">
          {stages.map(([value, label], index) => (
            <li key={value} aria-current={value === phase ? "step" : undefined} className={`px-3 py-2 ${index <= current ? "bg-[var(--ink)] text-white" : "border border-[var(--line)] text-[var(--muted)]"}`}>
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      </div>
    </header>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal leading-5 text-[var(--muted)]">{hint}</span>}
    </label>
  );
}

function NewTestForm({
  input,
  setInput,
  buildMode,
  setBuildMode,
  onSubmit,
  busy,
  publicDemo,
}: {
  input: NewTestInput;
  setInput: (value: NewTestInput) => void;
  buildMode: DemoMode;
  setBuildMode: (value: DemoMode) => void;
  onSubmit: () => void;
  busy: boolean;
  publicDemo: boolean;
}) {
  const loadDemo = (mode: DemoMode = buildMode) => {
    const origin = window.location.origin;
    setInput({
      stagingUrl: `${origin}/demo/shop?mode=${mode}`,
      allowedHostname: window.location.hostname,
      userStory: "As a guest shopper, I need to see delivery charges before entering payment details so that I understand the full cost before buying.",
      acceptanceCriteria: "Given that I have an item in my basket, when I reach the order review page, then the delivery charge and total cost must be visible before I continue to payment.",
      startingInstructions: "Use the Alpine Trail Backpack and deterministic demo delivery details. Stop on order review; never continue towards payment.",
    });
  };

  const loadBuildWeekDemo = () => {
    setBuildMode("defective");
    loadDemo("defective");
  };

  return (
    <section className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
      <div className="pt-4 lg:sticky lg:top-8 lg:self-start">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--teal)]">New test</p>
        <h1 className="mt-4 text-5xl font-black leading-[0.96] tracking-[-0.055em] sm:text-6xl">Start with the promise, not the clicks.</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">Give SpecSentry one criterion and one approved host. GPT-5.6 proposes the journey; you retain the edit and approval gate.</p>
        <div className="mt-8 border-l-4 border-[var(--signal)] pl-5 text-sm leading-6">
          <strong>Security boundary</strong>
          <p className="text-[var(--muted)]">The runner rejects other hosts, private networks, downloads, pop-ups and file URLs.</p>
        </div>
      </div>

      <div className="border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[8px_8px_0_var(--ink)] sm:p-8">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <Field label="Demo fixture build">
            <select value={buildMode} onChange={(event) => setBuildMode(event.target.value as DemoMode)} className="min-w-52 border border-[var(--line)] bg-white px-4 py-3 font-normal">
              <option value="defective">Defective build</option>
              <option value="passing">Passing build</option>
            </select>
          </Field>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => loadDemo()} className="border border-[var(--ink)] px-5 py-3 text-sm font-black uppercase tracking-[0.1em] hover:bg-[var(--signal)]">Load demo</button>
            <button type="button" onClick={loadBuildWeekDemo} className="bg-[var(--signal)] px-5 py-3 text-sm font-black uppercase tracking-[0.1em] shadow-[3px_3px_0_var(--ink)]">Load Build Week demo</button>
          </div>
        </div>

        <div className="mt-7 grid gap-6">
          <Field label="Staging URL" hint="HTTP or HTTPS only. The URL hostname must exactly match the approved hostname.">
            <input type="url" required value={input.stagingUrl} onChange={(event) => setInput({ ...input, stagingUrl: event.target.value })} placeholder="http://127.0.0.1:3100/demo/shop?mode=defective" className="border border-[var(--line)] bg-white px-4 py-3 font-normal" />
          </Field>
          <Field label="Allowed hostname">
            <input required value={input.allowedHostname} onChange={(event) => setInput({ ...input, allowedHostname: event.target.value })} placeholder="127.0.0.1" className="border border-[var(--line)] bg-white px-4 py-3 font-normal" />
          </Field>
          {publicDemo && (
            <aside aria-label="Public demo restriction" className="border-l-4 border-[var(--signal)] bg-[rgb(211_255_98/18%)] px-4 py-3 text-sm leading-6">
              <p>Public demo mode is restricted to Sentry Shop. Deploy your own instance to test an approved staging domain.</p>
            </aside>
          )}
          <Field label="User story">
            <textarea required rows={4} value={input.userStory} onChange={(event) => setInput({ ...input, userStory: event.target.value })} className="resize-y border border-[var(--line)] bg-white px-4 py-3 font-normal leading-6" />
          </Field>
          <Field label="Acceptance criteria">
            <textarea required rows={5} value={input.acceptanceCriteria} onChange={(event) => setInput({ ...input, acceptanceCriteria: event.target.value })} className="resize-y border border-[var(--line)] bg-white px-4 py-3 font-normal leading-6" />
          </Field>
          <Field label="Starting instructions (optional)">
            <textarea rows={3} value={input.startingInstructions} onChange={(event) => setInput({ ...input, startingInstructions: event.target.value })} className="resize-y border border-[var(--line)] bg-white px-4 py-3 font-normal leading-6" />
          </Field>
          <button type="button" disabled={busy} onClick={onSubmit} className="bg-[var(--ink)] px-6 py-4 text-left font-black uppercase tracking-[0.12em] text-white disabled:cursor-wait disabled:opacity-55">
            {busy ? "Generating structured plan…" : "Generate test plan"}<span className="float-right">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function PlanEditor({ plan, setPlan, approve, busy }: { plan: TestPlan; setPlan: (plan: TestPlan) => void; approve: () => void; busy: boolean }) {
  const updateStep = (index: number, values: Partial<TestPlan["steps"][number]>) => {
    setPlan({ ...plan, steps: plan.steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...values } : step) });
  };

  return (
    <section>
      <div className="grid gap-8 border-b border-[var(--line)] pb-8 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--teal)]">Planner output</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-0.05em]">Review every step.</h1>
          <p className="mt-5 leading-7 text-[var(--muted)]">This is a separate Structured Output from the planner. Edit it here; execution is locked until you approve.</p>
        </div>
        <div className="grid gap-5 border border-[var(--line)] bg-[var(--surface)] p-6">
          <Field label="Objective"><textarea rows={3} value={plan.objective} onChange={(event) => setPlan({ ...plan, objective: event.target.value })} className="border border-[var(--line)] bg-white px-4 py-3 font-normal" /></Field>
          <Field label="Preconditions (one per line)"><textarea rows={4} value={plan.preconditions.join("\n")} onChange={(event) => setPlan({ ...plan, preconditions: event.target.value.split("\n").filter(Boolean) })} className="border border-[var(--line)] bg-white px-4 py-3 font-normal" /></Field>
        </div>
      </div>

      <ol className="mt-8 grid gap-5">
        {plan.steps.map((step, index) => (
          <li key={`${step.id}-${index}`} className="grid gap-5 border border-[var(--line)] bg-[var(--surface)] p-5 lg:grid-cols-[90px_1fr] lg:p-6">
            <div>
              <span className="text-4xl font-black text-[var(--teal)]">{String(index + 1).padStart(2, "0")}</span>
              <label className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <input type="checkbox" checked={step.checkpoint} onChange={(event) => updateStep(index, { checkpoint: event.target.checked })} /> Checkpoint
              </label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Step ID"><input value={step.id} onChange={(event) => updateStep(index, { id: event.target.value })} className="border border-[var(--line)] bg-white px-3 py-2 font-mono text-xs font-normal" /></Field>
              <Field label="Retry limit"><select value={step.retryLimit} onChange={(event) => updateStep(index, { retryLimit: Number(event.target.value) })} className="border border-[var(--line)] bg-white px-3 py-2 font-normal"><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select></Field>
              <Field label="Instruction"><textarea rows={3} value={step.instruction} onChange={(event) => updateStep(index, { instruction: event.target.value })} className="border border-[var(--line)] bg-white px-3 py-2 font-normal" /></Field>
              <Field label="Expected visible result"><textarea rows={3} value={step.expectedVisibleResult} onChange={(event) => updateStep(index, { expectedVisibleResult: event.target.value })} className="border border-[var(--line)] bg-white px-3 py-2 font-normal" /></Field>
              <Field label="Evidence requirement"><textarea rows={3} value={step.evidenceRequirement} onChange={(event) => updateStep(index, { evidenceRequirement: event.target.value })} className="border border-[var(--line)] bg-white px-3 py-2 font-normal" /></Field>
              <Field label="Stop rule"><textarea rows={3} value={step.stopRule} onChange={(event) => updateStep(index, { stopRule: event.target.value })} className="border border-[var(--line)] bg-white px-3 py-2 font-normal" /></Field>
            </div>
          </li>
        ))}
      </ol>
      <div className="sticky bottom-4 mt-8 flex justify-end">
        <button type="button" disabled={busy} onClick={approve} className="bg-[var(--signal)] px-7 py-4 font-black uppercase tracking-[0.12em] shadow-[6px_6px_0_var(--ink)] disabled:cursor-wait disabled:opacity-60">
          {busy ? "Starting isolated browser…" : "Approve plan & start run"}
        </button>
      </div>
    </section>
  );
}

function LiveRun({ status, currentStep, actions, latestScreenshot, cancel }: { status: string; currentStep: string; actions: ActionRecord[]; latestScreenshot: string | null; cancel: () => void }) {
  return (
    <section>
      <div className="flex flex-col gap-5 border-b border-[var(--line)] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--teal)]">Live isolated run</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-0.05em]">{currentStep || "Launching Chromium…"}</h1>
          <p className="mt-4 text-sm uppercase tracking-[0.14em] text-[var(--muted)]">Status: <strong className="text-[var(--ink)]">{statusLabel(status)}</strong> · {actions.length}/40 recorded actions</p>
        </div>
        <button type="button" onClick={cancel} className="border border-[#9a3f23] px-5 py-3 text-sm font-black uppercase tracking-[0.1em] text-[#9a3f23]">Stop run</button>
      </div>

      <div className="mt-8 grid gap-7 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="overflow-hidden border border-[var(--line)] bg-[#1c211e] p-3 shadow-[8px_8px_0_var(--ink)]">
          {latestScreenshot ? (
            <Image src={evidenceUrl(latestScreenshot)} alt="Latest recorded browser screenshot" width={1440} height={900} unoptimized className="h-auto w-full" />
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center text-sm font-bold uppercase tracking-[0.15em] text-white/60">Awaiting first screenshot</div>
          )}
        </div>
        <aside className="max-h-[650px] overflow-auto border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.16em]">Recorded action feed</h2>
          <ol className="mt-4 grid gap-4">
            {actions.map((action) => (
              <li key={action.id} className="border-t border-[var(--line)] pt-4 text-sm">
                <p className="font-mono text-xs text-[var(--teal)]">#{action.sequence + 1} · {action.stepId}</p>
                <p className="mt-1 leading-6">{action.description}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}

function FindingReviewPanel({ report, refresh }: { report: RunReport; refresh: () => Promise<void> }) {
  const review = report.findingReview;
  const [current, setCurrent] = useState<FindingReviewContent | null>(review?.current || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<IssuePreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!review || !current) return null;
  const dirty = JSON.stringify(current) !== JSON.stringify(review.current);
  const editable = review.status === "draft";

  const request = async (pathname: string, action: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(pathname, {
        method: pathname.endsWith("/review") ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "X-SpecSentry-Action": action },
        body: JSON.stringify(body),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "The review action could not be completed.");
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The review action could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const transition = (name: "approve" | "reject" | "reopen") => request(
    `/api/runs/${encodeURIComponent(report.id)}/review/${name}`,
    `review-${name}`,
    {},
  );

  const generatePreview = async () => {
    setBusy(true);
    setError(null);
    setConfirmed(false);
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(report.id)}/github/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-SpecSentry-Action": "github-preview" },
        body: "{}",
      });
      const data = await response.json() as { preview?: IssuePreview; error?: string };
      if (!response.ok || !data.preview) throw new Error(data.error || "The issue preview could not be generated.");
      setPreview(data.preview);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "The issue preview could not be generated.");
    } finally {
      setBusy(false);
    }
  };

  const exportIssue = async () => {
    if (!preview || !confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(report.id)}/github/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-SpecSentry-Action": "github-export-confirmed" },
        body: JSON.stringify({ confirmed: true, previewToken: preview.previewToken }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "The GitHub issue could not be created.");
      setPreview(null);
      setConfirmed(false);
      await refresh();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "The GitHub issue could not be created.");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const update = <Key extends keyof FindingReviewContent>(key: Key, value: FindingReviewContent[Key]) => {
    setCurrent((valueBefore) => valueBefore ? { ...valueBefore, [key]: value } : valueBefore);
    setPreview(null);
    setConfirmed(false);
  };

  return (
    <article className="mt-6 border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">Human finding review</p>
          <h2 className="mt-2 text-3xl font-black">Review state: {review.status}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Editing and approval are persisted. Approval never creates a GitHub issue.</p>
        </div>
        <dl className="text-xs leading-5 text-[var(--muted)]">
          <div><dt className="inline font-black text-[var(--ink)]">Approved: </dt><dd className="inline">{review.approvedAt ? new Date(review.approvedAt).toLocaleString() : "Not yet"}</dd></div>
          <div><dt className="inline font-black text-[var(--ink)]">Exported: </dt><dd className="inline">{review.exportedAt ? new Date(review.exportedAt).toLocaleString() : "Not yet"}</dd></div>
        </dl>
      </div>

      {error ? <div role="alert" className="mt-5 border-l-4 border-[#a34c23] bg-[#fff2ec] p-4 text-sm">{error}</div> : null}
      {review.lastExportError ? <div className="mt-5 border-l-4 border-[#a34c23] bg-[#fff2ec] p-4 text-sm"><strong>Last export attempt:</strong> {review.lastExportError}</div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border border-[var(--line)] p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">AI-generated original · immutable</p>
          <h3 className="mt-3 text-xl font-black">{review.original.title}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{review.original.summary}</p>
          <dl className="mt-5 grid gap-4 text-sm">
            <div><dt className="font-black">Severity</dt><dd>{review.original.severity} · {Math.round(review.generatedConfidence * 100)}% generated confidence</dd></div>
            <div><dt className="font-black">Expected</dt><dd className="mt-1 text-[var(--muted)]">{review.original.expectedResult}</dd></div>
            <div><dt className="font-black">Actual</dt><dd className="mt-1 text-[var(--muted)]">{review.original.actualResult}</dd></div>
          </dl>
        </section>

        <section className="grid gap-4 border border-[var(--line)] p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">Human-edited current finding</p>
          <Field label="Title"><input disabled={!editable} value={current.title} onChange={(event) => update("title", event.target.value)} className="border border-[var(--line)] bg-white px-3 py-2 font-normal disabled:bg-[#eeece5]" /></Field>
          <Field label="Severity"><select disabled={!editable} value={current.severity} onChange={(event) => update("severity", event.target.value as FindingReviewContent["severity"])} className="border border-[var(--line)] bg-white px-3 py-2 font-normal disabled:bg-[#eeece5]"><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field>
          <Field label="Summary"><textarea disabled={!editable} rows={3} value={current.summary} onChange={(event) => update("summary", event.target.value)} className="border border-[var(--line)] bg-white px-3 py-2 font-normal disabled:bg-[#eeece5]" /></Field>
          <Field label="Expected result"><textarea disabled={!editable} rows={3} value={current.expectedResult} onChange={(event) => update("expectedResult", event.target.value)} className="border border-[var(--line)] bg-white px-3 py-2 font-normal disabled:bg-[#eeece5]" /></Field>
          <Field label="Actual result"><textarea disabled={!editable} rows={3} value={current.actualResult} onChange={(event) => update("actualResult", event.target.value)} className="border border-[var(--line)] bg-white px-3 py-2 font-normal disabled:bg-[#eeece5]" /></Field>
          <Field label="Reproduction steps (one per line)"><textarea disabled={!editable} rows={6} value={current.reproductionSteps.join("\n")} onChange={(event) => update("reproductionSteps", event.target.value.split("\n"))} className="border border-[var(--line)] bg-white px-3 py-2 font-normal disabled:bg-[#eeece5]" /></Field>
          <Field label="Suggested next test"><textarea disabled={!editable} rows={3} value={current.suggestedNextTest} onChange={(event) => update("suggestedNextTest", event.target.value)} className="border border-[var(--line)] bg-white px-3 py-2 font-normal disabled:bg-[#eeece5]" /></Field>
        </section>
      </div>

      <section className="mt-6 border border-[var(--line)] p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">Captured evidence · read-only</p>
        <ul className="mt-4 grid gap-2 text-sm">
          {review.evidenceReferences.map((reference) => <li key={reference}><a href={evidenceUrl(reference)} target="_blank" rel="noreferrer" className="break-all font-mono text-[var(--teal)] underline">{reference}</a></li>)}
        </ul>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        {editable ? <button type="button" disabled={busy || !dirty} onClick={() => request(`/api/runs/${encodeURIComponent(report.id)}/review`, "review-save", { current, evidenceReferences: review.evidenceReferences })} className="border border-[var(--ink)] px-5 py-3 text-sm font-black uppercase tracking-wider disabled:opacity-45">Save draft</button> : null}
        {review.status === "draft" ? <button type="button" disabled={busy || dirty} onClick={() => transition("approve")} className="bg-[var(--signal)] px-5 py-3 text-sm font-black uppercase tracking-wider disabled:opacity-45">Approve finding</button> : null}
        {review.status === "draft" || review.status === "approved" ? <button type="button" disabled={busy} onClick={() => transition("reject")} className="border border-[#9a3f23] px-5 py-3 text-sm font-black uppercase tracking-wider text-[#9a3f23] disabled:opacity-45">Reject finding</button> : null}
        {review.status === "rejected" ? <button type="button" disabled={busy} onClick={() => transition("reopen")} className="border border-[var(--ink)] px-5 py-3 text-sm font-black uppercase tracking-wider disabled:opacity-45">Reopen as draft</button> : null}
        {review.status === "draft" && dirty ? <p className="self-center text-xs text-[var(--muted)]">Save the current edits before approval.</p> : null}
      </div>

      {review.status === "approved" ? (
        <section className="mt-7 border-t border-[var(--line)] pt-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">GitHub issue export</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Preview is a read-only server rendering. Creating the issue requires a second, explicit confirmation.</p>
          <button type="button" disabled={busy} onClick={generatePreview} className="mt-4 border border-[var(--ink)] px-5 py-3 text-sm font-black uppercase tracking-wider disabled:opacity-45">Preview exact GitHub issue</button>
          {preview ? (
            <div className="mt-5 grid gap-4">
              <div><strong className="text-sm">Repository</strong><pre className="mt-2 overflow-auto border border-[var(--line)] bg-white p-4 text-xs">{preview.repository}</pre></div>
              <div><strong className="text-sm">Exact title</strong><pre className="mt-2 overflow-auto border border-[var(--line)] bg-white p-4 text-xs">{preview.title}</pre></div>
              <div><strong className="text-sm">Exact Markdown body</strong><pre className="mt-2 max-h-[520px] overflow-auto whitespace-pre-wrap border border-[var(--line)] bg-white p-4 text-xs leading-5">{preview.body}</pre></div>
              {preview.exportDisabled ? (
                <p className="border border-[var(--line)] bg-[#eeece5] p-4 text-sm font-bold">GitHub issue creation is disabled in public demo mode. This exact preview is read-only.</p>
              ) : (
                <>
                  <label className="flex items-start gap-3 border border-[var(--line)] p-4 text-sm font-bold"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" /><span>I reviewed this exact title and Markdown body. Create one issue in {preview.repository}.</span></label>
                  <button type="button" disabled={busy || !confirmed} onClick={exportIssue} className="bg-[var(--ink)] px-5 py-3 text-sm font-black uppercase tracking-wider text-white disabled:opacity-45">Confirm and create one GitHub issue</button>
                </>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {review.status === "exported" && review.githubIssueUrl ? (
        <div className="mt-7 border-t border-[var(--line)] pt-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">Export complete · further exports locked</p>
          <a href={review.githubIssueUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block break-all font-black text-[var(--teal)] underline">{review.githubIssueUrl}</a>
        </div>
      ) : null}
    </article>
  );
}

function Report({ report, startNew, refresh }: { report: RunReport; startNew: () => void; refresh: () => Promise<void> }) {
  const finding = report.aiAssessment?.finding;
  const expected = finding?.expectedResult || report.evidenceTrace.checkpoint?.expectedVisibleResult || "The approved checkpoint result.";
  const actual = finding?.actualResult || report.aiAssessment?.summary || "No final AI assessment is available for this partial report.";
  const mainEvidence = finding?.evidenceReferences[0] || report.recordedEvidence.screenshots.at(-1);

  return (
    <section>
      <div className="flex flex-col gap-5 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--teal)]">Run report · {report.id.slice(0, 8)}</p>
          <h1 className="mt-3 text-6xl font-black uppercase tracking-[-0.055em]">{statusLabel(report.status)}</h1>
          <p className="mt-4 text-sm text-[var(--muted)]">Duration {(report.durationMs / 1_000).toFixed(1)}s · {report.recordedEvidence.actionCount} recorded actions · {report.recordedEvidence.screenshots.length} screenshots</p>
        </div>
        <button type="button" onClick={startNew} className="border border-[var(--ink)] px-5 py-3 text-sm font-black uppercase tracking-[0.1em]">New test</button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="border border-[var(--line)] bg-[var(--surface)] p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">Recorded evidence</p>
          <h2 className="mt-3 text-2xl font-black">What the browser captured</h2>
          {mainEvidence ? (
            <Image src={evidenceUrl(mainEvidence)} alt="Relevant order-review evidence" width={1440} height={900} unoptimized className="mt-6 h-auto w-full border border-[var(--line)]" />
          ) : <p className="mt-6 text-[var(--muted)]">No screenshot was available before the run stopped.</p>}
          <dl className="mt-6 grid gap-5 text-sm">
            <div><dt className="font-black uppercase tracking-wider">Expected visible result</dt><dd className="mt-2 leading-6 text-[var(--muted)]">{expected}</dd></div>
            <div><dt className="font-black uppercase tracking-wider">Recorded browser state</dt><dd className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap border-l-2 border-[var(--line)] pl-4 font-mono text-xs leading-5 text-[var(--muted)]">{report.actions.at(-1)?.observation || "No browser observation was recorded."}</dd></div>
          </dl>
        </article>

        <article className="border border-[var(--line)] bg-[var(--ink)] p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--signal)]">AI assessment</p>
          <h2 className="mt-3 text-2xl font-black">{finding?.title || report.aiAssessment?.summary || "Assessment unavailable"}</h2>
          {finding && <p className="mt-4 inline-flex bg-[var(--signal)] px-3 py-1 text-xs font-black uppercase tracking-wider text-[var(--ink)]">{finding.severity} · {Math.round(finding.confidence * 100)}% confidence</p>}
          <dl className="mt-7 grid gap-6 text-sm">
            <div><dt className="font-black uppercase tracking-wider text-white/60">Expected</dt><dd className="mt-2 leading-6">{expected}</dd></div>
            <div><dt className="font-black uppercase tracking-wider text-white/60">Actual assessment</dt><dd className="mt-2 leading-6">{actual}</dd></div>
            {finding?.lastSuccessfulStep && <div><dt className="font-black uppercase tracking-wider text-white/60">Last successful step</dt><dd className="mt-2">{finding.lastSuccessfulStep}</dd></div>}
            {finding?.suggestedNextTest && <div><dt className="font-black uppercase tracking-wider text-white/60">Suggested next test</dt><dd className="mt-2 leading-6">{finding.suggestedNextTest}</dd></div>}
          </dl>
        </article>
      </div>

      {finding && (
        <article className="mt-6 border border-[var(--line)] bg-[var(--surface)] p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">Reproduction steps</p>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {finding.reproductionSteps.map((step, index) => <li key={`${step}-${index}`} className="flex gap-4 border-t border-[var(--line)] pt-3 text-sm leading-6"><span className="font-mono text-[var(--teal)]">{String(index + 1).padStart(2, "0")}</span><span>{step}</span></li>)}
          </ol>
        </article>
      )}

      <FindingReviewPanel key={`${report.id}-${report.findingReview?.updatedAt || "none"}`} report={report} refresh={refresh} />

      <article className="mt-6 border border-[var(--line)] bg-[var(--surface)] p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">OpenAI token usage · no cost estimate</p>
        <div className="mt-5 overflow-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead><tr><th className="border-b border-[var(--line)] p-3">Phase</th><th className="border-b border-[var(--line)] p-3">Input</th><th className="border-b border-[var(--line)] p-3">Cached input</th><th className="border-b border-[var(--line)] p-3">Output</th><th className="border-b border-[var(--line)] p-3">Total</th></tr></thead>
            <tbody>
              {(Object.entries(report.aiUsage) as Array<[keyof typeof report.aiUsage, (typeof report.aiUsage)[keyof typeof report.aiUsage]]>).map(([phaseName, usage]) => <tr key={phaseName}><th className="border-b border-[var(--line)] p-3 capitalize">{phaseName}</th><td className="border-b border-[var(--line)] p-3">{usage.inputTokens.toLocaleString()}</td><td className="border-b border-[var(--line)] p-3">{usage.cachedInputTokens.toLocaleString()}</td><td className="border-b border-[var(--line)] p-3">{usage.outputTokens.toLocaleString()}</td><td className="border-b border-[var(--line)] p-3 font-black">{usage.totalTokens.toLocaleString()}</td></tr>)}
              <tr><th className="p-3">All phases</th><td className="p-3">{Object.values(report.aiUsage).reduce((sum, usage) => sum + usage.inputTokens, 0).toLocaleString()}</td><td className="p-3">{Object.values(report.aiUsage).reduce((sum, usage) => sum + usage.cachedInputTokens, 0).toLocaleString()}</td><td className="p-3">{Object.values(report.aiUsage).reduce((sum, usage) => sum + usage.outputTokens, 0).toLocaleString()}</td><td className="p-3 font-black">{Object.values(report.aiUsage).reduce((sum, usage) => sum + usage.totalTokens, 0).toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <article className="mt-6 border border-[var(--line)] bg-[var(--surface)] p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">Evidence trace</p>
        <h2 className="mt-3 text-2xl font-black">Criterion → checkpoint → action → screenshot → judgement</h2>
        <div className="mt-6 grid gap-3 text-sm lg:grid-cols-5">
          <div className="border border-[var(--line)] p-4"><strong>Criterion</strong><p className="mt-2 line-clamp-5 text-[var(--muted)]">{report.evidenceTrace.criterion}</p></div>
          <div className="border border-[var(--line)] p-4"><strong>Checkpoint</strong><p className="mt-2 text-[var(--muted)]">{report.evidenceTrace.checkpoint?.stepId || "Partial"}</p></div>
          <div className="border border-[var(--line)] p-4"><strong>Actions</strong><p className="mt-2 text-[var(--muted)]">{report.evidenceTrace.actions.length} linked records</p></div>
          <div className="border border-[var(--line)] p-4"><strong>Screenshots</strong><p className="mt-2 text-[var(--muted)]">{report.evidenceTrace.screenshots.length} linked files</p></div>
          <div className="border border-[var(--line)] bg-[var(--signal)] p-4"><strong>Judgement</strong><p className="mt-2 font-black uppercase">{report.evidenceTrace.judgement || "Pending"}</p></div>
        </div>
      </article>

      <article className="mt-6 border border-[var(--line)] bg-[var(--surface)] p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">Ordered action timeline</p>
        <ol className="mt-5 grid gap-3">
          {report.actions.map((action) => (
            <li key={action.id} className="grid gap-2 border-t border-[var(--line)] pt-4 text-sm sm:grid-cols-[90px_170px_1fr]">
              <span className="font-mono text-[var(--teal)]">#{action.sequence + 1}</span><strong>{action.stepId}</strong><span>{action.description}</span>
            </li>
          ))}
        </ol>
        {report.errors.length > 0 && <div className="mt-6 border-l-4 border-[#a34c23] bg-[#fff2ec] p-4"><strong>Recorded system errors</strong>{report.errors.map((error) => <p key={error} className="mt-2 text-sm">{error}</p>)}</div>}
      </article>

      {report.recordedEvidence.screenshots.length > 1 && (
        <article className="mt-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">Screenshot evidence gallery</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {report.recordedEvidence.screenshots.map((reference) => <Image key={reference} src={evidenceUrl(reference)} alt={`Recorded evidence ${reference}`} width={1440} height={900} unoptimized className="h-auto w-full border border-[var(--line)]" />)}
          </div>
        </article>
      )}
    </section>
  );
}

export function SpecSentryApp({ publicDemo = false }: { publicDemo?: boolean }) {
  const [phase, setPhase] = useState<Phase>("input");
  const [input, setInput] = useState<NewTestInput>(emptyInput);
  const [buildMode, setBuildMode] = useState<DemoMode>("defective");
  const [plan, setPlan] = useState<TestPlan | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState("queued");
  const [currentStep, setCurrentStep] = useState("");
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);
  const [report, setReport] = useState<RunReport | null>(null);
  const [recentRuns, setRecentRuns] = useState<RunReport[]>([]);

  const fetchRecent = useCallback(async () => {
    const response = await fetch("/api/runs", { cache: "no-store" });
    if (response.ok) setRecentRuns(((await response.json()) as { runs: RunReport[] }).runs);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/runs", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ runs: RunReport[] }> : { runs: [] })
      .then(({ runs }) => { if (active) setRecentRuns(runs); });
    return () => { active = false; };
  }, []);

  const fetchReport = useCallback(async (id: string) => {
    const response = await fetch(`/api/runs/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("The run report could not be loaded.");
    const data = (await response.json()) as { report: RunReport };
    setReport(data.report);
    setRunStatus(data.report.status);
    setPhase("report");
    await fetchRecent();
  }, [fetchRecent]);

  useEffect(() => {
    let active = true;
    const linkedRunId = new URLSearchParams(window.location.search).get("run");
    if (linkedRunId) {
      void fetch(`/api/runs/${encodeURIComponent(linkedRunId)}`, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("The linked report could not be loaded.");
          return response.json() as Promise<{ report: RunReport }>;
        })
        .then(({ report: linkedReport }) => {
          if (!active) return;
          setReport(linkedReport);
          setRunStatus(linkedReport.status);
          setPhase("report");
        })
        .catch((reportError) => {
          if (active) setError(reportError instanceof Error ? reportError.message : "The linked report could not be loaded.");
        });
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (phase !== "running" || !runId) return;
    const source = new EventSource(`/api/runs/${encodeURIComponent(runId)}/events`);
    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as LiveEvent;
      const payload = event.payload as Record<string, unknown>;
      if (event.type === "run.step") setCurrentStep(String(payload.instruction || payload.stepId || "Running approved step"));
      if (event.type === "run.action") {
        const action = payload as unknown as ActionRecord;
        setActions((current) => current.some(({ id }) => id === action.id) ? current : [...current, action]);
        if (action.screenshotRef) setLatestScreenshot(action.screenshotRef);
      }
      if (event.type === "run.status") {
        const status = String(payload.status || "running");
        setRunStatus(status);
        if (terminalStatuses.has(status)) {
          source.close();
          void fetchReport(runId).catch((reportError) => setError(reportError instanceof Error ? reportError.message : "The report could not be loaded."));
        }
      }
      if (event.type === "run.error") setError(String(payload.error || "The run recorded an error."));
    };
    source.onerror = () => {
      if (!terminalStatuses.has(runStatus)) setError("The live event connection was interrupted; the persisted report remains available.");
    };
    return () => source.close();
  }, [fetchReport, phase, runId, runStatus]);

  const generate = async () => {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const data = (await response.json()) as { plan?: TestPlan; planId?: string; error?: string };
      if (!response.ok || !data.plan || !data.planId) throw new Error(data.error || "The plan could not be generated.");
      setPlan(data.plan); setPlanId(data.planId); setPhase("plan");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "The plan could not be generated.");
    } finally { setBusy(false); }
  };

  const approve = async () => {
    if (!plan || !planId) return;
    setBusy(true); setError(null); setActions([]); setLatestScreenshot(null); setCurrentStep(""); setReport(null);
    try {
      const response = await fetch("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input, approvedPlan: plan, planId }) });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error || "The run could not be started.");
      setRunId(data.id); setRunStatus("queued"); setPhase("running");
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "The run could not be started.");
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!runId) return;
    const response = await fetch(`/api/runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" });
    if (!response.ok) setError("Cancellation could not be requested.");
  };

  const startNew = () => {
    setPhase("input"); setPlan(null); setPlanId(null); setReport(null); setRunId(null); setActions([]); setLatestScreenshot(null); setCurrentStep(""); setError(null);
  };

  const recent = useMemo(() => recentRuns.slice(0, 6), [recentRuns]);

  return (
    <div className="min-h-screen">
      <Header phase={phase} />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        {error && <div role="alert" className="mb-8 flex items-start justify-between gap-5 border-l-4 border-[#a34c23] bg-[#fff2ec] p-4 text-sm"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError(null)} className="font-black">×</button></div>}
        {phase === "input" && <NewTestForm input={input} setInput={setInput} buildMode={buildMode} setBuildMode={setBuildMode} onSubmit={generate} busy={busy} publicDemo={publicDemo} />}
        {phase === "plan" && plan && <PlanEditor plan={plan} setPlan={setPlan} approve={approve} busy={busy} />}
        {phase === "running" && <LiveRun status={runStatus} currentStep={currentStep} actions={actions} latestScreenshot={latestScreenshot} cancel={cancel} />}
        {phase === "report" && report && <Report report={report} startNew={startNew} refresh={() => fetchReport(report.id)} />}

        {phase === "input" && recent.length > 0 && (
          <section className="mt-16 border-t border-[var(--line)] pt-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">Recent persisted runs</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((run) => (
                <button key={run.id} type="button" onClick={() => { setRunId(run.id); void fetchReport(run.id); }} className="border border-[var(--line)] bg-[var(--surface)] p-4 text-left hover:border-[var(--ink)]">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--teal)]">{statusLabel(run.status)}</span>
                  <p className="mt-2 line-clamp-2 text-sm leading-6">{run.criterion}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
