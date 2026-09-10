"use client";

import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Coins, ScrollText } from "lucide-react";
import { useNotes } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BackupNavItem } from "./backup-nav";

export function HydrateGate({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(() => useNotes.persist.hasHydrated());

  useEffect(() => {
    let active = true;
    const finish = () => {
      if (active) setHydrated(true);
    };
    if (useNotes.persist.hasHydrated()) finish();
    else {
      const unsubscribe = useNotes.persist.onFinishHydration(finish);
      void useNotes.persist.rehydrate();
      return () => {
        active = false;
        unsubscribe();
      };
    }
    const t = setInterval(() => useNotes.getState().tickCalendar(), 30_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);
  return hydrated ? <>{children}</> : null;
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-cream-deep md:bg-brown/15">
      <div className="relative mx-auto flex h-dvh max-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-app shadow-card">
        {children}
      </div>
    </div>
  );
}

export function AppHeader({
  title,
  backTo,
  onBack,
  right,
}: {
  title: string;
  backTo?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="relative z-10 flex h-12 shrink-0 items-center justify-center bg-card px-12">
      {backTo || onBack ? (
        <button
          type="button"
          aria-label="返回"
          onClick={() => {
            if (onBack) onBack();
            else if (backTo) void navigate({ to: backTo });
          }}
          className="absolute left-1 flex size-11 items-center justify-center text-ink"
        >
          <ChevronLeft className="size-6" strokeWidth={1.75} />
        </button>
      ) : null}
      <h1 className="text-[17px] font-medium tracking-wide text-ink">{title}</h1>
      {right ? <div className="absolute right-3">{right}</div> : null}
    </header>
  );
}

export function TabBar({ current }: { current: "daily" | "gacha" }) {
  return (
    <nav
      className="z-20 grid shrink-0 grid-cols-3 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]"
      aria-label="主导航"
    >
      <TabLink to="/" active={current === "gacha"} icon={<ScrollText className="size-5" />} label="招募" />
      <TabLink
        to="/daily"
        active={current === "daily"}
        icon={<Coins className="size-5" />}
        label="资源"
      />
      <BackupNavItem />
    </nav>
  );
}

function TabLink({
  to,
  active,
  icon,
  label,
}: {
  to: "/" | "/daily";
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
        active ? "text-gold-deep" : "text-muted-fg",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-xs text-hint">{label}</p>
      {children}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-wash-top px-3 text-sm text-ink outline-none ring-gold placeholder:text-muted-fg focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
