"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useScrollVisibility } from "@/hooks/use-scroll-visibility";

export function AppHeader() {
  const isVisible = useScrollVisibility();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex justify-center p-3 transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="w-full max-w-2xl backdrop-blur-md bg-background/80 border border-border shadow-lg flex items-center gap-2 p-2 transition-all duration-200 rounded-full">
        <Link
          href="/"
          className="flex-1 bg-transparent px-3 py-2 group transition-colors"
        >
          <h1 className="text-sm font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/70 transition-all duration-300">
            Deep stortinget
          </h1>
        </Link>
        <button
          type="button"
          className="flex-shrink-0 w-9 h-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-all duration-200 flex items-center justify-center"
          aria-label="Menu"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
