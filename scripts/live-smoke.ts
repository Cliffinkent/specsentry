import { OpenAIProvider } from "@/lib/ai/openai-provider";
import { generatePlan } from "@/lib/ai/services";

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for the live smoke test. Add it to .env.local or the process environment.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.6-terra";
  const plan = await generatePlan(
    {
      stagingUrl: "https://staging.example.com/demo/shop?mode=defective",
      allowedHostname: "staging.example.com",
      userStory: "As a guest shopper, I need to see delivery charges before entering payment details so that I understand the full cost before buying.",
      acceptanceCriteria: "Given that I have an item in my basket, when I reach the order review page, then the delivery charge and total cost must be visible before I continue to payment.",
      startingInstructions: "Use a backpack and stop at order review without continuing to payment.",
    },
    new OpenAIProvider(),
  );

  console.log(`PASS: ${model} returned a schema-valid plan with ${plan.steps.length} steps and ${plan.steps.filter((step) => step.checkpoint).length} checkpoints.`);
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : "Unknown live smoke error"}`);
  process.exitCode = 1;
});
