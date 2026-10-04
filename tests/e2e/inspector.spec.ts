import { expect, test } from "./fixtures"

import { openInspector, waitForMap } from "./helpers"

test("searching a county opens its profile and the link restores it", async ({ page }) => {
  await page.goto("/map")
  await waitForMap(page)

  await page.getByRole("button", { name: "Search places" }).click()
  await page.getByPlaceholder("State or county").fill("cook il")
  await page.getByRole("option", { name: /Cook County, IL/ }).click()
  await expect(page).toHaveURL(/sel=area-17031/)

  const inspector = await openInspector(page)
  await expect(inspector.getByRole("heading", { name: "Cook County, IL" })).toBeVisible()
  await expect(
    inspector.getByRole("figure", { name: "Deaths per 100,000 residents per year" })
  ).toBeVisible()
  await expect(inspector.getByText(/of U\.S\. counties/)).toBeVisible()

  await page.reload()
  await waitForMap(page)
  const restored = await openInspector(page)
  await expect(restored.getByRole("heading", { name: "Cook County, IL" })).toBeVisible()
})

test("a shared crash link shows the crash details", async ({ page }) => {
  await page.goto("/map?sel=crash-2023010001")
  await waitForMap(page)
  const inspector = await openInspector(page)
  await expect(inspector.getByText("Fatal crash", { exact: true })).toBeVisible()
  await expect(inspector.getByRole("button", { name: "Butler County, AL" })).toBeVisible()
  await expect(inspector.getByRole("table")).toContainText("Driver")
})

test("an unknown crash shows a not-found message", async ({ page }) => {
  await page.goto("/map?sel=crash-2023999999")
  await waitForMap(page)
  const inspector = await openInspector(page)
  await expect(inspector.getByRole("alert")).toContainText("isn't in the dataset")
})

test("clearing the selection returns to the view summary", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1280, "docked inspector only")
  await page.goto("/map?sel=area-06")
  await waitForMap(page)
  const inspector = await openInspector(page)
  await expect(inspector.getByRole("heading", { name: "California" })).toBeVisible()

  await inspector.getByRole("button", { name: "Clear selection (Esc)" }).click()
  await expect(page).not.toHaveURL(/sel=/)
  await expect(inspector.getByRole("heading", { name: "In this view" })).toBeVisible()
  // The summary queues behind tile requests when the suite runs in parallel.
  await expect(inspector.getByText("Fatal crashes", { exact: true })).toBeVisible({
    timeout: 30_000,
  })
})

test("the area comparison layer shows rates with a legend", async ({ page }) => {
  const metrics = page.waitForResponse(
    (r) => r.url().includes("/api/areas/metrics") && r.status() === 200
  )
  await page.goto("/map?layers=areas,boundaries")
  await waitForMap(page)
  await metrics
  const legend = page.getByRole("region", { name: "Map legend" })
  if ((await legend.getByRole("button", { name: "Legend" }).getAttribute("aria-expanded")) === "false") {
    await legend.getByRole("button", { name: "Legend" }).click()
  }
  await expect(legend).toContainText("Deaths per 100,000 residents per year, by state")
})
