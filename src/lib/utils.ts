import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "filling-fast" -> "fillingFast" — converts a kebab-case domain value into a camelCase dictionary key. */
export function kebabToCamel(value: string): string {
  return value.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}
