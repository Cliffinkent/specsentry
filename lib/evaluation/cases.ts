import { z } from "zod";
import { demoModeSchema, newTestInputSchema, type NewTestInput } from "@/lib/schemas";

export const expectedEvaluationStatusSchema = z.enum(["pass", "fail", "blocked", "inconclusive"]);

export const evaluationCaseSchema = z
  .object({
    id: z.string().regex(/^SS-EVAL-\d{2}$/),
    title: z.string().trim().min(1).max(160),
    userStory: z.string().trim().min(10).max(2_000),
    acceptanceCriterion: z.string().trim().min(10).max(2_000),
    fixtureMode: demoModeSchema,
    startingInstructions: z.string().trim().min(1).max(2_000),
    expectedStatus: expectedEvaluationStatusSchema,
    expectedSeverity: z.enum(["critical", "high", "medium", "low"]).nullable(),
    expectedVisibleEvidence: z.string().trim().min(1).max(2_000),
    expectedReason: z.string().trim().min(1).max(2_000),
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.expectedStatus === "fail" && entry.expectedSeverity === null) {
      context.addIssue({ code: "custom", path: ["expectedSeverity"], message: "Failed cases require an expected severity." });
    }
    if (entry.expectedStatus !== "fail" && entry.expectedSeverity !== null) {
      context.addIssue({ code: "custom", path: ["expectedSeverity"], message: "Only failed cases may define an expected severity." });
    }
  });

export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;

