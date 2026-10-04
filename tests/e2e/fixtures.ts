import { test as base } from "@playwright/test"

export { expect } from "@playwright/test"

/**
 * Hides Next.js' dev-tools indicator, which is dev-only UI and can sit over
 * app controls depending on where a developer has docked it.
 */
export const test = base.extend<{ hideDevOverlay: void }>({
  hideDevOverlay: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        const style = document.createElement("style")
        style.textContent = "nextjs-portal { display: none !important; }"
        document.addEventListener("DOMContentLoaded", () => document.head.append(style))
      })
      await use()
    },
    { auto: true },
  ],
})
