import type { AIProvider, ComputerAction, ComputerTurnRequest, EvaluationPackage } from "@/lib/ai/types";
import type { NewTestInput, TestPlan } from "@/lib/schemas";

const mockUsage = { inputTokens: 120, cachedInputTokens: 20, outputTokens: 40, totalTokens: 160 };

export const demoPlan: TestPlan = {
  objective: "Verify that a guest shopper can see the delivery charge and final total on order review before continuing towards payment.",
  preconditions: [
    "The approved staging URL is the Sentry Shop product page.",
    "The basket is empty and no user account is required.",
    "Only the approved hostname may be used.",
  ],
  steps: [
    {
      id: "open-product",
      instruction: "Open the approved Sentry Shop product page.",
      expectedVisibleResult: "The Alpine Trail Backpack product page is visible.",
      checkpoint: false,
      evidenceRequirement: "Record the initial product-page state.",
      retryLimit: 1,
      stopRule: "Stop if the approved staging page does not load.",
    },
    {
      id: "add-to-basket",
      instruction: "Add the Alpine Trail Backpack to the basket.",
      expectedVisibleResult: "The basket contains one Alpine Trail Backpack with an £80.00 subtotal.",
      checkpoint: false,
      evidenceRequirement: "Record the basket state after the item is added.",
      retryLimit: 2,
      stopRule: "Stop if the product cannot be added after two retries.",
    },
    {
      id: "continue-as-guest",
      instruction: "Continue checkout as a guest.",
      expectedVisibleResult: "The delivery-details form is visible without an authentication prompt.",
      checkpoint: false,
      evidenceRequirement: "Record the visible delivery form.",
      retryLimit: 2,
      stopRule: "Stop if guest checkout is unavailable.",
    },
    {
      id: "enter-delivery-details",
      instruction: "Enter the deterministic demo delivery details in every required field.",
      expectedVisibleResult: "All required delivery fields contain the supplied demo data.",
      checkpoint: false,
      evidenceRequirement: "Record the populated delivery form without exposing secrets.",
      retryLimit: 2,
      stopRule: "Stop if a required delivery field cannot be completed.",
    },
    {
      id: "open-order-review",
      instruction: "Submit the delivery details and open order review.",
      expectedVisibleResult: "The Order review heading and basket subtotal are visible.",
      checkpoint: true,
      evidenceRequirement: "Capture the full order-review cost summary.",
      retryLimit: 2,
      stopRule: "Stop once order review is visible; do not continue towards payment.",
    },
    {
      id: "inspect-costs",
      instruction: "Inspect the order review without continuing towards payment.",
      expectedVisibleResult: "Delivery charge and final total are both visible alongside the basket subtotal.",
      checkpoint: true,
      evidenceRequirement: "Capture a screenshot showing all cost lines that are actually visible.",
      retryLimit: 0,
      stopRule: "Stop after recording the review page. Do not continue towards payment.",
    },
  ],
};

function planStep(
  id: string,
  instruction: string,
  expectedVisibleResult: string,
  checkpoint = false,
): TestPlan["steps"][number] {
  return {
    id,
    instruction,
    expectedVisibleResult,
    checkpoint,
    evidenceRequirement: `Capture the visible result for ${id}.`,
    retryLimit: id.startsWith("inspect-") ? 0 : 2,
    stopRule: checkpoint ? "Stop after the visible result is recorded." : "Stop if the approved interaction cannot be completed.",
  };
}

