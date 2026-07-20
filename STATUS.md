# SpecSentry Status

Last updated: 2026-07-20

## Completed

- Read and visually reviewed the 20-page PRD; extracted it faithfully to `docs/SpecSentry-PRD.md`.
- Built the single Next.js TypeScript App Router application with Tailwind CSS, SQLite, SSE and local screenshot storage.
- Implemented the deterministic Sentry Shop product, basket, guest delivery and order-review journey in explicit passing and defective modes.
- Implemented strict Zod project, planner, executor-record and evaluator schemas.
- Implemented the OpenAI Responses API adapter with `OPENAI_MODEL` defaulting to `gpt-5.6`, strict Structured Outputs, one controlled retry, and a computer screenshot/action loop.
- Confirmed the installed OpenAI SDK 6.48.0 call shapes and added 30-second/one-retry request options in the second `responses.create(body, options)` argument.
- Fixed live computer-tool reliability: safe `Control+A` is executed as one editing chord, unsafe address-bar/navigation shortcuts remain blocked, and planner/executor instructions begin from the already-loaded staging page.
- Added `test:live:vertical`, a secret-free metrics harness that uses the same plan/run API workflow and repeats each Sentry Shop mode three times.
- Added explicit plan editing/approval, bounded isolated Chromium execution, cancellation, partial persistence and separate evidence-constrained evaluation.
- Added a report with duration, result, expected/actual result, reproduction steps, screenshot gallery, ordered action history and criterion-to-judgement evidence trace.
- Added in-place SQLite migration for original/current finding review data, draft/approved/rejected/exported states, timestamps, idempotency and GitHub issue URL.
- Added editable failed-finding review with save, approve, reject and reopen; evidence remains read-only and run-owned.
- Added server-only, repository-allow-listed GitHub configuration; exact escaped Markdown preview; separate explicit confirmation; atomic export claim; marker recovery; stored-URL idempotency; and safe retry behavior.
- Added planner receipts plus planner/executor/evaluator token-usage capture and report display without cost estimation.
- Added exact-host/private-network controls, browser request interception, rate limits, same-origin/CSP policy, redaction and safe user errors.
- Verified the controlled fixture in both modes and the full mocked workflow: defective produces a high-confidence high-severity failure; passing produces a pass without a finding.
- Verified a fresh real-model matrix: defective 3/3 returned high-severity evidence-backed failures at 0.99 confidence; passing 3/3 returned pass with no finding.
- Completed Goal 2's controlled live export gate: one human-reviewed failed finding was exported once, the confirmed repeat returned the stored issue with `existing: true`, and no duplicate was created.
- Re-ran the complete local gate on 2026-07-20 with forced mocked providers and isolated test data: lint and strict types passed; 44 unit/service tests passed; 5 combined Playwright tests passed in 17.5s; the production build passed; the production dependency audit reports 0 vulnerabilities.

## Live verification record

| Mode | Run ID | Status | Actions | Duration | Retries | Screenshots | Confidence | Errors / unexpected navigation |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Defective 1 | `8df0011c-9e81-4813-b453-248f9802d855` | failed, high | 24 | 38.365s | 0 | 24 | 0.99 | none / none |
| Defective 2 | `cfd4ed13-550a-4a2c-873b-d822806ddfd7` | failed, high | 23 | 31.711s | 0 | 23 | 0.99 | none / none |
| Defective 3 | `bc371446-1b10-4b21-9401-e84675274e5f` | failed, high | 22 | 28.328s | 0 | 22 | 0.99 | none / none |
| Passing 1 | `189a6d5e-5303-43c6-8757-6ecae80698e9` | passed, no finding | 23 | 26.419s | 0 | 23 | n/a | none / none |
| Passing 2 | `5577cad7-0366-4f40-8917-971092e31797` | passed, no finding | 24 | 30.575s | 0 | 24 | n/a | none / none |
| Passing 3 | `d89571c5-11be-4f52-9e83-9220ba5d9e1f` | passed, no finding | 23 | 28.169s | 0 | 23 | n/a | none / none |

All cited defective evidence references mapped to recorded actions and were visually checked. A scan of all persisted run JSON found no API key, password, cookie or authorization material. No Playwright Chromium process remained after the matrix.

## Controlled live export record

The following controlled validation completed on 2026-07-20. It is a record of an explicitly confirmed external write, not permission for another export.

- Live run `865781e5-f436-4026-9185-ad89af66eddb` produced failed/high finding identifier `33fc7185-0408-4acf-930a-d116277082f4` with 22 persisted actions, 22 screenshot references and two evaluator-selected evidence references.
- Both selected references mapped to recorded actions and existing screenshot files. During the live validation, the report and both public evidence links returned HTTP 200.
- The human edit was saved and approved while the immutable AI original remained preserved separately.
- Repository: `Cliffinkent/specsentry-export-demo`.
- Created issue: [#1](https://github.com/Cliffinkent/specsentry-export-demo/issues/1), titled exactly `[SpecSentry/HIGH] Order review omits delivery charge and total cost before payment`.
- Export timestamp: `2026-07-20T14:19:50.313Z`.
- GitHub's stored title and body matched preview hash `ff80f0af0c6657253e4a0c842af199bbe24d81f4c7cb33ae11680698d1853497`.
- Repeating the confirmed export returned the stored URL with `existing: true`. The repository contained exactly one open issue and no duplicate; a fresh read-only check on 2026-07-20 still found that single open issue.
- SQLite still records the finding as `exported` with the same timestamp and GitHub URL. The export-in-progress flag is clear.
- The public report used a temporary Cloudflare Tunnel. It proved reachability for the controlled validation but is not a permanent deployment or stable production URL.
- No secrets were found in validation logs or responses. Required OpenAI and GitHub configuration is now present locally in ignored `.env.local`; only boolean presence checks were reported.

## Goal 2 completion and residual risk

- Goal 2's mocked workflow and controlled live export gate are complete. Any future issue remains a new external write requiring a fresh preview and separate explicit confirmation.
- The disposable `specsentry-export-demo` repository is only the issue-export target. It is not a source-code repository, and no source-code Git remote is configured.
- The temporary Cloudflare Tunnel is not a deployment or backup mechanism.
- Model output is probabilistic; the verified controls bound requests/actions and preserve evidence, but the 3/3 sample is not a broad benchmark. The fixture is intentionally Chromium-only and localhost-only for this goal.

## Next recommended milestone

Goal 3 should add the broader seeded evaluation set (passing, failing, blocked and ambiguous criteria) before team authentication, hosted storage, deployment or a wider issue-export rollout.
