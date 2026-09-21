"use client";

import { coverSrc, isCustomCover } from "@/lib/game-data";
import type { Pool } from "@/lib/store";
import { cn } from "@/lib/utils";

type Stats = { pulls: number; ssr: number; avg: number; noOffRate: number };

export function PoolCard({
  pool,
  stats,
  onOpen,
  onEdit,
  expanded = false,
}: {
  pool: Pool;
  stats: Stats;
  onOpen: () => void;
  onEdit: () => void;
  expanded?: boolean;
}) {
  return (
    <div
      className="relative z-10 flex h-[108px] overflow-hidden rounded-2xl shadow-card"
    >
      <button
        type="button"
        onClick={onOpen}
        className="relative flex min-w-0 flex-1 overflow-hidden rounded-l-2xl bg-neutral-400 text-left"
        aria-label={`${pool.name}详情`}
        aria-expanded={expanded}
      >
        <div className="absolute inset-0">
          {isCustomCover(pool.cover) ? (
            <img
              src={coverSrc(pool.cover)}
              alt=""
              className={cn(
                "h-full w-full origin-left scale-[1.04] object-cover",
                pool.name === "契阔谈宴"
                  ? "origin-left scale-[1.04_1.085] object-left"
                  : pool.name === "欺天罔地"
                  ? "origin-left -translate-x-3 scale-[1.08] object-left"
                  : pool.name === "弹剑酿花"
                    ? "object-left"
                    : "object-left",
              )}
            />
          ) : null}
          <div className="pool-cover-shade absolute inset-0" />
          <span className="absolute bottom-1 left-1 rounded-md bg-gold-bar px-2 py-0.5 text-base font-medium text-card">
            {pool.name}
          </span>
        </div>
        <div className="pool-stats-panel relative flex min-w-0 flex-1 flex-col justify-center gap-1 pl-4 pr-4 text-card">
          <StatLine label="总次数" value={stats.pulls} />
          <StatLine label="总绝密数" value={stats.ssr} />
          <StatLine
            label="平均出绝密次数"
            value={stats.ssr ? Math.round(stats.avg) : "--"}
          />
          {pool.type === "limited" ? (
            <StatLine
              label="小保底不歪比例"
              value={`${Math.round(stats.noOffRate * 100)}%`}
            />
          ) : null}
        </div>
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-r-2xl bg-edit text-base font-medium text-card"
      >
        <span>编</span>
        <span>辑</span>
      </button>
    </div>
  );
}

function StatLine({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap text-[13px] leading-none">
      <span className="shrink-0 text-card/85">{label}</span>
      <span className={cn("tabular text-[13px] font-semibold leading-none text-card")}>{value}</span>
    </div>
  );
}
