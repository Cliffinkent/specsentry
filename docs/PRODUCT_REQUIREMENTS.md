# SpecSentry Product Requirements

Version: Build Week submission

Status: Implemented MVP

Last updated: 21 July 2026

This document records the original product scope. The README and STATUS.md describe the final implementation and any deliberate changes.

Target: OpenAI Build Week  
Track: Developer Tools  
Working tagline: Acceptance criteria in. Evidence-backed bugs out.

## 1. Product summary

**Scope status: Implemented**

SpecSentry is an AI QA agent that tests staging websites against written acceptance criteria.

A developer or product manager provides:

- A staging URL

- A user story or feature description

- Acceptance criteria written in plain English or Gherkin

SpecSentry turns those requirements into a test plan, runs the journey in an isolated browser, evaluates what happened, and produces a structured QA report with screenshots, reproduction steps, severity, confidence and supporting evidence.

Failed findings can be reviewed and edited by a human. An approved finding can be previewed as an exact GitHub issue and, outside public demo mode, exported only after a separate explicit confirmation. The hosted public demo deliberately disables issue creation.

## 2. Problem

**Scope status: Implemented**

Small software teams often have acceptance criteria but lack the time or people to test every release properly.

Current options have clear gaps:

- Manual testing is slow and often left until late.

- Scripted browser tests require engineering work and break when interfaces change.

- Screenshot comparison tools detect visual changes without understanding whether the intended user outcome still works.

- General browser agents can interact with websites but do not produce disciplined, evidence-backed QA reports.

The result is a gap between what the product was meant to do and what was actually shipped.

## 3. Product vision

**Scope status: Implemented**

SpecSentry acts as the first QA pass before a human reviews a release.

It should answer three questions:

1. Did the tested journey satisfy the acceptance criteria?

1. Where did actual behaviour differ from expected behaviour?

1. Is there enough evidence for a developer to reproduce the problem?

SpecSentry does not replace human QA. It removes repetitive exploratory work and gives the reviewer a stronger starting point.

## 4. Build Week fit

**Scope status: Implemented**

SpecSentry fits the Developer Tools track, which includes testing, DevOps, security and agentic workflows. Build Week judges score technological implementation, design, potential impact and quality of the idea. The submission also requires a working project, repository, README, public demo video under three minutes and a Codex /feedback session ID.

The submitted product follows a clear sub-three-minute demonstration:

1. Paste an acceptance criterion.

1. Watch SpecSentry test the staging site.

1. See it identify a seeded defect.

1. Review the screenshot and reproduction steps.

1. Preview the exact GitHub issue and show that public demo mode blocks creation.

## 5. Goals

**Scope status: Implemented**

The implemented scope is the controlled Build Week fixture described below.

### Primary goals

- Convert plain-English acceptance criteria into an executable browser test plan.

- Run a defined user journey without hand-written automation.

- Compare observed behaviour with the intended outcome.

- Produce findings backed by screenshots and step history.

- Let a human approve a finding before creating a GitHub issue.

- Deliver a polished, understandable demonstration.

### Hackathon success measures

**Scope status: Implemented**

The complete live evaluation achieved the expected classification for every seeded case:

- 5/5 expected passes

- 3/3 seeded failures

- 1/1 blocked case

- 1/1 inconclusive case

- 0 false failures

- 0 retries

- 0 missing screenshots

- 0 off-domain navigation

See the [controlled evaluation report](EVALUATION_REPORT.md) for the method, run identifiers, evidence integrity checks and case-level results. This was a controlled fixture evaluation and is not a production-grade benchmark or a statistical accuracy claim for arbitrary websites.

## 6. Non-goals

**Scope status: Deliberately limited for Build Week**

The submitted Build Week version does not:

- Test arbitrary production or public websites. The hosted demo accepts only Sentry Shop; self-hosted deployments accept only explicitly approved staging domains.

- perform purchases, account deletion or destructive actions.

