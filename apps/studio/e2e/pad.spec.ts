import { expect, test } from "@playwright/test";

test("two tabs sync Yjs pad text", async ({ browser }) => {
  const room = `pad-e2e-${Date.now()}`;
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const base = `/?backend=node&surface=pad&room=${encodeURIComponent(room)}`;
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

  const padA = pageA.locator("#sinkd-pad");
  const padB = pageB.locator("#sinkd-pad");
  await expect(padA).toBeEnabled({ timeout: 10_000 });
  await padA.fill("shared brine notes");

  await expect(padB).toHaveValue("shared brine notes", { timeout: 10_000 });

  await contextA.close();
  await contextB.close();
});
