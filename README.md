# SpecSentry

SpecSentry turns a written acceptance criterion into an approved browser journey and an evidence-backed result. This repository contains the first complete vertical slice for OpenAI Build Week: the same workflow fails a deliberately defective Sentry Shop checkout and passes the corrected build.

> Acceptance criteria in. Evidence-backed bugs out.

## What works

1. Enter a staging URL, exact allowed hostname, user story, acceptance criterion and optional starting instructions, or use **Load demo**.
2. GPT-5.6 creates a strict structured plan in a separate planner request. Invalid output receives one controlled retry.
3. Review and edit every plan field, then explicitly approve it.
4. SpecSentry opens an isolated 1440 × 900 Chromium context and executes one approved step at a time through the OpenAI computer screenshot/action loop.
5. Every normalized action, observation, timestamp and screenshot reference is persisted in SQLite and streamed to the UI over server-sent events.
6. A separate evaluator request judges only the recorded evidence and returns pass, fail, blocked or inconclusive.
7. The report separates captured browser evidence from AI assessment and traces criterion → checkpoint → action → screenshot → judgement.
8. A failed finding starts as a persisted draft with an immutable AI original, editable human copy, read-only evidence, and explicit approve/reject/reopen transitions.
9. An approved finding can render the exact GitHub title and Markdown body; a separate confirmation creates at most one issue and stores its URL.
10. Planner, computer executor and evaluator token usage is persisted and shown by phase without a cost estimate.

The controlled fixture is hosted inside the same application at `/demo/shop`. `?mode=defective` withholds delivery charge and final total on order review; `?mode=passing` shows both before payment.

## Requirements

- Node.js 24 or newer (the repository uses the stable `node:sqlite` API)
- npm
- Chromium installed through Playwright
- An OpenAI API key for live GPT-5.6 and computer-tool runs; no key is needed for automated checks or the deterministic mocked demo

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env.local
```

For the deterministic local demo, edit `.env.local`:

```dotenv
OPENAI_MOCK=true
ALLOW_LOCALHOST=true
SPECSENTRY_DATA_DIR=./data
```

Then start the one Node application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), choose a fixture build, click **Load demo**, generate the plan, review it, and click **Approve plan & start run**. Screenshots and `specsentry.sqlite` are created below the gitignored `data` directory. Recent reports can be reopened from the home screen without rerunning the test.

## Human review and GitHub export

Only failed findings enter review. Edit title, severity, summary, expected result, actual result, reproduction steps and suggested next test, then save the draft. Evidence identifiers are captured data and cannot be edited. Drafts may be approved or rejected; rejected findings can be reopened. Approval itself never calls GitHub.

Configure the server-only export boundary in `.env.local`:

```dotenv
GITHUB_TOKEN=your-fine-grained-token
GITHUB_OWNER=your-owner
GITHUB_REPO=your-repository
GITHUB_REPOSITORY_ALLOWLIST=your-owner/your-repository
PUBLIC_APP_URL=https://your-specsentry-origin.example
```

Use a fine-grained token scoped to the selected repository with **Issues: write** permission. `PUBLIC_APP_URL` must use HTTPS except for localhost development. None of these variables may use a `NEXT_PUBLIC_` prefix. Restart the server after changing them.

From an approved failed report, click **Preview exact GitHub issue**. The server generates the exact title and escaped Markdown body, including absolute report/evidence links and source attribution. Review it, check the separate confirmation, then click **Confirm and create one GitHub issue**. A persisted idempotency key, atomic export claim, preflight marker lookup and stored issue URL prevent duplicate clicks and retry duplication. A GitHub failure leaves the finding approved and retryable with a safe diagnostic.

Live issue creation is deliberately manual. Automated tests use the non-production GitHub mock and never create external issues. Every future issue requires a fresh preview and separate confirmation.

### Controlled live export validation

Goal 2's one controlled live export gate completed on 2026-07-20:

- Run `865781e5-f436-4026-9185-ad89af66eddb` produced failed/high finding identifier `33fc7185-0408-4acf-930a-d116277082f4`, with 22 persisted actions/screenshots and two validated evidence references.
- A human edit was saved and approved while the immutable AI original remained unchanged and separately retained.
- [Issue #1](https://github.com/Cliffinkent/specsentry-export-demo/issues/1) was created in `Cliffinkent/specsentry-export-demo` with the exact title `[SpecSentry/HIGH] Order review omits delivery charge and total cost before payment` at `2026-07-20T14:19:50.313Z`.
- GitHub's stored title/body matched preview hash `ff80f0af0c6657253e4a0c842af199bbe24d81f4c7cb33ae11680698d1853497`. A repeated confirmed export returned the stored URL with `existing: true`; the repository contained exactly one open issue and no duplicate.
- The report and both evidence links returned HTTP 200 during validation. They used a temporary Cloudflare Tunnel, which is not a permanent deployment or stable hosting claim.
- No secret appeared in logs or responses. Required GitHub configuration is present only in ignored `.env.local`.

## Live OpenAI mode

Set the following values in `.env.local`:

```dotenv
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-5.6
OPENAI_MOCK=false
ALLOW_LOCALHOST=true
```

Restart the development server, load either demo mode, and use the same UI. Planner, executor and evaluator are independent Responses API interactions. The executor uses the OpenAI `computer` tool but executes its normalized actions only inside the locally isolated Playwright context.

The small live smoke test validates a real planner Structured Output without launching a browser:

```bash
npm run smoke:live
```

The command loads `.env.local` directly. It exits nonzero with a clear setup error when `OPENAI_API_KEY` is missing; credentials still do not affect the mocked automated suite.

To repeat the real computer-tool reliability matrix, use two terminals. Keep `OPENAI_MOCK=false` in `.env.local`.

```bash
# Terminal 1
ALLOW_LOCALHOST=true npm run dev -- --hostname 127.0.0.1 --port 3100

