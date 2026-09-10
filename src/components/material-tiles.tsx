"use client";

import { RESOURCE_META, type ResourceKey } from "@/lib/game-data";
import type { Flow } from "@/lib/ledger";
import { cn, formatInt } from "@/lib/utils";

export function MaterialTiles({
  values,
  extra,
  onSelect,
}: {
  values: Record<ResourceKey, number>;
  extra?: Record<ResourceKey, Flow>;
  onSelect?: (key: ResourceKey) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {RESOURCE_META.map((m) => {
        const flow = extra?.[m.key];
        return (
          <button
            key={m.key}
            type="button"
            onClick={onSelect ? () => onSelect(m.key) : undefined}
            className={cn(
              "overflow-hidden rounded-lg text-left",
              onSelect ? "" : "cursor-default",
            )}
          >
            <div className={cn("py-1 text-center text-[11px] font-medium", m.head)}>
              {m.label}
            </div>
            <div className={cn("px-1 py-2.5 text-center", m.body)}>
              <p className={cn("text-[17px] font-semibold tabular leading-none", m.num)}>
                {formatInt(values[m.key])}
              </p>
              {flow ? (
                <div className="mt-1.5 space-y-0.5 text-[10px] leading-tight">
                  <p className={m.num}>收益：{formatInt(flow.income)}</p>
                  <p className="text-loss">消耗：{formatInt(flow.expense)}</p>
                </div>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
