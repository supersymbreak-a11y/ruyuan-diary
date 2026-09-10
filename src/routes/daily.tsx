"use client";

import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronRight, Trash2 } from "lucide-react";
import { MaterialTiles } from "@/components/material-tiles";
import {
  AddRecordSheet,
  CheckInSheet,
  DateFilterSheet,
  DimSheet,
  StockSheet,
} from "@/components/resource-sheets";
import { AppHeader, HydrateGate, PhoneFrame, TabBar } from "@/components/shell";
import { RESOURCE_META, type ResourceKey } from "@/lib/game-data";
import { DIM_OPTIONS, formatMd, type StatDim } from "@/lib/game-date";
import { asStock, filterEntries, groupByPeriod } from "@/lib/ledger";
import { useNotes } from "@/lib/store";
import { cn, formatInt } from "@/lib/utils";

type TabId = "ledger" | "stats";

export const Route = createFileRoute("/daily")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: s.tab === "stats" ? ("stats" as const) : ("ledger" as const),
  }),
  component: DailyRoute,
});

function DailyRoute() {
  return (
    <HydrateGate>
      <PhoneFrame>
        <AppHeader title="资源记录" />
        <DailyPage />
        <TabBar current="daily" />
      </PhoneFrame>
    </HydrateGate>
  );
}

function DailyPage() {
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const nickname = useNotes((s) => s.nickname);
  const resources = useNotes((s) => s.resources);
  const ledger = useNotes((s) => s.ledger);
  const removeLedger = useNotes((s) => s.removeLedger);

  const [stockOpen, setStockOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [dimOpen, setDimOpen] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [dim, setDim] = useState<StatDim>("week");

  const dates = useMemo(
    () => [...new Set(ledger.map((e) => e.date))].sort().reverse(),
    [ledger],
  );
  const visible = useMemo(
    () => filterEntries(ledger, { date }),
    [ledger, date],
  );
  const periods = useMemo(() => groupByPeriod(ledger, dim), [ledger, dim]);

  const setTab = (next: TabId) => {
    void navigate({ to: "/daily", search: { tab: next }, replace: true });
  };

  const openStat = (key: ResourceKey, period?: string) => {
    void navigate({
      to: "/daily/stat/$key",
      params: { key },
      search: { dim, period: period ?? "", side: "income" },
    });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="bg-gold-bar px-4 py-2.5 text-[15px] font-medium text-brown-deep">
          当前角色：{nickname}
        </div>

        <section className="bg-card px-4 py-3">
          <div className="mb-2.5 flex items-center gap-3 text-[13px]">
            <h2 className="font-medium text-brown-deep">材料库存</h2>
            <button
              type="button"
              className="ml-auto text-hint"
              onClick={() => setStockOpen(true)}
            >
              设置基础库存
            </button>
            <button
              type="button"
              className="text-hint"
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? "展开" : "收起"}
            </button>
          </div>
          {collapsed ? null : (
            <MaterialTiles
              values={asStock(resources)}
            />
          )}
        </section>

        <div className="flex items-end justify-center gap-10 bg-card pt-1">
          <TabBtn active={tab === "ledger"} onClick={() => setTab("ledger")}>
            详细记录
          </TabBtn>
          <TabBtn active={tab === "stats"} onClick={() => setTab("stats")}>
            统计
          </TabBtn>
        </div>

        {tab === "ledger" ? (
          <>
            <button
              type="button"
              onClick={() => setDateOpen(true)}
              className="flex w-full items-center px-4 py-3 text-[13px]"
            >
              <span className="text-hint">查询日期：</span>
              <span className="ml-auto flex items-center text-hint">
                {date ?? "请选择"}
                <ChevronRight className="size-4" />
              </span>
            </button>
            {visible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-hint">
                还没有记录，点右下角添加
              </p>
            ) : (
              <ul className="bg-card">
                {visible.map((e) => {
                  const meta = RESOURCE_META.find((m) => m.key === e.key);
                  const gain = e.amount > 0;
                  return (
                    <li
                      key={e.id}
                      className="flex min-h-12 items-center gap-2 border-t border-line px-4 text-[13px]"
                    >
                      <span className="w-11 shrink-0 tabular text-gold-deep">
                        {formatMd(e.date)}
                      </span>
                      {gain ? (
                        <ArrowUp className="size-3.5 shrink-0 text-gain" />
                      ) : (
                        <ArrowDown className="size-3.5 shrink-0 text-loss" />
                      )}
                      <span className="w-16 shrink-0 text-brown-deep">
                        {meta?.label ?? e.key}
                      </span>
                      <span
                        className={cn(
                          "w-16 shrink-0 tabular",
                          gain ? "text-gain" : "text-loss",
                        )}
                      >
                        {gain ? "+ " : "- "}
                        {formatInt(Math.abs(e.amount))}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-right text-gold-deep">
                        {e.reason}
                      </span>
                      <button
                        type="button"
                        aria-label="删除"
                        onClick={() => removeLedger(e.id)}
                        className="flex size-10 shrink-0 items-center justify-center text-loss"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setDimOpen(true)}
              className="flex w-full items-center px-4 py-3 text-[13px]"
            >
              <span className="text-hint">时间维度：</span>
              <span className="ml-auto flex items-center text-gold-deep">
                {DIM_OPTIONS.find((o) => o.id === dim)?.label}
                <ChevronRight className="size-4 text-hint" />
              </span>
            </button>
            {periods.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-hint">
                有记录后会按{DIM_OPTIONS.find((o) => o.id === dim)?.label.replace("按", "")}汇总
              </p>
            ) : (
              <div className="space-y-5 px-4 pb-4">
                {periods.map((p) => (
                  <section key={p.id}>
                    <h3 className="mb-2.5 text-[15px] font-medium text-brown-deep">
                      {p.label}
                    </h3>
                    <MaterialTiles
                      values={{
                        whiteGold: p.flows.whiteGold.net,
                        tianji: p.flows.tianji.net,
                        fuchuan: p.flows.fuchuan.net,
                        zhuyu: p.flows.zhuyu.net,
                      }}
                      extra={p.flows}
                      onSelect={(key) => openStat(key, p.id)}
                    />
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => setCheckOpen(true)}
          className="pointer-events-auto h-11 rounded-full bg-gain px-6 text-sm font-medium text-card shadow-card"
        >
          日常打卡
        </button>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="pointer-events-auto h-11 rounded-full bg-gold-bar px-6 text-sm font-medium text-brown-deep shadow-card"
        >
          添加记录
        </button>
      </div>

      <StockSheet open={stockOpen} onOpenChange={setStockOpen} />
      <AddRecordSheet open={addOpen} onOpenChange={setAddOpen} />
      <CheckInSheet open={checkOpen} onOpenChange={setCheckOpen} />
      <DateFilterSheet
        open={dateOpen}
        onOpenChange={setDateOpen}
        value={date}
        onChange={setDate}
        dates={dates}
      />
      <DimSheet open={dimOpen} onOpenChange={setDimOpen} value={dim} onChange={setDim} />
    </div>
  );
}

function TabBtn({
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
        active ? "font-medium text-gold-deep" : "text-hint",
      )}
    >
      {children}
      {active ? (
        <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gold-deep" />
      ) : null}
    </button>
  );
}