- Support mobile browsers or cross-browser test matrices. Execution is Chromium-only.

- Replace existing CI test suites.

- Generate or merge code fixes.

- Support Jira, Linear or multiple issue trackers.

- Manage authentication, enterprise authentication or single sign-on.

- Run unattended against unrestricted domains.

- Allow unrestricted GitHub writes. Public demo mode disables issue creation, and self-hosted export is repository-allow-listed, human-reviewed, previewed and separately confirmed.

- Provide production-scale multi-tenant storage. The submitted deployment uses one SQLite database and screenshot tree on one Railway volume.

- Crawl an entire application looking for unspecified defects.

- Guarantee that a finding is a real defect without human review.

Trying to add these would weaken reliability and leave less time for the core experience.

## 7. Target users

**Scope status: Implemented**

### Primary persona: product-led engineering team

A startup or small product team shipping web features several times each week.

Characteristics:

- Has staging environments.

- Uses user stories and acceptance criteria.

- Has limited dedicated QA capacity.

- Uses GitHub for development work.

- Needs fast feedback before release.

### Secondary persona: agency delivery team

An agency delivering web projects for clients.

Characteristics:

- Tests repeated client journeys.

- Needs screenshots and a defensible test record.

- Wants clear defects that can be passed to developers.

- Often works against fixed acceptance criteria.

### Initial user

The first user should be a product manager, delivery manager or developer who understands the intended behaviour but does not want to write Playwright tests.

## 8. Core user journey

**Scope status: Implemented**

The public-demo export boundary is a deliberate Build Week limitation.

### Step 1: Create a project

For the Build Week workflow, the user enters:

- Staging URL

- Allowed domain

- User story

- Acceptance criterion

- Optional starting instructions

The staging URL hostname must exactly match the allowed hostname. In the hosted demo, the URL must also be the Sentry Shop fixture on the deployed public origin. User-managed project records, test credentials and repository selection are deferred; GitHub configuration remains server-only.

### Step 2: Supply the specification

The user pastes:

- A user story

- One acceptance criterion

- Optional starting instructions

Multi-criterion specification management is deferred; the submitted workflow executes one approved criterion per run.

Example:

> As a guest shopper, I need to see delivery charges before entering payment details so that I understand the full cost before buying.

Acceptance criteria:

> Given that I have an item in my basket, when I reach the order review page, then the delivery charge and total cost must be visible before I continue to payment.

### Step 3: Review the proposed test plan

SpecSentry creates a structured plan containing:

- Test objective

- Preconditions

- Ordered browser actions

- Expected result for each checkpoint

- Evidence to capture

- Stop conditions

The user can approve or edit the plan before execution.

### Step 4: Run the test

SpecSentry opens the staging site in an isolated browser and executes the approved journey.

The interface shows:

- Current step

- Latest browser screenshot

- Actions performed

- Observations

- Elapsed time

- Stop control

### Step 5: Evaluate the result

After each meaningful checkpoint, SpecSentry compares:

- Expected behaviour

- Visible interface state

- Browser state

- Available page text

- Previous test steps

Each criterion receives one result:

- Pass

- Fail

- Blocked

- Inconclusive

### Step 6: Review findings

For each failed criterion, SpecSentry creates a draft finding containing:

- Title

- Summary

- Severity

- Confidence

- Expected result

- Actual result

- Reproduction steps

- Screenshot evidence

- Relevant acceptance criterion

- Last successful step

- Suggested next test

### Step 7: Export

The user reviews and edits the finding, then explicitly approves or rejects it. Approval itself never creates an issue.

For an approved failed finding, the server renders the exact GitHub issue title, Markdown body and evidence links. A separate checkbox and action are required before issue creation. The public demo stops after preview because issue creation is disabled at the service boundary.

No issue is created without both human approval and the separate explicit confirmation.

## 9. Functional requirements

**Scope status: Deliberately limited for Build Week**

