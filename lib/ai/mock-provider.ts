import type { AIProvider, ComputerAction, ComputerTurnRequest, EvaluationPackage } from "@/lib/ai/types";
import type { TestPlan } from "@/lib/schemas";

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
    default:
      return [];
  }
}

export class MockAIProvider implements AIProvider {
  async plan() {
    return { output: demoPlan, usage: mockUsage };
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
    const reviewText = input.observations.join("\n");
    const lastEvidence = input.screenshots.at(-1)?.reference;
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
