"use client"

import { Button } from "@/components/ui/button"
import { APP_THEME_OPTIONS } from "@/components/theme/app-theme-options"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAppThemePreference } from "@/lib/hooks/ui/use-app-theme-preference"

type ThemeChoice = "light" | "dark"

type ThemeToggleMenuProps = {
  showDescriptions?: boolean
}

export function ThemeToggleMenu({
  showDescriptions = true,
}: ThemeToggleMenuProps) {
  const { currentTheme, setAppThemePreference } = useAppThemePreference()

  return (
    <>
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup
        onValueChange={(value) => void setAppThemePreference(value as ThemeChoice)}
        value={currentTheme}
      >
        {APP_THEME_OPTIONS.map((choice) => {
          const ChoiceIcon = choice.icon

          return (
            <DropdownMenuRadioItem
              className="items-start rounded-xl py-2"
              key={choice.value}
              value={choice.value}
            >
              <ChoiceIcon className={showDescriptions ? "mt-0.5 size-4" : "size-4"} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium text-sm">{choice.label}</span>
                {showDescriptions ? (
                  <span className="text-[11px] leading-4 opacity-75">
                    {choice.description}
                  </span>
                ) : null}
              </span>
            </DropdownMenuRadioItem>
          )
        })}
      </DropdownMenuRadioGroup>
    </>
  )
}

export function ThemeToggle() {
  const { currentTheme } = useAppThemePreference()
  const ThemeIcon = APP_THEME_OPTIONS.find((choice) => choice.value === currentTheme)?.icon ?? APP_THEME_OPTIONS[0].icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Change theme"
          className="rounded-full"
          size="icon"
          variant="ghost"
        >
          <ThemeIcon className="size-4" />
          <span className="sr-only">Open theme menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <ThemeToggleMenu />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