Individual functional requirements record which parts were implemented or deferred.

### FR1: Project configuration

**Scope status: Deliberately limited for Build Week**

The submitted workflow captures the minimum project constraints needed for one approved run.

Required fields:

- Base staging URL

- Allowed domain

- User story

- Acceptance criterion

Optional fields:

- Starting instructions

**Deferred:** User-managed project records, test accounts and user-supplied GitHub credentials. OpenAI and GitHub configuration is supplied only through server-side environment variables. The public demo exposes no credential input and cannot create GitHub issues.

### FR2: Specification input

**Scope status: Deliberately limited for Build Week**

The system must accept:

- Plain text

- Markdown

- Gherkin-style criteria

The MVP supports pasted text, including Markdown and Gherkin-style criteria.

**Deferred:** File upload.

PDF, DOCX, Jira and product-management integrations remain stretch work.

### FR3: Test-plan generation

**Scope status: Implemented**

GPT-5.6 Terra uses the OpenAI Responses API to turn the supplied specification into a structured test-plan schema. Planner output is validated with Zod and receives one controlled retry when structured output is invalid.

Each test step must include:

- Unique step ID

- Instruction

- Expected visible result

- Checkpoint flag

- Maximum retry count

- Failure stop rule

- Evidence requirement

The generated plan must be shown to the user before execution.

### FR4: Browser execution

**Scope status: Implemented**

The test runner must:

- Launch an isolated Chromium browser.

- Restrict navigation to the project’s allowed domain.

- Start at the configured staging URL.

- Execute browser actions requested through the OpenAI computer-use loop.

- Capture screenshots after checkpoints and errors.

- Record action history.

- Stop after the configured time or action limit.

- Allow the user to stop the run manually.

The executor uses OpenAI computer use for the screenshot/action loop and executes normalized actions only inside an isolated Playwright Chromium context.

### FR5: Evaluation

**Scope status: Implemented**

The evaluation phase must be separate from the execution phase.

The evaluator must receive:

- Original acceptance criterion

- Approved test plan

- Screenshots

- Browser observations

- Action history

- Any error messages

The evaluator must return a structured result rather than free-form prose.

This separation reduces the chance that the same model call invents evidence to support its earlier decisions.

### FR6: Structured findings

**Scope status: Implemented**

Findings must follow a strict JSON schema.

Suggested schema:

```json
{
  "criterionId": "AC-01",
  "status": "fail",
  "title": "Delivery charge is missing from order review",
  "severity": "high",
  "confidence": 0.92,
  "expectedResult": "Delivery charge and final total are visible",
  "actualResult": "Only the basket subtotal is displayed",
  "reproductionSteps": [
    "Open the shop",
    "Add the backpack to the basket",
    "Continue as a guest",
    "Open the order review page"
  ],
  "evidence": [
    {
      "type": "screenshot",
      "reference": "run-123-step-6.png",
      "description": "Order review page showing subtotal without delivery charge"
    }
  ],
  "suggestedNextTest": "Repeat with express delivery selected"
}
```

The evaluator's Structured Output is validated with Zod. Evidence references are accepted only when they map to non-empty screenshots recorded by the same run.

### FR7: Run report

**Scope status: Implemented**

The completed report must show:

- Overall run status

- Criteria passed, failed, blocked and inconclusive

- Duration

- Steps completed

- Screenshots

- Action timeline

- Findings

- Confidence levels

- Any system errors

The report must make model observations and captured evidence visibly distinct.

### FR8: GitHub issue export

**Scope status: Deliberately limited for Build Week**

The user must be able to:

- Edit the draft finding.

- Preview the issue.

- Create the GitHub issue.

- View the resulting issue URL.

Repository configuration is server-only and allow-listed. Human approval and issue preview are distinct from issue creation. Creation requires a fresh preview plus separate explicit confirmation, and remains idempotent after success. Public demo mode permits the exact preview but blocks issue creation in both the route and service layers.

