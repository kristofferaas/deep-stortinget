"use client";

import * as React from "react";
import { Drawer } from "@/components/ui/drawer";

export function HeaderDrawer({
  children,
  ...props
}: React.ComponentProps<typeof Drawer>) {
  return (
    <Drawer direction="top" {...props}>
      {children}
    </Drawer>
  );
}
