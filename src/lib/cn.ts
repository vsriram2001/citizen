import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes so caller overrides beat component defaults. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
