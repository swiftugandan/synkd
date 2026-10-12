import { expect, test } from "@playwright/test";

test("admin can sign in and see fleet health", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Admin token").fill("dev-admin");
  await page.getByRole("button", { name: "Enter console" }).click();

  await expect(page.getByRole("status")).toContainText("fleet up", {
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { name: "Fleet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rooms" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Access" })).toBeVisible();
});
