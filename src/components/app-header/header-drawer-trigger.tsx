"use client";

import { DrawerTrigger } from "@/components/ui/drawer";
import * as React from "react";

export function HeaderDrawerTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DrawerTrigger asChild>{children}</DrawerTrigger>;
}