### FR9: Run history

**Scope status: Implemented**

The application must retain recent demo runs.

Users must be able to reopen a run and inspect its report without rerunning the test.

SQLite persists runs, review state and normalized events. Local development writes below the configured data directory; Railway uses durable storage through its mounted volume at `/app/data`, including the SQLite/WAL files and screenshot tree.

### FR10: Controlled demo mode

**Scope status: Implemented**

The repository must include a small staging application with at least one seeded defect.

The core demonstration offers two modes:

- Passing build

- Defective build

This gives judges a repeatable way to see both outcomes and protects the demonstration against changes to third-party websites.

The controlled ten-case evaluation adds deterministic fixture modes for missing required-field validation, lost basket state and an unavailable dependency. Hosted plan and run APIs reject external staging URLs and accept only the exact Sentry Shop fixture paths on the public origin.

## 10. AI workflow

**Scope status: Implemented**

SpecSentry should use three phases rather than a collection of loosely defined agents.

### Phase A: Planner

**Scope status: Implemented**

Input:

- User story

- Acceptance criteria

- Project constraints

Output:

- Structured test plan

The planner cannot operate the browser.

### Phase B: Executor

**Scope status: Implemented**

Input:

- Approved test plan

- Current browser screenshot

- Previous action results

Output:

- Browser actions

- Step observations

- Requests for additional screenshots

The executor cannot declare a criterion passed or failed.

### Phase C: Evaluator

**Scope status: Implemented**

Input:

- Criterion

- Test plan

- Evidence package

- Recorded observations

Output:

- Structured criterion result

- Draft finding when applicable

The evaluator cannot operate the browser or create issues.

This split keeps responsibilities clear and makes failures easier to diagnose.

## 11. Technical architecture

**Scope status: Implemented**

### Front end

- Next.js

- TypeScript

- React

- Tailwind CSS

- Server-sent events for live run updates

### Application backend

- Next.js App Router server routes in the same Node.js application

- OpenAI SDK

- GitHub API client

- In-process bounded run orchestrator

- Zod schemas for validation

### Browser runner

- Playwright

- Chromium

- Isolated browser context

- Fixed 1440 × 900 viewport

- Domain and action allow lists

- Screenshot capture

- Action and network-event logging

### AI services

- GPT-5.6 Terra through the OpenAI Responses API

- Computer-use tool for browser interaction

- Structured Outputs for plans and findings

- Function calling for internal run controls and GitHub export

The Responses API supports stateful model interactions, computer use and external functions.

### Persistence

Implemented Build Week choice:

- SQLite behind `lib/repository.ts` for both local and hosted persistence

- Screenshot files below the configured data directory

- A Railway volume mounted at `/app/data` for durable SQLite/WAL files and screenshots

- No Supabase, hosted object storage or production-scale multi-tenant storage

### Deployment

- One Docker-based Railway service built from `main`

- Multi-stage Node 24 build

- Playwright `1.61.1` dependency matched by the official `mcr.microsoft.com/playwright:v1.61.1-noble` runtime image

- Standalone Next.js server launched through `tini`

- Health checks and bounded restart/drain configuration in `railway.json`

### System flow

```text
User
  |
Next.js dashboard
  |
Run orchestrator
  |-- Planner: Responses API structured plan
  |-- Executor: OpenAI computer use in Playwright Chromium
  |-- Evidence: normalized actions, observations and screenshots
  |-- Evaluator: separate Responses API evidence judgement
  `-- Human review: exact GitHub preview, then separate confirmation
