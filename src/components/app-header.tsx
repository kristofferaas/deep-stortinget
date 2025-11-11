"use client";

import Link from "next/link";
import { useScrollVisibility } from "@/hooks/use-scroll-visibility";

export function AppHeader() {
  const isVisible = useScrollVisibility();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="flex items-center gap-2 group transition-colors"
            >
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/70 transition-all duration-300">
                Deep stortinget
              </h1>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
