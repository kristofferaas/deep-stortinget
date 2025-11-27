"use client";

import * as React from "react";
import { DrawerOverlay } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export function HeaderDrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerOverlay>) {
  return (
    <DrawerOverlay
      className={cn("backdrop-blur-xl bg-background/30", className)}
      style={{
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
      {...props}
    />
  );
}
