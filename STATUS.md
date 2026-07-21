# SpecSentry Status

Last updated: 2026-07-21

## Completed

- Published the final Build Week product requirements at [`docs/PRODUCT_REQUIREMENTS.md`](docs/PRODUCT_REQUIREMENTS.md) after confirming that the Markdown retained every non-empty content block from the visually reviewed 20-page source DOCX; removed the duplicate DOCX.
- Built the single Next.js TypeScript App Router application with Tailwind CSS, SQLite, SSE and local screenshot storage.
- Implemented the deterministic Sentry Shop product, basket, guest delivery and order-review journey in explicit passing and defective modes.
- Implemented strict Zod project, planner, executor-record and evaluator schemas.
- Implemented the OpenAI Responses API adapter with `OPENAI_MODEL` defaulting to `gpt-5.6-terra`, strict Structured Outputs, one controlled retry, and a computer screenshot/action loop.
- Confirmed the installed OpenAI SDK 6.48.0 call shapes and added 30-second/one-retry request options in the second `responses.create(body, options)` argument.
- Fixed live computer-tool reliability: safe `Control+A` is executed as one editing chord, unsafe address-bar/navigation shortcuts remain blocked, and planner/executor instructions begin from the already-loaded staging page.
- Added `test:live:vertical`, a secret-free metrics harness that uses the same plan/run API workflow and repeats each Sentry Shop mode three times.
- Added explicit plan editing/approval, bounded isolated Chromium execution, cancellation, partial persistence and separate evidence-constrained evaluation.
- Added a report with duration, result, expected/actual result, reproduction steps, screenshot gallery, ordered action history and criterion-to-judgement evidence trace.
- Added in-place SQLite migration for original/current finding review data, draft/approved/rejected/exported states, timestamps, idempotency and GitHub issue URL.
- Added editable failed-finding review with save, approve, reject and reopen; evidence remains read-only and run-owned.
- Added server-only, repository-allow-listed GitHub configuration; exact escaped Markdown preview; separate explicit confirmation; atomic export claim; marker recovery; stored-URL idempotency; and safe retry behavior.
- Added planner receipts plus planner/executor/evaluator token-usage capture and report display without cost estimation.
- Added an exactly ten-case controlled evaluation catalog: five positive passes, three distinct seeded failures, one unavailable-prerequisite block, and one deliberately ambiguous criterion.
- Added a real-by-default `npm run evaluate` harness with selected-case support, an explicit `--mock` flag, managed server shutdown, case/run persistence, action/file evidence integrity checks, controlled metrics, and clear missing-key failure.
- Added deterministic missing-validation, basket-loss, and dependency-unavailable fixture modes while preserving the original passing/defective journeys.
- Added **Load Build Week demo** plus a maximum-2:50 recording script and persisted-run fallback.
- Added exact-host/private-network controls, browser request interception, rate limits, same-origin/CSP policy, redaction and safe user errors.
- Verified the controlled fixture in both modes and the full mocked workflow: defective produces a high-confidence high-severity failure; passing produces a pass without a finding.
- Verified a fresh real-model matrix: defective 3/3 returned high-severity evidence-backed failures at 0.99 confidence; passing 3/3 returned pass with no finding.
- Completed Goal 2's controlled live export gate: one human-reviewed failed finding was exported once, the confirmed repeat returned the stored issue with `existing: true`, and no duplicate was created.
- Completed the first full real-OpenAI controlled evaluation: every expected classification matched, every failed finding was evidence-backed, all screenshots were present, and no run retried or navigated off-domain.
- Hardened the managed runner after validation exposed Next.js generated-file side effects: evaluation builds now use an isolated runtime TypeScript config and restore `next-env.d.ts` during shutdown.
- Re-ran the finished-tree gates: lint and strict types passed; 60 unit/service tests across 19 files passed; the exact production build passed; 16 combined Playwright stories passed in 18.5s; and the production dependency audit reports 0 vulnerabilities.

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

## Controlled ten-case evaluation record

Real OpenAI run on 2026-07-20 with `gpt-5.6-terra`. This is a controlled fixture evaluation, not a production benchmark.

| Case | Expected | Actual | Run ID | Duration | Actions | Screenshots | Tokens |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| SS-EVAL-01 | pass | pass | `0d661c93-c303-4193-9a34-d0908b8fca83` | 5.258s | 1 | 1 | 5,806 |
| SS-EVAL-02 | pass | pass | `437b8185-89cb-40e6-9269-9d88bda5a483` | 16.872s | 7 | 7 | 37,192 |
| SS-EVAL-03 | pass | pass | `5cfaa796-f1cb-4dce-80f7-603f5d9b838d` | 18.228s | 8 | 8 | 44,584 |
| SS-EVAL-04 | pass | pass | `c1046b6b-a1f5-4ced-b668-1b1edcc74806` | 29.715s | 13 | 13 | 71,125 |
| SS-EVAL-05 | pass | pass | `1bae7e3b-0779-41f9-af11-5513ce94d369` | 35.886s | 24 | 24 | 94,988 |
| SS-EVAL-06 | fail/high | fail/high | `56151b6b-60dd-403f-9024-a6af9085f6ae` | 44.329s | 24 | 24 | 98,902 |
| SS-EVAL-07 | fail/high | fail/high | `7727e084-ff90-4f50-86f2-4c02e7b5edc4` | 33.969s | 11 | 11 | 62,292 |
| SS-EVAL-08 | fail/high | fail/high | `8763d114-6ee3-49d7-a2f6-8a7573f9404d` | 45.046s | 25 | 25 | 103,099 |
| SS-EVAL-09 | blocked | blocked | `15329ad6-8351-4547-8ab1-278dda108aca` | 18.431s | 9 | 9 | 46,690 |
| SS-EVAL-10 | inconclusive | inconclusive | `195df2f3-8ce5-4ea9-978b-928fe12f4cea` | 5.540s | 1 | 1 | 6,063 |

