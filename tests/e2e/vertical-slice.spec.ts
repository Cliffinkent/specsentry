import { expect, type Page, test } from "@playwright/test";

const publicDemoMode = process.env.SPECSENTRY_PUBLIC_DEMO === "true";

async function loadDemoAndRun(page: Page, mode: "defective" | "passing") {
  await page.goto("/");
  await page.getByLabel("Demo fixture build").selectOption(mode);
  await page.getByRole("button", { name: "Load demo", exact: true }).click();
  await expect(page.getByLabel("Staging URL")).toHaveValue(new RegExp(`/demo/shop\\?mode=${mode}$`));
  await page.getByRole("button", { name: "Generate test plan" }).click();
  await expect(page.getByRole("heading", { name: "Review every step." })).toBeVisible();
  await expect(page.getByLabel("Objective")).toHaveValue(/delivery charge and final total/);
  await expect(page.locator('input[value="inspect-costs"]')).toBeVisible();
  await page.getByRole("button", { name: "Approve plan & start run" }).click();
  await expect(page.getByText("Live isolated run")).toBeVisible();
  await expect(page.getByText("Run report", { exact: false })).toBeVisible({ timeout: 90_000 });
}

test("Build Week demo loading fills the defective journey without manual entry", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Public demo restriction" })).toHaveCount(publicDemoMode ? 1 : 0);
  await page.getByLabel("Demo fixture build").selectOption("passing");
  await page.getByRole("button", { name: "Load Build Week demo", exact: true }).click();
  await expect(page.getByLabel("Demo fixture build")).toHaveValue("defective");
  await expect(page.getByLabel("Staging URL")).toHaveValue(/\/demo\/shop\?mode=defective$/);
  await expect(page.getByLabel("User story")).toHaveValue(/guest shopper/i);
  await expect(page.getByLabel("Acceptance criteria")).toHaveValue(/delivery charge and total cost/i);
  await expect(page.getByLabel("Starting instructions \(optional\)")).toHaveValue(/Alpine Trail Backpack/);
});

test("approved workflow creates a high-confidence evidence-backed failure for the defective build", async ({ page }) => {
  await loadDemoAndRun(page, "defective");
  await expect(page.getByRole("heading", { name: "failed" })).toBeVisible();
  const assessment = page.getByText("AI assessment").locator("..");
  await expect(assessment.getByRole("heading", { name: "Delivery charge and final total are missing from order review" })).toBeVisible();
  await expect(assessment.getByText(/high · 98% confidence/i)).toBeVisible();
  await expect(page.getByAltText("Relevant order-review evidence")).toBeVisible();
  await expect(assessment.getByText("Only the £80.00 basket subtotal was displayed", { exact: false })).toBeVisible();
  await expect(page.getByText("Reproduction steps", { exact: true })).toBeVisible();
  await expect(page.getByText("Criterion → checkpoint → action → screenshot → judgement")).toBeVisible();
  await expect(page.getByText("fail", { exact: true })).toBeVisible();
  await expect(page.getByText("Ordered action timeline")).toBeVisible();
  await expect(page.getByText("Human finding review")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review state: draft" })).toBeVisible();
  await expect(page.getByText("AI-generated original · immutable")).toBeVisible();
  await expect(page.getByText("Captured evidence · read-only")).toBeVisible();
  await page.getByLabel("Title").fill("Human reviewed missing delivery costs");
  await page.getByLabel("Severity").selectOption("critical");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Human reviewed missing delivery costs");
  await page.getByRole("button", { name: "Reject finding" }).click();
  await expect(page.getByRole("heading", { name: "Review state: rejected" })).toBeVisible();
  await page.getByRole("button", { name: "Reopen as draft" }).click();
  await expect(page.getByRole("heading", { name: "Review state: draft" })).toBeVisible();
  await page.getByRole("button", { name: "Approve finding" }).click();
  await expect(page.getByRole("heading", { name: "Review state: approved" })).toBeVisible();
  await expect(page.getByText("GitHub issue export")).toBeVisible();
  await page.getByRole("button", { name: "Preview exact GitHub issue" }).click();
  await expect(page.getByText("[SpecSentry/CRITICAL] Human reviewed missing delivery costs", { exact: true })).toBeVisible();
  await expect(page.getByText("Exact Markdown body")).toBeVisible();
  await expect(page.getByText(/Human-approved severity/)).toBeVisible();
  await page.getByLabel(/I reviewed this exact title/).check();
  await page.getByRole("button", { name: "Confirm and create one GitHub issue" }).click();
  await expect(page.getByText("Export complete · further exports locked")).toBeVisible();
  await expect(page.getByRole("link", { name: "https://github.com/acme/shop/issues/123" })).toBeVisible();
  await expect(page.getByText("OpenAI token usage · no cost estimate")).toBeVisible();
  await expect(page.getByRole("row", { name: /planner/i })).toBeVisible();
  await expect(page.getByRole("row", { name: /executor/i })).toBeVisible();
  await expect(page.getByRole("row", { name: /evaluator/i })).toBeVisible();
});

test("the same approved workflow passes the passing build without a finding", async ({ page }) => {
  await loadDemoAndRun(page, "passing");
  await expect(page.getByRole("heading", { name: "passed" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The order review displayed the delivery charge and final total before payment." })).toBeVisible();
  await expect(page.getByText("Delivery charge and final total are missing from order review")).toHaveCount(0);
  await expect(page.getByAltText("Relevant order-review evidence")).toBeVisible();
  await expect(page.getByText("pass", { exact: true })).toBeVisible();
  await expect(page.getByText("Ordered action timeline")).toBeVisible();
});
