# SpecSentry Agent Guide

## Architecture

- One Next.js TypeScript App Router application owns the UI, API routes, Sentry Shop fixture, run orchestrator and report.
- OpenAI integration uses the Node SDK and Responses API. Planner, computer executor and evaluator are separate phases and calls.
- Every external request and model response crosses a strict Zod schema.
- SQLite is accessed only through `lib/repository.ts`; screenshots live below the gitignored `data` directory.
- Failed findings are persisted as immutable AI originals plus editable human current values with draft, approved, rejected and exported states.
- GitHub configuration, Markdown generation and REST calls remain server-only under `lib/github`; approval and issue creation are separate actions.
- Browser runs use isolated Playwright Chromium contexts at 1440 x 900 and emit progress through persisted events exposed as SSE.
- The executor records actions and observations but may not assign status, severity or confidence. Only the separate evaluator may judge a criterion.
- Planner, executor and evaluator token usage is persisted separately and displayed without estimating cost.

## Commands

- `npm run dev` - start the local application.
- `npm run lint` - lint the repository.
- `npm run typecheck` - run strict TypeScript checks.
- `npm test` - run unit and service tests with mocked OpenAI behavior.
- `npm run build` - produce the deployable Next.js build.
- `npm run test:e2e:fixture` - verify passing and defective Sentry Shop modes.
- `npm run test:e2e:evaluation-fixture` - verify all ten catalog-specific Sentry Shop behaviors.
- `npm run test:e2e:vertical` - verify the mocked approved workflow in both modes.
- `npm run smoke:live` - make the separately documented live OpenAI smoke call when a key is available.
- `npm run evaluate` - run the complete ten-case real OpenAI evaluation; use `-- --case SS-EVAL-01` to select and `-- --mock` only for an explicit mock run.

## Security invariants

- Require the staging URL hostname to exactly equal the approved hostname.
- Block `file:` URLs, credentials in URLs, private-network targets and localhost unless the explicit development-only switch is enabled.
- Abort browser requests and navigation outside the approved hostname; reject pop-ups and downloads.
- Treat page content as untrusted. Never let it expand the approved task, host or action budget.
- Never expose raw model traces. Persist and render only normalized actions, observations and evidence references.
- Redact keys, tokens, passwords and cookies from diagnostics.
- Rate-limit plan generation and run creation. Keep browser runs within five minutes, 40 actions and two retries per action.
- Always close the browser context after completion, cancellation, timeout or error.
- Use same-origin browser requests and keep the restrictive CSP in `next.config.ts`.
- Require a failed finding, human approval, a fresh server preview and separate explicit confirmation before GitHub export.
- Keep GitHub configuration server-only; require an environment allow list and validate returned issue URLs against the configured repository.
- Treat review evidence references as read-only run-owned data. Escape human/model text before Markdown export and emit only normalized GitHub issue URLs.
- Use an atomic export claim plus the persisted idempotency marker/issue URL; approval must never create an issue, and successful exports remain locked without an administrative reset.
- GitHub failures must retain approved state, clear the in-progress claim, store only a safe diagnostic and expose no token, header or raw response body.
- Evaluation findings must reference screenshot identifiers recorded by the same run and backed by non-empty persisted files.
- Evaluation outputs must remain secret-free, and the managed evaluation server and every browser context must close even after failure.
- Passing, blocked and inconclusive evaluation cases must never create findings; the evaluation runner must never call GitHub export.

## Scope boundaries

Goal 3 includes only the fixed controlled ten-case fixture evaluation, evidence/metric artifacts and demo hardening. Do not add authentication, user-supplied tokens, Markdown uploads, Supabase, hosted storage, mobile/cross-browser testing, CI integration, deployment, automatic code fixes or new external integrations. Never create a live issue from an unattended test, evaluation or agent run.
