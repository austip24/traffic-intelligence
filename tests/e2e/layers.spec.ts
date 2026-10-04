import { expect, test } from "./fixtures"

import { openSidePanel, waitForMap } from "./helpers"

test("crash tiles load as vector tiles", async ({ page }) => {
  const tile = page.waitForResponse(
    (r) => r.url().includes("/api/tiles/crashes/") && r.status() === 200
  )
  await page.goto("/map")
  await waitForMap(page)
  const response = await tile
  expect(response.headers()["content-type"]).toBe("application/vnd.mapbox-vector-tile")
})

test("turning a layer off updates the URL and legend", async ({ page }) => {
  await page.goto("/map")
  await waitForMap(page)
  const panel = await openSidePanel(page, "Layers")

  await panel.getByRole("switch", { name: "Fatal crashes" }).click()
  await expect(page).toHaveURL(/layers=boundaries(&|$)/)
  await expect(page.getByText("Fatal crashes per 1,000 km²")).toHaveCount(0)
})

test("tile failures surface an error with retry", async ({ page, context }) => {
  await context.route("**/api/tiles/crashes/**", (route) => route.fulfill({ status: 500 }))
  await page.goto("/map")
  await waitForMap(page)

  const panel = await openSidePanel(page, "Layers")
  const alert = panel.getByRole("alert")
  await expect(alert).toContainText("failed to load")

  await context.unroute("**/api/tiles/crashes/**")
  await alert.getByRole("button", { name: "Retry" }).click()
  await expect(alert).toHaveCount(0)
})