Metrics: clear failures 3/3; passing false failures 0/5; blocked 1/1; ambiguous 1/1; evidence-backed failed findings 3/3; off-domain navigation 0; runs with missing screenshots 0; 253.274s total and 24.073s median duration; 123 total and 10 median actions; 0 retries. Token totals were planner 10,273, executor 322,923, evaluator 237,545, all phases 570,741.

The local JSON artifact is `data/evaluation-results-2026-07-20T16-39-34-803Z.json`; the tracked human-readable record is `docs/EVALUATION_REPORT.md`. The three cited failed-finding screenshots were visually checked after automated action/file mapping.

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

## Railway public-demo deployment

- Added a multi-stage Docker build that pins Node 24 and the official Playwright `v1.61.1-noble` image to the exact installed dependency, emits the standalone Next.js runtime, defaults to `pwuser`, and uses `tini` for signal forwarding and child-process reaping.
- Added Railway config-as-code for Dockerfile builds, `/api/health`, bounded restart behavior and a 30-second SIGTERM drain.
- Added a lightweight health endpoint that verifies the SQLite parent and screenshot directories are writable without calling OpenAI, opening SQLite or launching Chromium.
- Added `SPECSENTRY_PUBLIC_DEMO=true`: only the exact Sentry Shop fixture on `PUBLIC_APP_URL` can pass plan, run and browser-network enforcement; plan/run budgets are stricter; only one run may be active; external origins and paths are rejected safely.
- GitHub preview remains available when deliberately configured, but GitHub issue creation is blocked in both the route and export service while public-demo mode is enabled.
- Active runs close browser resources and retain an interrupted partial report on SIGTERM. Existing SQLite initialization remains additive (`CREATE TABLE IF NOT EXISTS` plus in-place column migration) and performs no destructive startup action.
- SQLite, WAL files and screenshots use `SPECSENTRY_DATA_DIR=/app/data`. The Railway volume must mount at `/app/data`; because Railway mounts it as root, production must set `RAILWAY_RUN_UID=0`. The image remains non-root by default elsewhere.
- Final Railway URL: [https://specsentry-production.up.railway.app](https://specsentry-production.up.railway.app).
- Railway project `authentic-comfort` has one `specsentry` service connected to `Cliffinkent/specsentry` `main`, with GitHub auto-deploy enabled and one volume mounted at `/app/data`.
- Production home and `/api/health` returned HTTP 200; health reported writable storage and `public-demo` mode without starting Chromium or calling OpenAI.
- Live production run `0fc601eb-d273-4c70-af47-b77fac2ba99e` completed in 35.8 seconds with 24 recorded actions and 24 screenshots. It produced the expected failed/high finding at 99% confidence and stopped at order review before payment.
- The finding was human-approved, and the exact GitHub issue preview rendered with an absolute report URL and public evidence URL. Public-demo mode explicitly reported issue creation disabled; the configured repository issue count remained `1` before and after preview.
- A controlled Railway redeploy completed successfully. The same run, approved review state and 1440 x 900 selected evidence remained publicly readable afterwards.
- An external `https://example.com/` staging target was rejected with a safe client error. Runtime logs contained neither configured secret, `/app/data`, raw-model markers nor application errors, and the post-run container process list contained only `tini`, `next-server` and the temporary console shell/`ps` command—no Chromium process.
- Local deployment gate: lint and strict types passed; 68 unit/service tests across 22 files passed; the production build passed; 16 combined Playwright stories passed; and `npm audit --omit=dev` reported 0 vulnerabilities.
- Local Docker gate: the pinned image built successfully; runtime UID was `1001 (pwuser)` with Node `v24.18.0` and Playwright `1.61.1`; home, health and persisted-runs APIs returned 200; external staging input returned 400 before OpenAI; a direct Chromium launch closed cleanly; and the process list returned to only `tini` plus `next-server`.
- Mounted-volume restart gate: the same `/app/data` bind mount retained the SQLite/WAL files across a controlled container restart; the run API and health route remained 200; `PRAGMA integrity_check` returned `ok`; and all three expected tables were present.

## Goal 3 completion and residual risk

- Goals 1–3 are functionally complete: browser evidence, human review/export, the controlled ten-case evaluation, and the demo path are implemented. Any future issue remains a new external write requiring a fresh preview and separate explicit confirmation.
- The disposable `specsentry-export-demo` repository is only the issue-export target. It is not a source-code repository, and no source-code Git remote is configured.
- The temporary Cloudflare Tunnel is not a deployment or backup mechanism.
- Model output is probabilistic; the ten deterministic cases are not statistical accuracy evidence. The fixture is intentionally Chromium-only and restricted to the single approved host.
- Railway persistence is intentionally limited to one service and one `/app/data` volume. The controlled redeploy proof covers the demonstrated report and screenshots, not multi-region or disaster-recovery guarantees.

## Next recommended milestone

Complete the external Build Week submission form using the published repository, stable Railway demo, submitted video and supporting media. No remaining repository or deployment blocker is known.
