"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useScrollVisibility } from "@/hooks/use-scroll-visibility";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const ThemeSwitcher = dynamic(
  () =>
    import("@/components/theme/theme-switcher").then((mod) => ({
      default: mod.ThemeSwitcher,
    })),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        className="flex-shrink-0 w-9 h-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-all duration-200 flex items-center justify-center"
        aria-label="Toggle theme"
        disabled
      />
    ),
  },
);

export function AppHeader() {
  const isVisible = useScrollVisibility();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <>
      {/* Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 backdrop-blur-[3px] bg-background/20 z-50 animate-in fade-in duration-300"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <header
        className={`fixed top-0 left-0 right-0 z-50 flex justify-center p-3 transition-all duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="w-full max-w-2xl rounded-[27px] backdrop-blur-md bg-background/70 border border-border shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 p-2">
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
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-all duration-200 flex items-center justify-center"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Menu Content */}
          <div
            className={`overflow-hidden transition-all duration-300 ${
              isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <nav className="p-2 pt-0">
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/"
                    className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Contact
                  </Link>
                </li>
              </ul>
              <div className="mt-2">
                <ThemeSwitcher />
              </div>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
