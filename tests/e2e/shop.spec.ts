import { expect, type Page, test } from "@playwright/test";

async function reachOrderReview(page: Page, mode: "passing" | "defective") {
  await page.goto(`/demo/shop?mode=${mode}`);
  await expect(page.getByTestId("fixture-mode")).toHaveText(`${mode} build`);
  await page.getByRole("button", { name: "Add to basket" }).click();
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.getByLabel("Full name").fill("Alex Morgan");
  await page.getByLabel("Email address").fill("alex@example.test");
  await page.getByLabel("Address line 1").fill("14 Harbour Lane");
  await page.getByLabel("Town or city").fill("Folkestone");
  await page.getByLabel("Postcode").fill("CT20 1AA");
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByRole("heading", { name: "Order review" })).toBeVisible();
}

test("requires an explicit fixture mode", async ({ page }) => {
  await page.goto("/demo/shop");
  await expect(page.getByRole("heading", { name: "Choose an explicit demo build." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open defective build" })).toHaveAttribute("href", "/demo/shop?mode=defective");
  await expect(page.getByRole("link", { name: "Open passing build" })).toHaveAttribute("href", "/demo/shop?mode=passing");
});

test("passing build shows delivery charge and final total on review", async ({ page }) => {
  await reachOrderReview(page, "passing");
  await expect(page.getByTestId("review-subtotal")).toContainText("£80.00");
  await expect(page.getByTestId("review-delivery")).toContainText("£4.95");
  await expect(page.getByTestId("review-total")).toContainText("£84.95");
});

test("defective build withholds delivery charge and final total until payment", async ({ page }) => {
  await reachOrderReview(page, "defective");
  await expect(page.getByTestId("review-subtotal")).toContainText("£80.00");
  await expect(page.getByTestId("review-delivery")).toHaveCount(0);
  await expect(page.getByTestId("review-total")).toHaveCount(0);
  await expect(page.getByTestId("review-missing-costs")).toBeVisible();

  await page.getByRole("button", { name: "Continue towards payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment is disabled" })).toBeVisible();
  await expect(page.getByText("Delivery charge")).toBeVisible();
  await expect(page.getByText("Final total")).toBeVisible();
});
