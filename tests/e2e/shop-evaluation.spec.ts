import { expect, type Page, test } from "@playwright/test";
import { evaluationCases } from "@/lib/evaluation/cases";
import type { DemoMode } from "@/lib/schemas";

async function openFixture(page: Page, mode: DemoMode) {
  await page.goto(`/demo/shop?mode=${mode}`);
  await expect(page.getByTestId("fixture-mode")).toHaveText(`${mode} build`);
}

async function reachBasket(page: Page, mode: DemoMode) {
  await openFixture(page, mode);
  await page.getByRole("button", { name: "Add to basket" }).click();
}

async function reachDelivery(page: Page, mode: DemoMode) {
  await reachBasket(page, mode);
  await page.getByRole("button", { name: "Continue as guest" }).click();
}

async function fillDelivery(page: Page) {
  await page.getByLabel("Full name").fill("Alex Morgan");
  await page.getByLabel("Email address").fill("alex@example.test");
  await page.getByLabel("Address line 1").fill("14 Harbour Lane");
  await page.getByLabel("Town or city").fill("Folkestone");
  await page.getByLabel("Postcode").fill("CT20 1AA");
  await page.getByRole("button", { name: "Review order" }).click();
}

test("SS-EVAL-01 product details are visible together", async ({ page }) => {
  await openFixture(page, "passing");
  await expect(page.getByRole("heading", { name: "Alpine Trail Backpack" })).toBeVisible();
  await expect(page.getByText("£80.00", { exact: true })).toBeVisible();
  await expect(page.getByText(/Colour: Forest green/)).toBeVisible();
});

test("SS-EVAL-02 basket preserves the selected item", async ({ page }) => {
  await reachBasket(page, "passing");
  await expect(page.getByRole("heading", { name: "Your basket" })).toBeVisible();
  await expect(page.getByText("Alpine Trail Backpack")).toBeVisible();
  await expect(page.getByText(/Forest green · Quantity 1/)).toBeVisible();
  await expect(page.getByText("Basket subtotal").locator("..")).toContainText("£80.00");
});

test("SS-EVAL-03 guest checkout opens without authentication", async ({ page }) => {
  await reachDelivery(page, "passing");
  await expect(page.getByRole("heading", { name: "Delivery details" })).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByText(/sign in|create account/i)).toHaveCount(0);
});

test("SS-EVAL-04 empty required delivery data is rejected", async ({ page }) => {
  await reachDelivery(page, "passing");
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByRole("heading", { name: "Delivery details" })).toBeVisible();
  await expect(page.getByTestId("delivery-validation")).toHaveText("Enter your full name.");
  await expect(page.getByRole("heading", { name: "Order review" })).toHaveCount(0);
});

test("SS-EVAL-05 order review shows all costs", async ({ page }) => {
  await reachDelivery(page, "passing");
  await fillDelivery(page);
  await expect(page.getByTestId("review-subtotal")).toContainText("£80.00");
  await expect(page.getByTestId("review-delivery")).toContainText("£4.95");
  await expect(page.getByTestId("review-total")).toContainText("£84.95");
});

test("SS-EVAL-06 defective review withholds delivery and total", async ({ page }) => {
  await reachDelivery(page, "defective");
  await fillDelivery(page);
  await expect(page.getByTestId("review-subtotal")).toContainText("£80.00");
  await expect(page.getByTestId("review-delivery")).toHaveCount(0);
  await expect(page.getByTestId("review-total")).toHaveCount(0);
  await expect(page.getByTestId("review-missing-costs")).toBeVisible();
});

test("SS-EVAL-07 missing validation accepts empty delivery data", async ({ page }) => {
  await reachDelivery(page, "validation-missing");
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByRole("heading", { name: "Order review" })).toBeVisible();
  await expect(page.getByTestId("missing-validation-warning")).toContainText("required fields were empty");
});

test("SS-EVAL-08 selected product is lost before review", async ({ page }) => {
  await reachDelivery(page, "basket-lost");
  await fillDelivery(page);
  await expect(page.getByRole("heading", { name: "Order review" })).toBeVisible();
  await expect(page.getByTestId("review-empty-basket")).toContainText("Your basket is empty");
  await expect(page.getByTestId("review-empty-basket")).toContainText("selected product is no longer present");
});

test("SS-EVAL-09 unavailable fixture dependency blocks the journey", async ({ page }) => {
  await reachBasket(page, "dependency-unavailable");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page.getByRole("heading", { name: "Delivery quote sandbox unavailable" })).toBeVisible();
  await expect(page.getByTestId("dependency-blocker")).toContainText("defined prerequisite");
  await expect(page.getByRole("heading", { name: "Delivery details" })).toHaveCount(0);
});

test("SS-EVAL-10 ambiguous criterion has no invented fixture threshold", async ({ page }) => {
  const entry = evaluationCases.find(({ id }) => id === "SS-EVAL-10")!;
  expect(entry.acceptanceCriterion).toBe("The checkout should feel straightforward.");
  await openFixture(page, entry.fixtureMode);
  await expect(page.getByRole("heading", { name: "Alpine Trail Backpack" })).toBeVisible();
  await expect(page.getByText(/straightforward/i)).toHaveCount(0);
});
