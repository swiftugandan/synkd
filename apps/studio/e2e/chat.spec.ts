import { expect, test } from "@playwright/test";

test("two tabs exchange chat in the same room", async ({ browser }) => {
  const room = `e2e-${Date.now()}`;
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const base = `/?backend=node&room=${encodeURIComponent(room)}`;
  await pageA.goto(`${base}&name=Ada`);
  await pageB.goto(`${base}&name=Bob`);

  await expect(pageA.getByRole("status", { name: "Connection" })).toContainText(
    "connected",
    { timeout: 15_000 },
  );
  await expect(pageB.getByRole("status", { name: "Connection" })).toContainText(
    "connected",
    { timeout: 15_000 },
  );

  await pageA.getByLabel("Message").fill("hello from ada");
  await pageA.getByRole("button", { name: "Send" }).click();

  await expect(pageB.locator(".msg-body").filter({ hasText: "hello from ada" })).toBeVisible({
    timeout: 10_000,
  });

  await contextA.close();
  await contextB.close();
});