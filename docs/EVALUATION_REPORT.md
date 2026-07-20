# SpecSentry Controlled Fixture Evaluation Report

Generated: 2026-07-20T16:39:34.803Z

## Evaluation method

SpecSentry executed 10 selected cases from the fixed ten-case catalog through the real OpenAI planner, computer executor, and evaluator. Each run used an isolated 1440 × 900 Chromium context, the exact approved localhost hostname, a five-minute and 40-action ceiling, and at most two retries per action. The runner persisted case and run identifiers, normalized results, per-phase token usage, actions, retries, and screenshot references. It then checked every evaluator evidence reference against persisted action records and checked every recorded screenshot file on disk.

- Model: `gpt-5.6-terra`
- Execution mode: `live`
- Fixture origin used during the run: `http://127.0.0.1:3130`
- Complete ten-case invocation: yes

**This is a controlled fixture evaluation rather than production-grade benchmarking.** Results describe only these ten deterministic cases and must not be generalized as a statistical accuracy claim.

## Ten-case catalog

| Case | Title | Fixture mode | Expected | User story | Acceptance criterion | Starting instructions | Expected visible evidence | Reason for classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SS-EVAL-01 | Product details are visible | passing | pass | As a shopper, I want to see the selected product's identity and price before I add it to my basket. | Given the product page is loaded, then Alpine Trail Backpack, Forest green, and £80.00 must be visible together before any basket action. | Inspect the loaded product page without interacting with it, capture the visible product details, and stop. | One product-page view containing Alpine Trail Backpack, Forest green, and £80.00. | The fixture renders the named product, selected colour, and price together on the initial page. |
| SS-EVAL-02 | Basket preserves the selected item | passing | pass | As a shopper, I want the product I selected to appear accurately in my basket before checkout. | Given Alpine Trail Backpack is visible, when I add it to the basket, then the basket must show Alpine Trail Backpack, Forest green, Quantity 1, and an £80.00 subtotal. | Add the Alpine Trail Backpack once, inspect the basket, and stop before continuing as a guest. | The basket view showing the selected backpack, Forest green, Quantity 1, and £80.00 subtotal. | The passing fixture carries the selected product, variant, quantity, and subtotal into the basket. |
| SS-EVAL-03 | Guest checkout is available | passing | pass | As a guest shopper, I want to begin checkout without creating or signing into an account. | Given one item is in the basket, when I choose Continue as guest, then the Delivery details form must be visible without a sign-in or account-creation requirement. | Add the backpack, continue as a guest, capture the Delivery details form, and stop without entering data. | The Delivery details heading and guest delivery form with no authentication prompt. | The fixture exposes the delivery form directly from the guest action and never displays an authentication gate. |
| SS-EVAL-04 | Empty required delivery details are rejected | passing | pass | As a shopper, I want clear required-field validation so that I know what delivery information must be supplied. | Given the Delivery details form is empty, when I select Review order, then I must remain on Delivery details and see the message 'Enter your full name.' | Reach Delivery details, leave every delivery field empty, select Review order once, capture the validation result, and stop. | The Delivery details page remains visible with the inline message Enter your full name. | The passing fixture performs deterministic application-level validation and keeps an incomplete order on the form. |
| SS-EVAL-05 | Review shows delivery charge and final total | passing | pass | As a guest shopper, I want the complete payable amount before moving towards payment. | Given valid delivery details have been entered, when I reach Order review, then Basket subtotal £80.00, Delivery charge £4.95, and Final total £84.95 must be visible before payment. | Use the Alpine Trail Backpack and deterministic demo delivery details. Stop on Order review and never continue towards payment. | The Order review cost summary showing £80.00 subtotal, £4.95 delivery, and £84.95 final total. | The passing fixture calculates and labels every required cost line before the payment boundary. |
| SS-EVAL-06 | Delivery charge and total are absent | defective | fail / high | As a guest shopper, I need to see delivery charges before payment so that I understand the full cost before buying. | Given valid delivery details have been entered, when I reach Order review, then the delivery charge and final total must be visible before I continue towards payment. | Use the Alpine Trail Backpack and deterministic demo delivery details. Stop on Order review and never continue towards payment. | Order review shows only the £80.00 basket subtotal and says additional costs appear on the next step. | The defective fixture deliberately withholds required decision information until after the review boundary. |
| SS-EVAL-07 | Required delivery validation is missing | validation-missing | fail / high | As a shopper, I need checkout to reject missing delivery details before an order can reach review. | Given the Delivery details form is empty, when I select Review order, then checkout must keep me on Delivery details and identify the first required field instead of accepting the order. | Reach Delivery details, leave every delivery field empty, select Review order once, and capture the resulting page. | Order review becomes visible with a warning that delivery details were accepted while required fields were empty. | The seeded fixture bypasses all required-field validation and advances an incomplete delivery record to review. |
| SS-EVAL-08 | Selected product is lost before review | basket-lost | fail / high | As a shopper, I need my selected product to remain in the basket throughout checkout. | Given Alpine Trail Backpack was added to the basket, when I reach Order review, then Alpine Trail Backpack and Quantity 1 must still be present in the order summary. | Add the backpack, continue as a guest, use deterministic demo delivery details, and stop on Order review. | Order review says the basket is empty and the selected Alpine Trail Backpack is absent. | The seeded fixture deliberately drops the selected product only when the shopper reaches review. |
| SS-EVAL-09 | Delivery quote prerequisite is unavailable | dependency-unavailable | blocked | As a QA tester, I need the delivery quote sandbox available before I can validate the guest delivery journey. | Given the delivery quote sandbox is a defined prerequisite, when I continue as a guest, then delivery details can be evaluated only if that sandbox is available. | The delivery quote sandbox is deliberately unavailable in this fixture. Add the backpack, attempt Continue as guest once, record the prerequisite state, and stop. Do not treat the missing prerequisite itself as a product defect. | A Delivery quote sandbox unavailable page explicitly identifies a deliberately unavailable test dependency. | The defined external prerequisite cannot be completed, so no evidence exists to judge the downstream product behavior. |
| SS-EVAL-10 | Subjective checkout wording is inconclusive | passing | inconclusive | As a shopper, I want the checkout experience to feel straightforward. | The checkout should feel straightforward. | Do not invent a measurable definition of straightforward. Capture the initial shop state and stop so the criterion can be assessed for testability. | A stable product-page capture, without evidence that defines or measures straightforwardness. | The criterion supplies no observable threshold, task, completion condition, or measurable expected result. |

