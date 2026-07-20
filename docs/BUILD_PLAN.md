# SpecSentry Vertical Slice Build Plan

Last updated: 2026-07-20

## Goal

Build and verify the first complete SpecSentry vertical slice, then add Goal 2 human finding review and explicitly confirmed, idempotent GitHub issue export without weakening the evidence boundary.

## Current gate

**Requirements verified:** `SpecSentry Product Requirements.docx` was added, rendered and visually reviewed across all 20 pages, then extracted without changing its wording to `docs/SpecSentry-PRD.md`.

Goal 1 is complete, including the real OpenAI matrix. Goal 2 is complete, including persisted human review, exact GitHub preview/export, per-phase token usage and the one controlled live export recorded below. Authentication, user-provided tokens, Markdown upload, Supabase, hosted object storage, generated regression tests, CI integration, mobile/cross-browser testing, automatic fixes and the wider ten-case set remain out of scope. Goal 3 remains the broader seeded evaluation set.

## Locked decisions from the task brief

- One deployable Node application using Next.js, TypeScript, App Router, and Tailwind CSS.
- OpenAI Node SDK with the Responses API and `OPENAI_MODEL`, defaulting to `gpt-5.6`.
- Zod validation at every request and model-output boundary.
- SQLite behind a small repository layer.
- Playwright Chromium contexts fixed at 1440 x 900.
- Server-sent events for live run updates.
- Sentry Shop under `/demo/shop`, with explicit passing and defective modes.
- Screenshots in a gitignored local data directory.
- Automated tests mock OpenAI; separately documented smoke and six-run browser verification commands require a real API key and fail clearly when live configuration is missing.
- No authentication, uploads, Supabase, mobile testing, generated regression suites, CI integration, automated fixes or deployment. GitHub issue creation is the one allowed external write and requires a human-reviewed preview plus separate explicit confirmation.

## Milestones

### Milestone 0 - Requirements and runnable foundation

- [x] Read `docs/SpecSentry-PRD.md`, or extract the supplied DOCX there without changing meaning.
- [x] Reconcile fixture copy, demo criterion, expected steps, and evidence requirements with this plan.
- [x] Bootstrap the Next.js TypeScript App Router application with Tailwind CSS.
- [x] Add `.env.example`, local-data ignores, baseline scripts, and a health/runnable page.
- [x] Create or update `AGENTS.md` with architecture, commands, security invariants, and scope limits.
- [x] Verify lint, typecheck, unit test harness, and production build.

### Milestone 1 - Deterministic Sentry Shop fixture

- [x] Implement product, basket, guest checkout, delivery details, and order review.
- [x] Select mode only through an explicit validated query parameter or stored project configuration.
- [x] In passing mode, show delivery charge and final total on review.
- [x] In defective mode, show only subtotal until the user continues toward payment.
- [x] Use deterministic data and accessible labels; add focused Playwright coverage for both modes.
- [x] Prevent pop-ups, downloads, and external navigation in the fixture.

### Milestone 2 - Validated project, plan, and approval flow

- [x] Add the New Test form, exact-host approval, optional starting instructions, and Load demo control.
- [x] Define strict Zod schemas for project input and structured planner output.
- [x] Implement the separate Responses API planner request with one controlled schema retry.
- [x] Make the generated plan editable and revalidated before explicit approval.
- [x] Persist tests and approved plans through the repository layer.
- [x] Cover schema validity, invalid-output retry, OpenAI outage, URL rules, and rate limiting.

### Milestone 3 - Bounded browser executor and live events

- [x] Start only from an approved plan and create an isolated fixed-size Chromium context.
- [x] Execute one approved step at a time with the OpenAI computer screenshot/action loop.
- [x] Record every action, observation, timestamp, error, and screenshot reference.
- [x] Enforce exact hostname, same-origin navigation, no file URLs, downloads, pop-ups, or unapproved private-network targets.
- [x] Enforce five minutes, 40 actions, cancellation, stop conditions, and at most two action retries.
- [x] Keep judgement fields out of executor types and prompts; always close browser resources.
- [x] Stream safe progress events over SSE and preserve partial runs.

### Milestone 4 - Evidence-constrained evaluation and report

