"use client";

import { cn } from "@/lib/utils";
import * as React from "react";
import { Drawer } from "vaul";
import { HeaderDrawerOverlay } from "./header-drawer-overlay";

export function HeaderDrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Drawer.Content>) {
  return (
    <Drawer.Portal>
      <HeaderDrawerOverlay />
      <Drawer.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content bg-background fixed z-50 flex h-auto flex-col",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b",
          "max-h-[90vh] rounded-b-3xl border-none mt-0 gap-3 pt-3 bg-transparent max-w-2xl mx-auto w-full px-3",
          className,
        )}
        {...props}
      >
        {children}
        <div className="w-[100px] h-2 mt-4 bg-muted self-center rounded-full" />
      </Drawer.Content>
    </Drawer.Portal>
  );
}