## Expected and actual results

| Case | Expected | Actual | Actual summary | Run ID | Actions / retries | Screenshots / integrity | Match | Finding evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SS-EVAL-01 | pass | pass | The loaded product page visibly shows “Alpine Trail Backpack,” “£80.00,” and “Forest green” together before any basket interaction. | 0d661c93-c303-4193-9a34-d0908b8fca83 | 1 / 0 | 1 / files present | yes | — |
| SS-EVAL-02 | pass | pass | After one add-to-basket action, the basket visibly shows Alpine Trail Backpack, Forest green, Quantity 1, and a £80.00 basket subtotal. The flow stopped at the basket without selecting Continue as Guest. | 437b8185-89cb-40e6-9269-9d88bda5a483 | 7 / 0 | 7 / files present | yes | — |
| SS-EVAL-03 | pass | pass | With one Alpine Trail Backpack in the basket (quantity 1), selecting Continue as guest displayed the Delivery details form. The captured form is directly accessible and shows no sign-in or account-creation requirement. | 5cfaa796-f1cb-4dce-80f7-603f5d9b838d | 8 / 0 | 8 / files present | yes | — |
| SS-EVAL-04 | pass | pass | With all delivery fields empty, selecting Review order once kept the shopper on Delivery details and displayed the exact message “Enter your full name.” | c1046b6b-a1f5-4ced-b668-1b1edcc74806 | 13 / 0 | 13 / files present | yes | — |
| SS-EVAL-05 | pass | pass | Order review is visibly shown before payment, with Basket subtotal £80.00, Delivery charge £4.95, and Final total £84.95. The visible control is “CONTINUE TOWARDS PAYMENT,” and no payment action was recorded after reaching the review page. | 1bae7e3b-0779-41f9-af11-5513ce94d369 | 24 / 0 | 24 / files present | yes | — |
| SS-EVAL-06 | fail / high | fail / high | On the visible Order review page, neither a delivery-charge line nor a final-total line is displayed before the available “CONTINUE TOWARDS PAYMENT” action. Instead, the page states that additional costs are shown on the next step. | 56151b6b-60dd-403f-9024-a6af9085f6ae | 24 / 0 | 24 / files present | yes | `56151b6b-60dd-403f-9024-a6af9085f6ae/025-4-click.png`<br>`56151b6b-60dd-403f-9024-a6af9085f6ae/029-5-checkpoint.png` |
| SS-EVAL-07 | fail / high | fail / high | With every visible delivery field blank, selecting Review order once advanced checkout to Order review rather than keeping the shopper on Delivery details and identifying the first required field. | 7727e084-ff90-4f50-86f2-4c02e7b5edc4 | 11 / 0 | 11 / files present | yes | `7727e084-ff90-4f50-86f2-4c02e7b5edc4/010-2-checkpoint.png`<br>`7727e084-ff90-4f50-86f2-4c02e7b5edc4/013-3-click.png`<br>`7727e084-ff90-4f50-86f2-4c02e7b5edc4/014-3-checkpoint.png` |
| SS-EVAL-08 | fail / high | fail / high | Alpine Trail Backpack was present in the basket with Quantity 1 before checkout, but the Order review page displayed an empty basket and stated that the selected product was no longer present. | 8763d114-6ee3-49d7-a2f6-8a7573f9404d | 25 / 0 | 25 / files present | yes | `8763d114-6ee3-49d7-a2f6-8a7573f9404d/007-2-checkpoint.png`<br>`8763d114-6ee3-49d7-a2f6-8a7573f9404d/029-5-checkpoint.png`<br>`8763d114-6ee3-49d7-a2f6-8a7573f9404d/031-6-checkpoint.png` |
| SS-EVAL-09 | blocked | blocked | Blocked: after one guest-continuation attempt, the UI displayed “Delivery quote sandbox unavailable” and stated that guest delivery cannot be evaluated until the defined prerequisite is restored. The required sandbox was deliberately unavailable, so delivery details could not be judged. No product defect is asserted by this fixture state. | 15329ad6-8351-4547-8ab1-278dda108aca | 9 / 0 | 9 / files present | yes | — |
| SS-EVAL-10 | inconclusive | inconclusive | The criterion cannot be assessed because “straightforward” has no defined, observable, or measurable acceptance standard. The captured initial shop state shows a product page with an Add to Basket action, but no checkout interaction was performed, as required by the approved plan. | 195df2f3-8ce5-4ea9-978b-928fe12f4cea | 1 / 0 | 1 / files present | yes | — |

