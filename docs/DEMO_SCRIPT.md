# SpecSentry Build Week Video Plan

Target cut: **2 minutes 40 seconds**. Hard maximum: **2 minutes 50 seconds**. The recording uses real SpecSentry screen capture with synthetic ElevenLabs narration because the creator is on holiday. It requires no webcam footage, recorded creator voice, or AI-generated recreation of the interface.

Primary narration: **255 words**. Persisted-run version: **265 words**. Both remain below the 360-word limit.

## Production setup

- Record the real application at 1440 × 900. Crop browser chrome, notifications, bookmarks, terminal windows, credentials, cookies, and request details.
- Prepare one fresh defective run and one persisted defective fallback run. Neither may already be exported.
- Use a neutral ElevenLabs British voice at a natural pace. Read **SpecSentry** as “Speck Sentry” and **GPT-5.6 Terra** as “G P T five point six Terra”. Punctuation supplies the pauses; leave one short beat before the final line.
- Use clean cuts and restrained captions. Use no music, or only music explicitly cleared for public reuse. Do not add unnecessary product logos or third-party branding.
- Never select **Confirm and create one GitHub issue**. The recording ends at preview.

## Timed recording plan

| Time | Exact on-screen action | Expected visible state | ElevenLabs narration | Editing instruction |
| --- | --- | --- | --- | --- |
| 0:00–0:08 | Open SpecSentry and select **Load Build Week demo**. | The new-test form fills immediately. | “Acceptance criteria are easy to write, but proving them in a real browser is slow. SpecSentry turns one requirement into an evidence-backed test.” | Start on the product wordmark, then move straight to the button. |
| 0:08–0:20 | Hold on the prefilled form. Point to **Staging URL**, **Allowed hostname**, and **Acceptance criterion**. | The defective Sentry Shop URL, exact hostname, delivery-charge criterion, and stop instruction are legible. | “The Build Week demo fills the staging URL, the exact allowed hostname, and the checkout criterion. Nothing is typed by hand.” | Use three subtle callouts; hide the pointer between them. |
| 0:20–0:34 | Select **Generate test plan**. | The completed structured plan replaces the loading state. | “GPT-5.6 Terra first acts as the planner. It returns a structured journey, separate from browser control and final judgement.” | Cut out the API wait. Show the click and completed plan as distinct states. |
| 0:34–0:46 | Scroll through a plan step and point to its checkpoint, evidence requirement, retry limit, and stop rule. | The controls are all visible before approval. | “Every step has an expected visible result, an evidence checkpoint, a retry limit, and a stop rule. I can edit these before approval.” | Hold long enough for labels to be read; do not scroll rapidly. |
| 0:46–0:54 | Select **Approve plan & start run**. | The run page opens and shows an active isolated browser session. | “I approve the plan, and SpecSentry opens an isolated browser.” | Keep the approval click and new run state in one continuous shot. |
| 0:54–1:16 | Show selected live actions: add the backpack, continue as guest, enter delivery details, and open review. Briefly show the action feed and two captured screenshots. | Only the approved hostname is visited; actions and screenshot references accumulate. | “Terra now acts only as the executor. It clicks, types, and records screenshots inside the approved host. It cannot decide pass or fail. That responsibility is deliberately separated.” | Use real screen recordings. Keep the first action and one checkout transition; remove the remaining wait between completed actions. |
| 1:16–1:23 | Cut from the last live checkpoint to the completed report. | **Run report** is complete with a failed criterion. | “I cut past the waiting time to the completed report.” | Use a simple hard cut. Leave the completed status visible for one beat. |
| 1:23–1:35 | Open the failed result and its order-review screenshot. Point to the subtotal and missing cost lines. | Basket subtotal is £80.00; delivery charge and final total are absent before payment. | “The order review shows the basket subtotal, but no delivery charge or final total before payment. The criterion therefore fails.” | Zoom only enough to make the cost summary readable. |
| 1:35–1:48 | Show the criterion-to-evidence trace and select each evidence reference. | The third Terra phase is labelled as evaluation; references map to recorded actions and screenshots. | “A third Terra phase evaluates only the recorded actions, observations, and screenshots. The trace links the criterion to the exact evidence used.” | Match each callout to the corresponding screenshot; avoid decorative overlays. |
| 1:48–2:05 | Open **Human finding review**. Point first to the immutable AI original, then edit one harmless phrase in the human working copy. | The AI original remains unchanged while the current review is editable; evidence is read-only. | “The AI original remains immutable. A human can edit the working copy, but cannot replace captured evidence. Codex built this workflow, wrote the tests, and helped debug browser and evidence failures.” | Make the edit visible but brief. Do not imply Codex participates in the live judgement. |
| 2:05–2:13 | Select **Approve finding**. | Review state changes to approved; no external issue exists. | “I approve the reviewed finding. Approval still creates nothing outside SpecSentry.” | Hold the approved badge for one beat. |
| 2:13–2:33 | Select **Preview exact GitHub issue**. Scroll through the exact title, reproduction steps, actual result, and evidence links. | A read-only server-rendered preview appears with the separate confirmation control still unchecked. | “Now the server renders the exact GitHub issue: title, reproduction steps, result, and evidence links. The finding exists because evidence was captured and a human approved it.” | Cut the preview network wait. Keep repository details and secrets out of frame where they are not required. |
| 2:33–2:40 | Point to the unchecked confirmation, move the pointer away, and stop. | **Confirm and create one GitHub issue** remains unselected; no success state or issue URL appears. | “Issue creation needs one more explicit confirmation. I stop here.” | Leave a short silent beat, then fade to the SpecSentry title card. |

## Persisted-run fallback

If the live model or network is slow, stop after the approved run begins. From **Recent persisted runs**, open the prepared failed run and keep its run ID visible. Replace the narration at 0:54–1:23 with:

> “The live service is slow, so I am showing persisted evidence from an earlier run of the same controlled fixture. The run ID remains visible. Terra recorded these browser actions and screenshots, but could not decide pass or fail. The separate evaluator judged only this captured evidence.”

Resume the plan at 1:23. Do not describe persisted evidence as live or as part of the newly started run. If the prepared finding is already approved, say so and move directly to preview. If it is exported, use a different run because completed exports are intentionally locked.

## YouTube description draft

SpecSentry turns a written acceptance criterion into an approved browser journey, captured evidence, and a human-reviewed finding.

Built for OpenAI Build Week. Codex helped design, implement, test, and debug the application. GPT-5.6 Terra performs the separate planning, browser execution, and evidence evaluation phases.

The published results come from a controlled ten-case Sentry Shop fixture evaluation, not production-grade benchmarking. Narration in this video is AI-generated using ElevenLabs.

- Repository: **[REPOSITORY LINK]**
- Live demo: **[DEMO LINK]**
