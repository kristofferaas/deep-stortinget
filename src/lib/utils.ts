import { clsx, type ClassValue } from "clsx";
import { FunctionReference } from "convex/server";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferQueryResult<T extends FunctionReference<any>> =
  T["_returnType"];