function evaluationPlan(input: NewTestInput): TestPlan | null {
  const caseId = input.evaluationCaseId;
  if (!caseId) return null;
  const product = planStep("inspect-product", "Inspect the loaded product page without interacting.", "The requested product details are visible.", true);
  const add = planStep("add-to-basket", "Add the Alpine Trail Backpack to the basket.", "The basket view is visible.");
  const basket = planStep("inspect-basket", "Inspect the basket without continuing.", "The selected product details and subtotal are visible.", true);
  const guest = planStep("continue-as-guest", "Continue checkout as a guest.", "Delivery details or the defined prerequisite state is visible.");
  const delivery = planStep("inspect-delivery", "Inspect the guest Delivery details page.", "The delivery form is visible without an authentication gate.", true);
  const submitEmpty = planStep("submit-empty-delivery", "Leave every delivery field empty and select Review order once.", "The visible validation or resulting page is recorded.");
  const enter = planStep("enter-delivery-details", "Enter deterministic demo values in every delivery field.", "Every delivery field contains demo data.");
  const review = planStep("open-order-review", "Select Review order.", "Order review is visible.");

  let steps: TestPlan["steps"];
  switch (caseId) {
    case "SS-EVAL-01":
      steps = [product];
      break;
    case "SS-EVAL-02":
      steps = [add, basket];
      break;
    case "SS-EVAL-03":
      steps = [add, guest, delivery];
      break;
    case "SS-EVAL-04":
      steps = [add, guest, submitEmpty, planStep("inspect-delivery-validation", "Inspect the required-field result.", "Delivery details remains visible with Enter your full name.", true)];
      break;
    case "SS-EVAL-05":
    case "SS-EVAL-06":
      steps = [add, guest, enter, review, planStep("inspect-costs", "Inspect the order-review cost summary without continuing towards payment.", "All cost lines actually visible are recorded.", true)];
      break;
    case "SS-EVAL-07":
      steps = [add, guest, submitEmpty, planStep("inspect-missing-validation", "Inspect the page reached after the empty form was submitted.", "The accepted empty delivery state is visible.", true)];
      break;
    case "SS-EVAL-08":
      steps = [add, guest, enter, review, planStep("inspect-basket-loss", "Inspect the order summary for the selected product.", "The actual basket state is visible.", true)];
      break;
    case "SS-EVAL-09":
      steps = [add, guest, planStep("inspect-dependency", "Inspect the defined delivery quote prerequisite and stop.", "The unavailable prerequisite is visible.", true)];
      break;
    case "SS-EVAL-10":
      steps = [planStep("inspect-product-ambiguity", "Capture the initial shop state without inventing a definition of straightforward.", "The page state is visible but supplies no testability threshold.", true)];
      break;
    default:
      return null;
  }

  return {
    objective: `Execute controlled evaluation case ${caseId} without expanding its criterion.`,
    preconditions: ["The approved Sentry Shop fixture is already loaded.", "Only the approved hostname may be used."],
    steps,
  };
}

function firstActionsForStep(stepId: string): ComputerAction[] {
  switch (stepId) {
    case "add-to-basket":
    case "continue-as-guest":
    case "open-order-review":
      return [
        { type: "keypress", keys: ["TAB"] },
        { type: "keypress", keys: ["ENTER"] },
      ];
    case "enter-delivery-details":
      return [
        { type: "keypress", keys: ["TAB"] },
        { type: "type", text: "Alex Morgan" },
        { type: "keypress", keys: ["TAB"] },
        { type: "type", text: "alex@example.test" },
        { type: "keypress", keys: ["TAB"] },
        { type: "type", text: "14 Harbour Lane" },
        { type: "keypress", keys: ["TAB"] },
        { type: "type", text: "Folkestone" },
        { type: "keypress", keys: ["TAB"] },
        { type: "type", text: "CT20 1AA" },
      ];
    case "submit-empty-delivery":
      return [
        { type: "keypress", keys: ["TAB"] },
        { type: "keypress", keys: ["TAB"] },
        { type: "keypress", keys: ["TAB"] },
        { type: "keypress", keys: ["TAB"] },
        { type: "keypress", keys: ["TAB"] },
        { type: "keypress", keys: ["TAB"] },
        { type: "keypress", keys: ["ENTER"] },
      ];
    default:
      return [];
  }
}

export class MockAIProvider implements AIProvider {
  async plan(input: NewTestInput) {
    return { output: evaluationPlan(input) || demoPlan, usage: mockUsage };
  }

  async computer(request: ComputerTurnRequest) {
    const actions = request.previousCallId ? [] : firstActionsForStep(request.step.id);
    return {
      responseId: `mock-response-${request.step.id}`,
      callId: actions.length ? `mock-call-${request.step.id}` : null,
      actions,
      observation: actions.length ? "Requested the next approved browser interaction." : `Completed approved step ${request.step.id}.`,
      pendingSafetyChecks: [],
      usage: { inputTokens: 80, cachedInputTokens: 10, outputTokens: 20, totalTokens: 100 },
    };
  }