# Terminal 2
LIVE_BASE_URL=http://127.0.0.1:3100 npm run test:live:vertical
```

`test:live:vertical` runs each fixture mode three times through the same plan and run APIs used by the UI. It prints one compact `LIVE_RESULT` per run and writes a secret-free metrics file below gitignored `data/`. `LIVE_RUNS_PER_MODE=1` or `2` can reduce repetitions during diagnosis.

### Verified live behavior

On 2026-07-18, OpenAI SDK 6.48.0 with `OPENAI_MODEL=gpt-5.6-terra` produced this post-fix matrix:

| Mode | Run ID | Status | Actions | Duration | Retries | Screenshots | Confidence | Errors / off-host navigation |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Defective 1 | `8df0011c-9e81-4813-b453-248f9802d855` | failed, high | 24 | 38.365s | 0 | 24 | 0.99 | none / none |
| Defective 2 | `cfd4ed13-550a-4a2c-873b-d822806ddfd7` | failed, high | 23 | 31.711s | 0 | 23 | 0.99 | none / none |
| Defective 3 | `bc371446-1b10-4b21-9401-e84675274e5f` | failed, high | 22 | 28.328s | 0 | 22 | 0.99 | none / none |
| Passing 1 | `189a6d5e-5303-43c6-8757-6ecae80698e9` | passed | 23 | 26.419s | 0 | 23 | — | none / none |
| Passing 2 | `5577cad7-0366-4f40-8917-971092e31797` | passed | 24 | 30.575s | 0 | 24 | — | none / none |
| Passing 3 | `d89571c5-11be-4f52-9e83-9220ba5d9e1f` | passed | 23 | 28.169s | 0 | 23 | — | none / none |

Confidence is part of a failed finding, so passing evaluations correctly record `null` and contain no finding. Every cited defective screenshot mapped to a persisted action and visibly showed only the £80 basket subtotal before payment; no Playwright Chromium process remained after the matrix.

## Validation commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e:fixture
npm run test:e2e:vertical
npm run test:e2e
npm audit --omit=dev
```

- `npm test` covers planner/evaluator schemas, invalid-output retry, usage aggregation, review transitions, original preservation, evidence ownership, GitHub allow-list/URL validation, escaped preview, safe failures, idempotency, exact-host/private-network rules, same-origin action enforcement, rate limiting, action/timeout/retry limits and report trace creation.
- `npm run test:e2e:fixture` verifies explicit mode selection plus the passing and defective checkout behavior.
- `npm run test:e2e:vertical` runs the same user workflow twice with mocked OpenAI and GitHub calls: defective continues through edit/save, reject/reopen, approve, exact preview, separate confirmation and one locked export; passing produces a pass with no finding.
- `npm run test:e2e` runs all five fixture and mocked vertical cases together.

