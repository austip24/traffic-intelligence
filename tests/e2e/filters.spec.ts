import { expect, test } from "./fixtures"

import { openSidePanel, waitForMap } from "./helpers"

test("selecting a filter updates the URL and the totals", async ({ page }) => {
  await page.goto("/map")
  await waitForMap(page)
  const panel = await openSidePanel(page, "Filters")

  const total = panel.getByText(/fatal crashes$/)
  await expect(total).toBeVisible()
  const before = await total.textContent()

  await panel.getByRole("checkbox", { name: "Pedestrian" }).check()
  await expect(page).toHaveURL(/user=pedestrian/)
  await expect(total).not.toHaveText(before ?? "")
})

test("a shared URL restores filters", async ({ page }) => {
  await page.goto("/map?user=bicyclist&from=2020&setting=urban")
  await waitForMap(page)
  const panel = await openSidePanel(page, "Filters")

  await expect(panel.getByRole("checkbox", { name: "Bicyclist" })).toBeChecked()
  await expect(panel.getByRole("checkbox", { name: "Urban" })).toBeChecked()
  await expect(panel.getByRole("checkbox", { name: "Pedestrian" })).not.toBeChecked()
  await expect(panel.getByText("2020–2024")).toBeVisible()
})

test("filters that match nothing show an empty state that resets", async ({ page, context }) => {
  // Force an empty result so the test doesn't depend on the data.
  await context.route("**/api/crashes/summary**", (route) =>
    route.fulfill({ json: { crashes: 0, fatalities: 0, unlocated: 0, byYear: [] } })
  )
  await page.goto("/map?user=bicyclist&road=interstate")
  await waitForMap(page)

  const empty = page.getByRole("status").filter({ hasText: "No fatal crashes match" })
  await expect(empty).toBeVisible()
  await empty.getByRole("button", { name: "Reset filters" }).click()
  await expect(page).not.toHaveURL(/user=|road=/)
})