## Metrics

- Clear-failure detection: 3/3
- Passing-case false failures: 0/5 (target 0)
- Blocked classification: 1/1
- Ambiguous classification: 1/1
- Evidence-backed failed findings: 3/3
- Unexpected off-domain navigation: 0 (target 0)
- Runs with missing screenshots: 0 (target 0)
- Duration: 253.3s total, 24.1s median
- Actions: 123 total, 10 median
- Retries: 0

## Token usage by phase and case

| Case | Planner | Executor | Evaluator | Total |
| --- | ---: | ---: | ---: | ---: |
| SS-EVAL-01 | 596 | 2619 | 2591 | 5806 |
| SS-EVAL-02 | 890 | 22364 | 13938 | 37192 |
| SS-EVAL-03 | 824 | 28092 | 15668 | 44584 |
| SS-EVAL-04 | 1030 | 45155 | 24940 | 71125 |
| SS-EVAL-05 | 1442 | 48258 | 45288 | 94988 |
| SS-EVAL-06 | 1636 | 51809 | 45457 | 98902 |
| SS-EVAL-07 | 940 | 39805 | 21547 | 62292 |
| SS-EVAL-08 | 1328 | 54072 | 47699 | 103099 |
| SS-EVAL-09 | 1022 | 28000 | 17668 | 46690 |
| SS-EVAL-10 | 565 | 2749 | 2749 | 6063 |
| **All cases** | **10273** | **322923** | **237545** | **570741** |

Token counts come from the API response usage fields and are not converted into an estimated cost.

## Failures found and fixes made

The first complete live invocation produced all ten expected classifications, so no expected result was weakened and no case required a corrective rerun.

Two pre-live runner defects were found and fixed before the live set:

- **Evaluation orchestration:** the first selected mocked invocation could not start because an unrelated existing Next.js development server owned the default `.next` lock. No case or run ID was created. The runner now assigns every managed server an isolated Next.js distribution directory, shuts it down in `finally`, and was regressed with both selected-case and complete mocked invocations.
- **Missing-key diagnostic:** the first suppressed-key check exited non-zero as intended, but generic redaction obscured the non-secret `OPENAI_API_KEY` variable name. The runner now preserves that exact setup message while continuing to redact actual credential values. Unit coverage and a real suppressed-environment command confirm the clear exit-1 result.

Two generated-file isolation defects surfaced during the final validation rather than during a case result:

- **Repository TypeScript configuration:** isolated Next.js distribution directories were still appended to the repository `tsconfig.json`, and an interrupted generated validator then broke typecheck. The managed server now uses a runtime-local extending TypeScript config, the repository excludes evaluation build/data directories, and a selected mocked run followed by typecheck proved no new paths were appended.
- **Generated Next environment reference:** Next.js rewrote `next-env.d.ts` to point at each custom distribution directory. The managed runner now snapshots that exact file before launch and restores it after graceful or forced shutdown. Two unit tests cover existing and initially absent files; an end-to-end managed run left both `next-env.d.ts` and `tsconfig.json` unchanged.

The three live failed findings were also visually checked after the automated action/file integrity checks. Their cited screenshots visibly show the missing cost lines, accepted empty delivery data, and lost basket state respectively.

## Limits of the evaluation

- The catalog is exactly five expected passes, three clear expected failures, one blocked prerequisite, and one deliberately ambiguous criterion.
- All behavior is seeded in Sentry Shop and executed in one Chromium viewport; this does not cover production traffic, browsers, devices, authentication, external dependencies, or adversarial sites.
- Model behavior remains probabilistic even though the fixture and safety limits are deterministic.
- A passing controlled result does not prove the absence of other defects.
- GitHub issue creation was not part of this evaluation. Failed findings remained local unless a person separately reviews, previews, and explicitly confirms an export.
