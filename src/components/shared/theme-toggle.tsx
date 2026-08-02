"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/store/theme-store";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-sub transition-colors hover:bg-muted hover:text-ink"
    >
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
