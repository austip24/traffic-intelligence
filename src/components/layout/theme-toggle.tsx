"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle dark mode"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          />
        }
      >
        {/* Icons switch via CSS so server and client markup always match. */}
        <Sun className="dark:hidden" />
        <Moon className="hidden dark:block" />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Toggle theme <Kbd>D</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