Automated tests set `OPENAI_MOCK=true`; they never spend API credits or depend on model availability.

## Architecture

The repository is one deployable Next.js App Router application:

- `app/` — workflow UI, Sentry Shop fixture, validated route handlers, SSE and evidence delivery.
- `components/specsentry-app.tsx` — New Test, editable approval, live run and evidence-backed report screens.
- `lib/ai/` — provider contract, deterministic mock, OpenAI Responses API adapter, strict planner/evaluator retry services.
- `lib/executor/` — bounded Playwright computer-action loop. It records evidence but contains no pass/fail, severity or confidence logic.
- `lib/repository.ts` — the only SQLite boundary; runs, partial results and SSE events survive UI reloads.
- `lib/github/` — validated server-only configuration, escaped issue rendering, REST client and idempotent export orchestration.
- `lib/report.ts` — derives the visible evidence trace from persisted records.
- `lib/security/` — URL/DNS policy, same-origin checks, redaction and rate limits.
- `data/screenshots/<run-id>/` — gitignored local screenshots served through a path-safe same-origin route.

Planner, executor and evaluator are deliberately separate. The executor cannot create a finding, and the evaluator cannot operate the browser. Evaluator evidence references are rejected unless they exactly match screenshots recorded for that run.

The repository migrates existing Goal 1 databases in place. New runs use a one-time planner receipt so planner usage is attributed to the approved run; older persisted runs remain readable with zero-valued usage defaults.

## Run limits and security

- Staging URL hostname must exactly equal the approved hostname.
- `file:` URLs, embedded URL credentials, private-network targets and DNS resolutions to private addresses are blocked.
- Localhost is allowed only in non-production when `ALLOW_LOCALHOST=true`.
- Browser requests and navigation outside the approved hostname are aborted.
- Pop-ups, downloads, service workers, browser/system shortcuts and non-left clicks are blocked.
- Safe in-page editing uses an explicit `Control+A` chord; address-bar and navigation chords such as `Control+L` remain blocked.
- Page content is untrusted and cannot expand the approved host, step or action budget.
- Runs stop after five minutes, 40 attempted actions, manual cancellation or an enforced stop/error condition.
- Each action is retried no more than twice; failed attempts are counted and recorded.
- Every Responses API call passes `{ timeout: 30000, maxRetries: 1 }` as the SDK's second request-options argument, keeping transport behavior bounded and separate from the JSON request body.
- Browser context and process are closed in `finally` after success, failure, cancellation or timeout.
- API bodies and model outputs use strict Zod schemas. Plan and run creation are rate limited.
- Review mutations require same-origin requests plus an exact action header. Preview and export are separately rate limited.
- Only approved failed findings can be previewed or exported. Evidence ownership is checked against recorded screenshots, Markdown text is escaped, and GitHub owner/repository/issue responses are validated.
- GitHub credentials stay server-side. Diagnostics never store or return authorization headers, tokens or raw GitHub response bodies.
- The UI receives normalized events only, never raw model traces. Diagnostics redact API keys, passwords, cookies and tokens.
- Responses are same-origin and the app sends a restrictive Content Security Policy and related browser headers.

## GPT-5.6 and Codex

GPT-5.6 is the runtime model, selected through `OPENAI_MODEL` (default `gpt-5.6`). It proposes the structured plan, drives the approved computer-tool step loop and separately evaluates the resulting evidence.

Codex built this vertical slice from the PRD: architecture, application code, controlled fixture, security boundaries, tests, debugging and documentation. Codex is not part of a running test and does not judge production results.

## Deliberate Goal 2 boundaries

This slice does not include authentication, user-provided tokens, Markdown uploads, Supabase, hosted object storage, mobile/cross-browser testing, generated regression tests, CI integration, deployment, automatic code fixes or the broader ten-case evaluation set. GitHub issue export is the only external write and remains server-configured, repository-allow-listed, human-previewed and explicitly confirmed. Goal 2's controlled live export gate is complete; the temporary public tunnel used for that proof is not a deployment.

Recommended Goal 3: add the broader seeded evaluation set across passing, failing, blocked and ambiguous criteria before expanding to team authentication, hosted storage or deployment.
