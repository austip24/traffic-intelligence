import { expect, type Page } from "@playwright/test"

export async function waitForMap(page: Page) {
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible({ timeout: 30_000 })
}

/** Opens the layers/filters panel: docked on desktop, a sheet on mobile. */
export async function openSidePanel(page: Page, tab: "Filters" | "Layers") {
  const isMobile = (page.viewportSize()?.width ?? 1280) < 1024
  if (isMobile) {
    await page.getByRole("button", { name: "Toggle layers and filters" }).click()
  }
  const panel = isMobile ? page.getByRole("dialog") : page.getByRole("complementary", { name: "Layers and filters" })
  await panel.getByRole("tab", { name: tab }).click()
  return panel
}

/** The details panel: docked on wide screens, a sheet (opened via "Details") otherwise. */
export async function openInspector(page: Page) {
  const docked = page.getByRole("complementary", { name: "Details" })
  if ((page.viewportSize()?.width ?? 1280) >= 1280) return docked
  const sheet = page.getByRole("dialog", { name: "Details" })
  if (!(await sheet.isVisible())) await page.getByRole("button", { name: "Details" }).click()
  return sheet
}
