"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function AppHeader() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Only hide/show header if scrolled more than 10px
      if (Math.abs(currentScrollY - lastScrollY) < 10) {
        return;
      }

      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        // Scrolling up or near the top - show header
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px - hide header
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

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
