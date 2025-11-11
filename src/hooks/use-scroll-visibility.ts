"use client";

import { useEffect, useState, useRef } from "react";

// Scroll behavior constants
const SCROLL_THRESHOLD = 10; // Minimum scroll distance before triggering hide/show
const MIN_SCROLL_TO_HIDE = 100; // Minimum scroll position before element can hide

/**
 * Custom hook that manages visibility based on scroll direction.
 * Shows the element when scrolling up or near the top, hides it when scrolling down.
 *
 * @returns {boolean} isVisible - Whether the element should be visible
 */
export function useScrollVisibility() {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Only hide/show if scrolled more than threshold
          if (
            Math.abs(currentScrollY - lastScrollY.current) < SCROLL_THRESHOLD
          ) {
            ticking.current = false;
            return;
          }

          if (
            currentScrollY < lastScrollY.current ||
            currentScrollY < MIN_SCROLL_TO_HIDE
          ) {
            // Scrolling up or near the top - show element
            setIsVisible(true);
          } else if (
            currentScrollY > lastScrollY.current &&
            currentScrollY > MIN_SCROLL_TO_HIDE
          ) {
            // Scrolling down and past minimum - hide element
            setIsVisible(false);
          }

          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });

        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return isVisible;
}
