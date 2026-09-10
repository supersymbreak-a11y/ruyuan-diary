"use client";

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { AppHeader, HydrateGate, PhoneFrame } from "@/components/shell";
import {
  isResourceKey,
  reasonColor,
  RESOURCE_META,
  type LedgerSide,
  type ResourceKey,
} from "@/lib/game-data";
import { periodLabel, type StatDim } from "@/lib/game-date";
import { filterEntries, reasonBreakdown } from "@/lib/ledger";
import { useNotes } from "@/lib/store";
import { cn, formatInt } from "@/lib/utils";

type Search = { dim: StatDim; period: string; side: LedgerSide };

export const Route = createFileRoute("/daily_/stat/$key")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    dim: s.dim === "month" || s.dim === "year" ? s.dim : "week",
    period: typeof s.period === "string" ? s.period : "",
    side: s.side === "expense" ? "expense" : "income",
  }),
  component: StatRoute,
});

function StatRoute() {
  const { key } = Route.useParams();
  const navigate = Route.useNavigate();
  const goBack = () =>
    void navigate({ to: "/daily", search: { tab: "stats" } });

  if (!isResourceKey(key)) {
    return (
      <HydrateGate>
        <PhoneFrame>
          <AppHeader title="统计" onBack={goBack} />
          <p className="p-6 text-sm text-hint">未知材料</p>
        </PhoneFrame>
      </HydrateGate>
    );
  }
  return (
    <HydrateGate>
      <PhoneFrame>
        <AppHeader title="统计" onBack={goBack} />
        <StatPage resourceKey={key} />
      </PhoneFrame>
    </HydrateGate>
  );
}

function StatPage({ resourceKey }: { resourceKey: ResourceKey }) {
  const { dim, period, side } = Route.useSearch();
  const navigate = Route.useNavigate();
  const ledger = useNotes((s) => s.ledger);
  const meta = RESOURCE_META.find((m) => m.key === resourceKey)!;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  const year = String(new Date().getFullYear());
  const effectiveDim: StatDim = period ? dim : "year";
  const effectivePeriod = period || year;

  const scoped = useMemo(() => {
    if (!period) {
      return filterEntries(ledger, { dim: "year", period: year });
    }
    return filterEntries(ledger, { dim, period });
  }, [ledger, dim, period, year]);

  const rows = useMemo(
    () => reasonBreakdown(scoped, resourceKey, side),
    [scoped, resourceKey, side],
  );
  const total = rows.reduce((s, r) => s + r.value, 0);
  const label = periodLabel(effectivePeriod, effectiveDim);

  const setSide = (next: LedgerSide) => {
    void navigate({
      to: "/daily/stat/$key",
      params: { key: resourceKey },
      search: { dim, period, side: next },
    });
  };

  return (
    <main className="flex-1 overflow-y-auto bg-white px-4 pb-8 pt-3">
      <div className="mb-2 flex items-end justify-between">
        <h2 className="flex items-center gap-2 text-lg font-medium text-brown-deep">
          <span className="h-4 w-1 rounded-full bg-gold-deep" />
          {meta.label}
        </h2>
        <span className="text-sm text-gold-deep">{label}</span>
      </div>

      <div className="flex items-end justify-center gap-12">
        <SideTab active={side === "income"} onClick={() => setSide("income")}>
          收益
        </SideTab>
        <SideTab active={side === "expense"} onClick={() => setSide("expense")}>
          消耗
        </SideTab>
      </div>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-hint">
          这一期还没有{side === "income" ? "收益" : "消耗"}
        </p>
      ) : (
        <>
          <div className="mx-auto h-56 w-full max-w-sm">
            {ready ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={rows}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={1.5}
                    stroke="none"
                    label={({ percent }) =>
                      percent && percent >= 0.035
                        ? `${(percent * 100).toFixed(2)}%`
                        : ""
                    }
                  >
                    {rows.map((r) => (
                      <Cell key={r.name} fill={reasonColor(r.name)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[12px] text-ink">
            {rows.map((r) => (
              <li key={r.name} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: reasonColor(r.name) }}
                />
                {r.name}
              </li>
            ))}
          </ul>

          <ul className="mt-6 space-y-5">
            {rows.map((r) => (
              <li key={r.name}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-medium text-brown-deep">{r.name}</span>
                  <span className="text-[17px] font-semibold tabular text-brown-deep">
                    {formatInt(r.value)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, r.pct * 100)}%`,
                      background: reasonColor(r.name),
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[12px] text-hint">
                  <span>{r.count}笔</span>
                  <span>{(r.pct * 100).toFixed(2)}%</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-xs text-hint">合计 {formatInt(total)}</p>
        </>
      )}
    </main>
  );
}

function SideTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative pb-2 text-[15px]",
        active ? "font-medium text-brown-deep" : "text-hint",
      )}
    >
      {children}
      {active ? (
        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brown-deep" />
      ) : null}
    </button>
  );
}
