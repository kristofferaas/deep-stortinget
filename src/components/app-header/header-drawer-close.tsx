"use client";

import * as React from "react";
import { DrawerClose } from "@/components/ui/drawer";

export function HeaderDrawerClose({
  children,
  ...props
}: React.ComponentProps<typeof DrawerClose>) {
  return (
    <DrawerClose asChild {...props}>
      {children}
    </DrawerClose>
  );
}
