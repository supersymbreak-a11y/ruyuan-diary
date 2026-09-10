import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid() {
  return crypto.randomUUID();
}

export function formatInt(n: number) {
  return String(Math.round(n));
}

export function formatCopper(n: number) {
  if (Math.abs(n) >= 100_000) {
    const wan = n / 10_000;
    return `${wan.toFixed(wan >= 100 ? 0 : 1)}万`;
  }
  return formatInt(n);
}
