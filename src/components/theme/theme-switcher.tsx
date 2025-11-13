"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = () => {
    if (theme === "light") {
      return <Sun className="w-4 h-4" />;
    } else if (theme === "dark") {
      return <Moon className="w-4 h-4" />;
    } else {
      return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="flex-shrink-0 w-9 h-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-all duration-200 flex items-center justify-center"
      aria-label="Toggle theme"
    >
      {getIcon()}
    </button>
  );
}
