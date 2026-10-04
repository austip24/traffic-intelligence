import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"

const VIEWPORT_IN_URL = /lng=-?\d+\.\d+&lat=-?\d+\.\d+&z=\d+\.\d{2}/

async function waitForMap(page: Page) {
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible({
    timeout: 20_000,
  })
}

async function dragMap(page: Page, dx: number, dy: number) {
  const box = await page.locator("canvas.maplibregl-canvas").boundingBox()
  if (!box) throw new Error("map canvas has no bounding box")
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 10 })
  await page.mouse.up()
}

test("root redirects to the map and renders a canvas", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL(/\/map/)
  await waitForMap(page)
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible()
})

test("panning writes the viewport to the URL", async ({ page }) => {
  await page.goto("/map")
  await waitForMap(page)
  await expect(page).not.toHaveURL(VIEWPORT_IN_URL)

  // Release on bare map: MapLibre only ends a mouse drag on a mouseup over the
  // map element itself, and the legend sits top-left.
  await dragMap(page, 120, 80)
  await expect(page).toHaveURL(VIEWPORT_IN_URL)
})

test("a shared URL restores the viewport", async ({ page }) => {
  await page.goto("/map?lng=-87.630&lat=41.878&z=10.00")
  await waitForMap(page)

  // A small drag makes the map write its view back. At z10 the URL gains a
  // 4th decimal, so a match proves the write happened and stayed in Chicago.
  await dragMap(page, 10, 10)
  await expect(page).toHaveURL(/lng=-87\.6\d{3}&lat=41\.8\d{3}&z=10\.00/)
})

test("invalid viewport params fall back to the default extent", async ({
  page,
}) => {
  await page.goto("/map?lng=abc&lat=999&z=4")
  await waitForMap(page)
  await expect(page.getByText("Map unavailable")).toHaveCount(0)
})