- [x] Define strict evaluator and finding schemas.
- [x] Send the criterion, approved plan, screenshots, actions, observations, and errors in a separate Responses API request.
- [x] Constrain evidence references to identifiers present in the recorded run.
- [x] Create findings only for failed criteria.
- [x] Render status, duration, criterion result, timeline, screenshots, expected/actual result, reproduction steps, and the complete evidence trace.
- [x] Visually distinguish recorded evidence from AI assessment.
- [x] Render useful partial reports after failure, cancellation, timeout, or evaluator outage.

### Milestone 5 - Full verification and handoff

- [x] Add mocked end-to-end passing and defective runs.
- [x] Verify the defective run produces a high-confidence failed finding with relevant evidence.
- [x] Verify the passing run produces a passed result and no finding.
- [x] Add README setup, architecture, demo, security, testing, live-smoke, GPT-5.6, and Codex documentation.
- [x] Update `STATUS.md` with completed work, blockers, and the recommended next milestone.
- [x] Run and fix every required validation command.
- [x] Run the live smoke test only when `OPENAI_API_KEY` is present; record a missing key as skipped, not failed.
- [x] Audit remaining gaps against the PRD and recommend Goal 2.

### Milestone 6 - Live OpenAI hardening and reliability proof

- [x] Confirm OpenAI SDK 6.48.0 Responses/computer request shapes from installed types.
- [x] Pass bounded timeout/retry options in the second SDK argument, not the request body.
- [x] Make `npm run smoke:live` load `.env.local`, succeed against the real planner, and fail nonzero when the key is suppressed.
- [x] Fix `Control+A` chord execution without permitting address-bar or navigation shortcuts.
- [x] Prevent plans from reopening a staging URL that the executor already loaded.
- [x] Correct mocked multi-action keypresses to match the SDK's key-combination semantics.
- [x] Add a repeatable live metrics harness and regressions for every discovered issue.
- [x] Complete a fresh post-fix matrix: defective 3/3 high-severity failures and passing 3/3 passes.
- [x] Visually verify one cited screenshot per defective run and map every cited file to its recorded action.
- [x] Confirm no persisted secrets, off-host navigation, or residual Playwright Chromium process.

### Milestone 7 - Human review, usage accounting and GitHub issue export

- [x] Migrate existing SQLite data in place and persist immutable original/current finding records with draft, approved, rejected and exported states.
- [x] Restrict review to failed findings; enforce read-only, run-owned evidence; support save, approve, reject and reopen.
- [x] Persist planner, executor and evaluator input, cached-input, output and total tokens; display usage without estimating cost.
- [x] Validate server-only GitHub variables, HTTPS public URL and an environment repository allow list.
- [x] Generate the exact escaped title/Markdown body with run, criterion, approved severity, expected/actual, numbered reproduction, last successful step, next test, absolute evidence links and source attribution.
- [x] Require a fresh preview and separate explicit confirmation; approval alone creates nothing.
- [x] Enforce an atomic export claim, persisted idempotency marker, existing-issue recovery, stored URL reuse and a post-success export lock.
- [x] Keep GitHub failures approved and retryable while storing only safe diagnostics and exposing no token, header or raw response.
- [x] Cover the workflow with mocked GitHub unit/service tests and Playwright; never create a live issue unattended.
- [x] Complete one explicitly confirmed live export, verify the stored GitHub title/body hash, prove idempotent stored-URL reuse and confirm that no duplicate issue exists.

## Required validation ledger

Record the exact command, exit status, and relevant counts here as each gate is completed.

| Gate | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | Passed, exit 0 on 2026-07-20 |
| TypeScript | `npm run typecheck` | Passed, exit 0 on 2026-07-20 |
| Automated tests | `npm test` | Passed on 2026-07-20: 11 files, 44 tests |
| Production build | `npm run build` | Passed on 2026-07-20: Next.js 16.2.10 compiled and generated all routes |
| Complete browser suite | `npm run test:e2e` | Passed on 2026-07-20: 5 tests in 17.5s using mocked providers and isolated local output/data |
| Production dependency audit | `npm audit --omit=dev` | Passed on 2026-07-20: 0 vulnerabilities |
| Mocked review/export | `npm run test:e2e` | Passed: edit/save, reject/reopen, approve, exact preview, separate confirmation, one mocked issue, export lock and all usage phases |
| Live environment configuration | boolean-only server environment check | Required OpenAI and GitHub values are present in ignored `.env.local`; no value was printed |
| Controlled live GitHub export | explicit human confirmation and read-only follow-up | Complete: issue #1 created once; repeat returned `existing: true`; exactly one open issue remains |
| Missing live configuration | `OPENAI_API_KEY= npm run smoke:live` | Failed clearly as intended, exit 1 |
| Live smoke | `npm run smoke:live` | Passed: real `gpt-5.6-terra` schema-valid plan, 5 steps, 1 checkpoint |
| Live browser matrix | `npm run test:live:vertical` | Passed: 6/6 expected outcomes; metrics recorded below |

