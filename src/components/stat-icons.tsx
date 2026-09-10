import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function Circle({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex size-12 items-center justify-center rounded-full",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function IconPulls() {
  return (
    <Circle className="bg-stat-purple-bg text-stat-purple">
      <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden>
        <rect x="5" y="6" width="12" height="14" rx="2.2" fill="currentColor" opacity="0.35" />
        <rect x="8" y="4" width="12" height="14" rx="2.2" fill="currentColor" />
        <path d="M11 9h6M11 12h6M11 15h4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </Circle>
  );
}

export function IconSsr() {
  return (
    <Circle className="rounded-2xl bg-stat-red-bg text-stat-red">
      <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden>
        <rect x="5" y="5" width="14" height="14" rx="3.5" fill="currentColor" />
        <path
          d="M12 8.2l1.05 2.2 2.4.28-1.78 1.64.5 2.36L12 13.5l-2.17 1.18.5-2.36-1.78-1.64 2.4-.28L12 8.2z"
          fill="#fff"
        />
      </svg>
    </Circle>
  );
}

export function IconTrophy() {
  return (
    <Circle className="bg-stat-gold-bg text-stat-gold">
      <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden>
        <path d="M8 4h8v1.2c2.4.4 3.6 1.8 3.8 4.2h-2.3c-.2-1.3-.8-2.1-2.1-2.4V12c0 1.7-1.2 3.1-3.4 3.5V17h2.4v1.6H9.6V17H12v-1.5C9.8 15.1 8.6 13.7 8.6 12V6.96c-1.3.3-1.9 1.1-2.1 2.44H4.2C4.4 7 5.6 5.6 8 5.2V4z" />
      </svg>
    </Circle>
  );
}
