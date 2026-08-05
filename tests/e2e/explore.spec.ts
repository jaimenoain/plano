/**
 * Explore feed navigation — the two symptoms reported on iPad:
 *   1. a swipe showed another building for a moment and then jumped somewhere else;
 *   2. swiping back revealed that several buildings had been skipped.
 *
 * Both came from the feed being a native `snap-y snap-mandatory` scroller: iOS
 * momentum can't be cancelled once released, so one flick crossed several cards. The
 * feed is a controlled pager now, so the invariant to hold is simply that a gesture —
 * however hard — moves exactly one building, and that going back retraces the same
 * buildings in reverse.
 */
import { test, expect, type Page } from "@playwright/test";
import { activeUser, login, requireActiveUser, suppressConsentBanner } from "./helpers";

/**
 * The id of the building the pager is parked on. Deliberately the id and not the
 * displayed name: building names are not unique in the catalogue, so a name-based
 * check reports a false "we didn't move" whenever two neighbours share a name.
 */
async function currentBuilding(page: Page): Promise<string> {
  const active = page.locator("[data-building-id][data-active='true']");
  await expect(active).toBeVisible({ timeout: 30_000 });
  return (await active.getAttribute("data-building-id")) ?? "";
}

/**
 * A deliberately violent flick: a long throw in very few steps, so the pointer
 * velocity is far past the commit threshold. This is the gesture that used to carry
 * the old snap scroller across three or four buildings at once.
 */
async function flick(page: Page, direction: "up" | "down") {
  const box = await page.locator("main, body").first().boundingBox();
  const cx = (box?.width ?? 800) / 2;
  const startY = direction === "up" ? 700 : 250;
  const endY = direction === "up" ? 200 : 750;
  await page.mouse.move(cx, startY);
  await page.mouse.down();
  await page.mouse.move(cx, endY, { steps: 3 });
  await page.mouse.up();
  // Let the settle spring finish before reading the next card.
  await page.waitForTimeout(700);
}

test.describe("Explore feed paging", () => {
  requireActiveUser();

  test.beforeEach(async ({ page }) => {
    await suppressConsentBanner(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("explore-tutorial-seen", "1");
    });
    await login(page, activeUser.email, activeUser.password);
    await page.goto("/explore");
  });

  test("a hard flick advances exactly one building, and going back retraces it", async ({
    page,
  }) => {
    const forward: string[] = [await currentBuilding(page)];
    expect(forward[0]).not.toBe("");

    for (let i = 0; i < 3; i++) {
      await flick(page, "up");
      forward.push(await currentBuilding(page));
    }

    // Every step landed somewhere new — no flick was swallowed…
    expect(new Set(forward).size).toBe(forward.length);

    // …and walking back visits exactly the same buildings in reverse. If a flick had
    // carried past extra cards, the return trip would surface buildings that were
    // never shown on the way down (the reported "it skipped multiple buildings").
    const back: string[] = [];
    for (let i = 0; i < 3; i++) {
      await flick(page, "down");
      back.push(await currentBuilding(page));
    }
    expect(back).toEqual([...forward].reverse().slice(1));
  });

  test("the first building stays put when a drag falls short of the threshold", async ({
    page,
  }) => {
    const before = await currentBuilding(page);
    const box = await page.locator("main, body").first().boundingBox();
    const cx = (box?.width ?? 800) / 2;
    await page.mouse.move(cx, 500);
    await page.mouse.down();
    await page.mouse.move(cx, 460, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(700);
    expect(await currentBuilding(page)).toBe(before);
  });
});