  async evaluate(input: EvaluationPackage) {
    const caseId = input.input.evaluationCaseId;
    const lastEvidence = input.screenshots.at(-1)?.reference;
    if (caseId) {
      const passSummaries: Record<string, string> = {
        "SS-EVAL-01": "The product name, colour, and £80.00 price were visible together.",
        "SS-EVAL-02": "The basket retained the selected backpack, variant, quantity, and subtotal.",
        "SS-EVAL-03": "Guest checkout opened Delivery details without an authentication gate.",
        "SS-EVAL-04": "The empty form remained on Delivery details and displayed Enter your full name.",
        "SS-EVAL-05": "Order review displayed the subtotal, delivery charge, and final total before payment.",
      };
      if (passSummaries[caseId]) {
        return { output: { criterionId: caseId, status: "pass", summary: passSummaries[caseId], finding: null }, usage: mockUsage };
      }
      if (caseId === "SS-EVAL-09") {
        return { output: {
          criterionId: caseId,
          status: "blocked",
          summary: "The defined delivery quote sandbox prerequisite was deliberately unavailable, so downstream delivery behavior could not be judged.",
          finding: null,
        }, usage: mockUsage };
      }
      if (caseId === "SS-EVAL-10") {
        return { output: {
          criterionId: caseId,
          status: "inconclusive",
          summary: "Straightforward is not measurable. Clarify the task, completion condition, observable threshold, and acceptable outcome.",
          finding: null,
        }, usage: mockUsage };
      }

      const failure = {
        "SS-EVAL-06": {
          title: "Delivery charge and final total are missing from order review",
          expected: "Delivery charge and final total are visible before payment.",
          actual: "Only the £80.00 subtotal was visible and additional costs were deferred.",
          lastStep: "open-order-review",
        },
        "SS-EVAL-07": {
          title: "Empty required delivery details are accepted",
          expected: "Checkout remains on Delivery details and identifies a required field.",
          actual: "Checkout advanced to Order review while every required delivery field was empty.",
          lastStep: "continue-as-guest",
        },
        "SS-EVAL-08": {
          title: "Selected product is lost before order review",
          expected: "The selected Alpine Trail Backpack and Quantity 1 remain in the order summary.",
          actual: "Order review reported an empty basket and omitted the selected product.",
          lastStep: "enter-delivery-details",
        },
      }[caseId];
      if (failure) {
        return { output: {
          criterionId: caseId,
          status: "fail",
          summary: failure.actual,
          finding: {
            title: failure.title,
            severity: "high",
            confidence: 0.98,
            expectedResult: failure.expected,
            actualResult: failure.actual,
            reproductionSteps: input.approvedPlan.steps.map(({ instruction }) => instruction),
            evidenceReferences: lastEvidence ? [lastEvidence] : [],
            lastSuccessfulStep: failure.lastStep,
            suggestedNextTest: "Repeat the same controlled case against the corrected fixture behavior.",
          },
        }, usage: mockUsage };
      }
    }

    const reviewText = input.observations.join("\n");
    const costsVisible = reviewText.includes("Delivery charge") && reviewText.includes("Final total");

    if (costsVisible) {
      return { output: {
        criterionId: "AC-01",
        status: "pass",
        summary: "The order review displayed the delivery charge and final total before payment.",
        finding: null,
      }, usage: mockUsage };
    }

    return { output: {
      criterionId: "AC-01",
      status: "fail",
      summary: "The recorded order review showed the basket subtotal but withheld the delivery charge and final total.",
      finding: {
        title: "Delivery charge and final total are missing from order review",
        severity: "high",
        confidence: 0.98,
        expectedResult: "The delivery charge and final total are visible on order review before continuing towards payment.",
        actualResult: "Only the £80.00 basket subtotal was displayed; additional costs were deferred to the next step.",
        reproductionSteps: [
          "Open the approved Sentry Shop product page.",
          "Add the Alpine Trail Backpack to the basket.",
          "Continue as a guest and enter the demo delivery details.",
          "Open Order review without continuing towards payment.",
          "Observe that delivery charge and final total are absent.",
        ],
        evidenceReferences: lastEvidence ? [lastEvidence] : [],
        lastSuccessfulStep: "open-order-review",
        suggestedNextTest: "Repeat the same approved plan against passing mode and confirm both cost lines are present.",
      },
    }, usage: mockUsage };
  }
}