```

## 12. Core data entities

**Scope status: Deliberately limited for Build Week**

The logical entities below remain the product model. The submitted MVP persists the approved project constraints, specification, plan, results and review state within SQLite run records rather than exposing a full normalized multi-project workspace.

### Project

- ID

- Name

- Base URL

- Allowed domains

- Created date

- GitHub configuration

### Specification

- ID

- Project ID

- User story

- Acceptance criteria

- Source type

- Created date

### Test plan

- ID

- Specification ID

- Status

- Preconditions

- Steps

- Approved date

### Test run

- ID

- Test plan ID

- Status

- Start time

- End time

- Browser-session reference

- Token usage

- Error details

### Step result

- ID

- Test run ID

- Test-step ID

- Action

- Observation

- Screenshot reference

- Status

- Timestamp

### Finding

- ID

- Test run ID

- Criterion ID

- Status

- Severity

- Confidence

- Expected result

- Actual result

- Evidence

- Human-review status

- GitHub issue URL

## 13. Safety and security requirements

**Scope status: Implemented**

Computer use must run inside an isolated browser or container.

The application must:

- Require the staging URL hostname to exactly equal the approved hostname.

- Limit self-hosted deployments to explicitly approved staging domains.

- In public demo mode, accept only the exact Sentry Shop fixture on the configured public origin and reject external staging URLs before any model or browser work.

- Block local file access.

- Avoid inheriting host environment variables.

- Block downloads unless explicitly enabled.

- Prevent navigation to third-party authentication providers.

- Abort browser requests and navigation outside the approved hostname; reject pop-ups, downloads and service workers.

- Set maximum action and runtime limits.

- Treat website content as untrusted input.

- Require human approval for authenticated, destructive or external write actions.

- Use test accounts with fake data.

- Redact passwords and tokens from logs.

- Keep cookies, authorization headers, raw model traces and environment values out of persisted diagnostics and client responses.

- Keep GitHub configuration server-only, enforce a repository allow list, and disable issue creation completely in public demo mode.

- Require a failed finding, human approval, a fresh exact preview and a separate explicit confirmation before any self-hosted GitHub write.

These controls follow OpenAI’s guidance to isolate computer-use sessions, restrict domains and actions, and keep people involved in high-impact actions.

## 14. User interface

**Scope status: Deliberately limited for Build Week**

The four conceptual screens are delivered as one responsive workflow rather than four separate routes.

The MVP requires four main screens.

### Dashboard

Displays:

- Recent runs

- Run status

- Pass and failure counts

- New test button

### New test

Contains:

- Staging URL

- User story

- Acceptance criteria

- Starting instructions

- Generate plan button

### Plan review

Displays:

- Preconditions

- Ordered steps

- Expected results

- Evidence checkpoints

- Edit, approve and cancel controls

### Live run and report

During execution:

- Browser screenshot

- Current step

- Action feed

- Progress

- Stop button

After execution:

- Result summary

- Criterion cards

- Evidence gallery

- Findings

- GitHub export control

The interface should present the test run as a product workflow, rather than exposing raw model traces.

## 15. Severity rules

**Scope status: Implemented**

### Critical

- Security or data-loss risk

- Destructive action occurs unexpectedly

- Core service becomes unusable

The hackathon demo should not attempt to discover critical defects.

### High

- Core acceptance criterion fails

- User cannot complete the primary journey

- Price, payment or required decision information is missing

### Medium

- Journey can be completed with incorrect or confusing behaviour

- Validation or feedback is missing

- Important state is lost

### Low

- Minor visual or wording issue

- Behaviour differs slightly without blocking the outcome

The evaluator may propose a severity, but the report must label it as an AI assessment until approved.

## 16. Performance and reliability requirements

**Scope status: Implemented**

- A test run must time out after five minutes by default.

- A run must stop after 40 browser actions.

- Each action may be retried no more than twice.

- Screenshots must be available in the final report.

- Partial reports must remain available after a failed run.

- Model outputs must be schema validated before storage.

- Invalid structured output must trigger one controlled retry.

- The browser must close after completion, cancellation or timeout.

- A failed GitHub export must not remove the local finding.

## 17. Demo application

**Scope status: Implemented**

Build a small fictional e-commerce staging site called Sentry Shop.

### Main journey

- Open product page.

- Add item to basket.

- Continue as guest.

- Enter delivery details.

- Open order review.

- Confirm that delivery charge and final total are visible.

### Seeded defect

On the defective build, the order-review page displays the basket subtotal but hides the delivery charge and final total until after the user continues towards payment.

This defect is:

- Easy to understand.

- Directly tied to the acceptance criterion.

- Visible in a screenshot.

- Safe to demonstrate.

- Serious enough to justify a high-severity finding.

The passing and defective versions must be switchable through a demo configuration setting.

## 18. MVP acceptance criteria

**Scope status: Implemented**

The acceptance criteria are met subject to the deliberate public-demo export boundary.

The MVP is complete when:

1. A user can define a staging URL with an exact allowed hostname.

1. A user can paste a story and acceptance criterion.

1. GPT-5.6 generates a valid structured test plan.

1. The user can review and approve that plan.

1. SpecSentry runs the approved journey in Chromium.

1. The live view shows browser screenshots and progress.

1. The run captures evidence at defined checkpoints.

1. The evaluator returns pass, fail, blocked or inconclusive.

1. The seeded defect produces an evidence-backed draft finding.

1. The passing build does not produce the same defect.

1. The user can edit and approve the finding.

1. The approved finding can render an exact GitHub issue preview; self-hosted creation requires separate explicit confirmation, while public demo mode blocks creation.

1. A judge can run the supplied demo using the README instructions.

1. The complete workflow can be demonstrated in under three minutes.

## 19. Stretch goals

**Scope status: Stretch goal**

Stretch work should begin only after the complete MVP workflow is stable.

Priority order:

1. Generate a reusable Playwright regression test from an approved finding.

1. Run desktop and mobile viewport checks.

1. Import specifications from GitHub issues.

1. Compare results between two application builds.

1. Add a GitHub Action for pull-request testing.

1. Suggest likely code areas linked to a finding.

1. Generate a draft fix in a separate branch.

Automatic code fixing is deliberately last. It adds risk and distracts from the stronger QA story.

None of these stretch goals are implied by the hosted demo. Mobile browsers, cross-browser testing, CI integration, automatic code fixes and new external trackers remain outside the submitted MVP.

## 20. Delivery plan

**Scope status: Implemented**

This section preserves the original Build Week sequencing. The final implementation and deployment state is recorded in the README and `STATUS.md`.

### Day 1: Foundation

- Create repository and application shell.

- Build Sentry Shop fixture application.

- Create project and test-run data models.

- Set up OpenAI and GitHub clients.

### Day 2: Planning

- Implement specification input.

- Define structured test-plan schema.

- Build planner prompt and validation.

- Add plan-review screen.

### Day 3: Browser runner

- Set up isolated Playwright session.

- Add computer-use action loop.

- Add domain restrictions and action limits.

- Stream screenshots and progress to the interface.

### Day 4: Evaluation and reporting

- Define result and finding schemas.

- Build evaluator.

- Create report screen.

- Add evidence gallery and error handling.

### Day 5: GitHub and product polish

- Add finding review.

- Add GitHub issue preview and creation.

- Improve loading, empty and failure states.

- Add demo reset controls.

### Day 6: Testing and submission

- Run seeded evaluations.

- Fix false positives.

- Write README and architecture notes.

- Prepare public demo instance.

- Record the sub-three-minute video.

- Capture the required Codex /feedback session ID.

- Complete the Devpost submission.

## 21. Evaluation set

**Scope status: Implemented**

The submitted evaluation uses exactly ten acceptance criteria against Sentry Shop:

- Five passing criteria

- Three clear failures

- One blocked journey

- One deliberately ambiguous criterion

Record:

- Expected result

- SpecSentry result

- Confidence

- Whether a useful finding was produced

- Whether the evidence supports the finding

- Whether a human reviewer agrees

The complete live run achieved 5/5 expected passes, 3/3 seeded failures, 1/1 blocked case and 1/1 inconclusive case, with 0 false failures, 0 retries, 0 missing screenshots and 0 off-domain navigation. See the [controlled evaluation report](EVALUATION_REPORT.md).

This was a controlled fixture evaluation and is not a production-grade benchmark. It does not establish performance on arbitrary websites, browsers, devices, authentication flows, production traffic or adversarial content.

## 22. Demo script

**Scope status: Implemented**

### 0:00–0:20

Explain the problem:

> Teams write acceptance criteria, but testing them still takes manual work. SpecSentry turns those criteria into evidence-backed browser tests.

### 0:20–0:40

Paste the delivery-charge acceptance criterion and generate the plan.

### 0:40–1:00

Show the structured steps and approve the plan.

### 1:00–1:40

Run the test and show the browser agent moving through the checkout journey.

### 1:40–2:10

Show the failed criterion, screenshot and reproduction steps.

### 2:10–2:30

Approve the finding, preview the exact GitHub issue and show that public demo mode disables creation.

### 2:30–2:50

Briefly show the architecture and explain how GPT-5.6, computer use, Structured Outputs and Codex were used.

### 2:50–3:00

Close with:

> SpecSentry gives small teams a first QA pass before release, using the requirements they already write.

## 23. Main risks

**Scope status: Implemented**

The mitigations are implemented; residual limits are documented below and in `STATUS.md`.

### Browser-agent reliability

Risk: The agent may click the wrong element or become stuck.

Response:

- Use a controlled staging site.

- Keep journeys short.

- Fix the browser resolution.

- Add retries and clear stop conditions.

- Record partial results.

### False positives

Risk: The evaluator may treat acceptable behaviour as a defect.

Response:

- Require evidence for every finding.

- Separate execution and evaluation.

- Include confidence.

- Keep human approval mandatory.

- Test against both passing and defective builds.

### Scope growth

Risk: Integrations and automatic fixes consume the remaining build time.

Response:

- Treat the MVP acceptance criteria as the hard cut.

- Support GitHub only.

- Support one browser.

- Use pasted specifications.

- Defer CI and code changes.

### Weak Codex story

Risk: The product works, but the submission fails to show meaningful Codex use.

Response:

- Build the core functionality in one traceable Codex session.

- Preserve key design and debugging decisions.

- Explain which components Codex created or changed.

- Include the required session ID.

- Document Codex’s contribution in the README.

## 24. Product decisions locked for the hackathon

**Scope status: Implemented**

- Developer Tools is the submission track.

- The product is a web application.

- Chromium is the only supported browser.

- GitHub is the only issue-tracker integration.

- Testing is limited to explicitly approved staging domains; the hosted public demo is further restricted to Sentry Shop and rejects external staging URLs.

- Findings require human approval.

- GitHub issue creation requires a separate explicit confirmation and is disabled in public demo mode.

- The demo uses a controlled fixture application.

- The executor and evaluator are separate phases.

- Automatic fixes are outside the MVP.

- A reliable end-to-end workflow takes priority over feature count.

## 25. Definition of done

**Scope status: Implemented**

This status covers the repository and hosted Build Week demo; external submission administration is not product behaviour.

SpecSentry is ready to submit when:

- The hosted demo works using supplied test data.

- The defective demo build produces the expected finding.

- The passing build produces a clean result.

- Every finding contains evidence.

- Exact GitHub preview works in the hosted demo; issue creation is deliberately disabled there. Self-hosted export remains human-approved, separately confirmed and repository-allow-listed.

- Security limits are active.

- Automated and manual tests pass.

- The repository contains setup, architecture and testing instructions.

- The README explains the roles of Codex and GPT-5.6.

- The submitted demonstration video is under three minutes.

- External submission fields can reference the repository, hosted demo, video and Codex session ID without changing product behaviour.
