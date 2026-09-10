"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Sheet({ open, onOpenChange, title, children, footer }: SheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-banner/45" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] max-w-[430px] flex-col rounded-t-2xl bg-card outline-none",
          )}
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
          <Drawer.Title className="px-5 pt-4 text-center text-base font-medium text-ink">
            {title}
          </Drawer.Title>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? (
            <div className="border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