The 2026-07-20 local gates forced `OPENAI_MOCK=true` and `GITHUB_MOCK=true`. Test data was redirected outside the repository's preserved `data/` directory. Turbopack and Playwright required permission to bind local internal/test ports in this environment; their successful reruns did not call OpenAI or GitHub.

## Controlled live export ledger

Recorded on 2026-07-20:

| Field | Verified value |
| --- | --- |
| Run | `865781e5-f436-4026-9185-ad89af66eddb` |
| Finding identifier | `33fc7185-0408-4acf-930a-d116277082f4` |
| Result | failed, high severity |
| Evidence | 22 persisted actions/screenshots; two validated evidence references |
| Review boundary | human edit saved and approved; immutable AI original retained |
| Export repository | `Cliffinkent/specsentry-export-demo` |
| Issue | [#1](https://github.com/Cliffinkent/specsentry-export-demo/issues/1) — `[SpecSentry/HIGH] Order review omits delivery charge and total cost before payment` |
| Exported at | `2026-07-20T14:19:50.313Z` |
| Preview hash | `ff80f0af0c6657253e4a0c842af199bbe24d81f4c7cb33ae11680698d1853497` matched GitHub's stored title/body |
| Idempotency | confirmed repeat returned the stored URL with `existing: true`; one open issue, no duplicate |
| Public evidence | report and both evidence links returned HTTP 200 during validation |
| Public origin | temporary Cloudflare Tunnel used only for validation; not a permanent deployment |
| Secret handling | no secrets found in logs/responses; local GitHub configuration remains in ignored `.env.local` |

## Live verification ledger

OpenAI SDK 6.48.0, `OPENAI_MODEL=gpt-5.6-terra`, local fixture at `http://127.0.0.1:3100`, recorded 2026-07-18.

| Mode | Run ID | Status | Actions | Duration | Retries | Screenshots | Confidence | Errors / unexpected navigation |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Defective 1 | `8df0011c-9e81-4813-b453-248f9802d855` | failed, high | 24 | 38.365s | 0 | 24 | 0.99 | none / none |
| Defective 2 | `cfd4ed13-550a-4a2c-873b-d822806ddfd7` | failed, high | 23 | 31.711s | 0 | 23 | 0.99 | none / none |
| Defective 3 | `bc371446-1b10-4b21-9401-e84675274e5f` | failed, high | 22 | 28.328s | 0 | 22 | 0.99 | none / none |
| Passing 1 | `189a6d5e-5303-43c6-8757-6ecae80698e9` | passed, no finding | 23 | 26.419s | 0 | 23 | n/a | none / none |
| Passing 2 | `5577cad7-0366-4f40-8917-971092e31797` | passed, no finding | 24 | 30.575s | 0 | 24 | n/a | none / none |
| Passing 3 | `d89571c5-11be-4f52-9e83-9220ba5d9e1f` | passed, no finding | 23 | 28.169s | 0 | 23 | n/a | none / none |

Passing results have no finding, so finding-level confidence is intentionally absent. The compact local artifact is `data/live-results-2026-07-18T12-42-52-869Z.json`; `data/` remains gitignored.

## Completion standard

Goals 1 and 2 are complete: the evidence-backed browser outcomes are stable, failed findings persist through every human review transition, exact preview and explicit confirmation remain distinct, mocked and controlled live export are idempotent, usage is visible by phase, and all automated gates pass. The completed live issue does not authorize another export; every future issue remains a separate manual gate. Goal 3 is the broader seeded evaluation set.
