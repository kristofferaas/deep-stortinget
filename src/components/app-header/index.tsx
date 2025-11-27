"use client";

import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { useScrollVisibility } from "@/hooks/use-scroll-visibility";
import { ArrowRight, Menu, Settings, User, X } from "lucide-react";
import Link from "next/link";
import { Drawer } from "vaul";
import { HeaderDrawer } from "./header-drawer";
import { HeaderDrawerClose } from "./header-drawer-close";
import { HeaderDrawerContent } from "./header-drawer-content";
import { HeaderDrawerTrigger } from "./header-drawer-trigger";

import {
  HeaderDrawerSection,
  HeaderDrawerSectionContent,
  HeaderDrawerSectionTitle,
} from "./header-drawer-section";

const navigationLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function AppHeader() {
  const isVisible = useScrollVisibility();

  return (
    <HeaderDrawer>
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
            <HeaderDrawerTrigger>
              <button
                type="button"
                className="flex-shrink-0 w-9 h-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-all duration-200 flex items-center justify-center"
                aria-label="Open menu"
                aria-expanded={false}
              >
                <Menu className="w-4 h-4" />
              </button>
            </HeaderDrawerTrigger>
          </div>
        </div>
      </header>

      {/* Drawer Content */}
      <HeaderDrawerContent>
        {/* Header top section (same as <header> above) */}
        <HeaderDrawerSection>
          <HeaderDrawerSectionContent className="flex-row items-center justify-between gap-2">
            <HeaderDrawerClose>
              <Drawer.Title
                className="pl-3 text-sm font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/70 transition-all duration-300"
                asChild
              >
                <Link href="/">Deep stortinget</Link>
              </Drawer.Title>
            </HeaderDrawerClose>
            <HeaderDrawerClose>
              <button
                type="button"
                className="flex-shrink-0 w-9 h-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-all duration-200 flex items-center justify-center"
                aria-label="Close menu"
                aria-expanded
              >
                <X className="size-4" />
              </button>
            </HeaderDrawerClose>
          </HeaderDrawerSectionContent>
        </HeaderDrawerSection>

        {/* User section */}
        <HeaderDrawerSection>
          <HeaderDrawerSectionTitle>User</HeaderDrawerSectionTitle>
          <HeaderDrawerSectionContent className="flex-row items-center gap-2">
            <button
              type="button"
              className="flex-shrink-0 w-9 h-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-all duration-200 flex items-center justify-center"
            >
              <User className="size-4" />
            </button>
            Guest user
          </HeaderDrawerSectionContent>
        </HeaderDrawerSection>

        {/* Navigation section */}
        <HeaderDrawerSection>
          <HeaderDrawerSectionTitle>Links</HeaderDrawerSectionTitle>
          <HeaderDrawerSectionContent>
            {navigationLinks.map((link) => (
              <HeaderDrawerClose key={link.label}>
                <Link
                  href={link.href}
                  className="w-full h-9 rounded-full bg-transparent text-muted-foreground hover:bg-muted/80 transition-all duration-200 flex items-center justify-start px-3"
                >
                  {link.label}
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </HeaderDrawerClose>
            ))}
          </HeaderDrawerSectionContent>
        </HeaderDrawerSection>

        {/* Settings section */}
        <HeaderDrawerSection>
          <HeaderDrawerSectionTitle>Settings</HeaderDrawerSectionTitle>
          <HeaderDrawerSectionContent className="flex-row gap-1">
            <button
              type="button"
              className="flex-shrink-0 w-9 h-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-all duration-200 flex items-center justify-center"
            >
              <Settings className="size-4" />
            </button>
            <ThemeSwitcher />
          </HeaderDrawerSectionContent>
        </HeaderDrawerSection>
      </HeaderDrawerContent>
    </HeaderDrawer>
  );
}