export const evaluationCases = evaluationCaseSchema.array().length(10).parse([
  {
    id: "SS-EVAL-01",
    title: "Product details are visible",
    userStory: "As a shopper, I want to see the selected product's identity and price before I add it to my basket.",
    acceptanceCriterion: "Given the product page is loaded, then Alpine Trail Backpack, Forest green, and £80.00 must be visible together before any basket action.",
    fixtureMode: "passing",
    startingInstructions: "Inspect the loaded product page without interacting with it, capture the visible product details, and stop.",
    expectedStatus: "pass",
    expectedSeverity: null,
    expectedVisibleEvidence: "One product-page view containing Alpine Trail Backpack, Forest green, and £80.00.",
    expectedReason: "The fixture renders the named product, selected colour, and price together on the initial page.",
  },
  {
    id: "SS-EVAL-02",
    title: "Basket preserves the selected item",
    userStory: "As a shopper, I want the product I selected to appear accurately in my basket before checkout.",
    acceptanceCriterion: "Given Alpine Trail Backpack is visible, when I add it to the basket, then the basket must show Alpine Trail Backpack, Forest green, Quantity 1, and an £80.00 subtotal.",
    fixtureMode: "passing",
    startingInstructions: "Add the Alpine Trail Backpack once, inspect the basket, and stop before continuing as a guest.",
    expectedStatus: "pass",
    expectedSeverity: null,
    expectedVisibleEvidence: "The basket view showing the selected backpack, Forest green, Quantity 1, and £80.00 subtotal.",
    expectedReason: "The passing fixture carries the selected product, variant, quantity, and subtotal into the basket.",
  },
  {
    id: "SS-EVAL-03",
    title: "Guest checkout is available",
    userStory: "As a guest shopper, I want to begin checkout without creating or signing into an account.",
    acceptanceCriterion: "Given one item is in the basket, when I choose Continue as guest, then the Delivery details form must be visible without a sign-in or account-creation requirement.",
    fixtureMode: "passing",
    startingInstructions: "Add the backpack, continue as a guest, capture the Delivery details form, and stop without entering data.",
    expectedStatus: "pass",
    expectedSeverity: null,
    expectedVisibleEvidence: "The Delivery details heading and guest delivery form with no authentication prompt.",
    expectedReason: "The fixture exposes the delivery form directly from the guest action and never displays an authentication gate.",
  },
  {
    id: "SS-EVAL-04",
    title: "Empty required delivery details are rejected",
    userStory: "As a shopper, I want clear required-field validation so that I know what delivery information must be supplied.",
    acceptanceCriterion: "Given the Delivery details form is empty, when I select Review order, then I must remain on Delivery details and see the message 'Enter your full name.'",
    fixtureMode: "passing",
    startingInstructions: "Reach Delivery details, leave every delivery field empty, select Review order once, capture the validation result, and stop.",
    expectedStatus: "pass",
    expectedSeverity: null,
    expectedVisibleEvidence: "The Delivery details page remains visible with the inline message Enter your full name.",
    expectedReason: "The passing fixture performs deterministic application-level validation and keeps an incomplete order on the form.",
  },
  {
    id: "SS-EVAL-05",
    title: "Review shows delivery charge and final total",
    userStory: "As a guest shopper, I want the complete payable amount before moving towards payment.",
    acceptanceCriterion: "Given valid delivery details have been entered, when I reach Order review, then Basket subtotal £80.00, Delivery charge £4.95, and Final total £84.95 must be visible before payment.",
    fixtureMode: "passing",
    startingInstructions: "Use the Alpine Trail Backpack and deterministic demo delivery details. Stop on Order review and never continue towards payment.",
    expectedStatus: "pass",
    expectedSeverity: null,
    expectedVisibleEvidence: "The Order review cost summary showing £80.00 subtotal, £4.95 delivery, and £84.95 final total.",
    expectedReason: "The passing fixture calculates and labels every required cost line before the payment boundary.",
  },
  {
    id: "SS-EVAL-06",
    title: "Delivery charge and total are absent",
    userStory: "As a guest shopper, I need to see delivery charges before payment so that I understand the full cost before buying.",
    acceptanceCriterion: "Given valid delivery details have been entered, when I reach Order review, then the delivery charge and final total must be visible before I continue towards payment.",
    fixtureMode: "defective",
    startingInstructions: "Use the Alpine Trail Backpack and deterministic demo delivery details. Stop on Order review and never continue towards payment.",
    expectedStatus: "fail",
    expectedSeverity: "high",
    expectedVisibleEvidence: "Order review shows only the £80.00 basket subtotal and says additional costs appear on the next step.",
    expectedReason: "The defective fixture deliberately withholds required decision information until after the review boundary.",
  },
  {
    id: "SS-EVAL-07",
    title: "Required delivery validation is missing",
    userStory: "As a shopper, I need checkout to reject missing delivery details before an order can reach review.",
    acceptanceCriterion: "Given the Delivery details form is empty, when I select Review order, then checkout must keep me on Delivery details and identify the first required field instead of accepting the order.",
    fixtureMode: "validation-missing",
    startingInstructions: "Reach Delivery details, leave every delivery field empty, select Review order once, and capture the resulting page.",
    expectedStatus: "fail",
    expectedSeverity: "high",
    expectedVisibleEvidence: "Order review becomes visible with a warning that delivery details were accepted while required fields were empty.",
    expectedReason: "The seeded fixture bypasses all required-field validation and advances an incomplete delivery record to review.",
  },
  {
    id: "SS-EVAL-08",
    title: "Selected product is lost before review",
    userStory: "As a shopper, I need my selected product to remain in the basket throughout checkout.",
    acceptanceCriterion: "Given Alpine Trail Backpack was added to the basket, when I reach Order review, then Alpine Trail Backpack and Quantity 1 must still be present in the order summary.",
    fixtureMode: "basket-lost",
    startingInstructions: "Add the backpack, continue as a guest, use deterministic demo delivery details, and stop on Order review.",
    expectedStatus: "fail",
    expectedSeverity: "high",
    expectedVisibleEvidence: "Order review says the basket is empty and the selected Alpine Trail Backpack is absent.",
    expectedReason: "The seeded fixture deliberately drops the selected product only when the shopper reaches review.",
  },
  {
    id: "SS-EVAL-09",
    title: "Delivery quote prerequisite is unavailable",
    userStory: "As a QA tester, I need the delivery quote sandbox available before I can validate the guest delivery journey.",
    acceptanceCriterion: "Given the delivery quote sandbox is a defined prerequisite, when I continue as a guest, then delivery details can be evaluated only if that sandbox is available.",
    fixtureMode: "dependency-unavailable",
    startingInstructions: "The delivery quote sandbox is deliberately unavailable in this fixture. Add the backpack, attempt Continue as guest once, record the prerequisite state, and stop. Do not treat the missing prerequisite itself as a product defect.",
    expectedStatus: "blocked",
    expectedSeverity: null,
    expectedVisibleEvidence: "A Delivery quote sandbox unavailable page explicitly identifies a deliberately unavailable test dependency.",
    expectedReason: "The defined external prerequisite cannot be completed, so no evidence exists to judge the downstream product behavior.",
  },
  {
    id: "SS-EVAL-10",
    title: "Subjective checkout wording is inconclusive",
    userStory: "As a shopper, I want the checkout experience to feel straightforward.",
    acceptanceCriterion: "The checkout should feel straightforward.",
    fixtureMode: "passing",
    startingInstructions: "Do not invent a measurable definition of straightforward. Capture the initial shop state and stop so the criterion can be assessed for testability.",
    expectedStatus: "inconclusive",
    expectedSeverity: null,
    expectedVisibleEvidence: "A stable product-page capture, without evidence that defines or measures straightforwardness.",
    expectedReason: "The criterion supplies no observable threshold, task, completion condition, or measurable expected result.",
  },
]);

export function inputForEvaluationCase(entry: EvaluationCase, baseUrl: string): NewTestInput {
  const target = new URL(`/demo/shop?mode=${entry.fixtureMode}`, baseUrl);
  return newTestInputSchema.parse({
    stagingUrl: target.toString(),
    allowedHostname: target.hostname,
    userStory: entry.userStory,
    acceptanceCriteria: entry.acceptanceCriterion,
    startingInstructions: entry.startingInstructions,
    evaluationCaseId: entry.id,
  });
}

export function selectEvaluationCases(caseIds: string[]) {
  if (caseIds.length === 0) return evaluationCases;
  const requested = new Set(caseIds);
  const selected = evaluationCases.filter(({ id }) => requested.has(id));
  const missing = caseIds.filter((id) => !selected.some((entry) => entry.id === id));
  if (missing.length > 0) throw new Error(`Unknown evaluation case ID: ${missing.join(", ")}`);
  return selected;
}
