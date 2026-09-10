import type { ResourceKey } from "./game-data";
import { RESOURCE_KEYS } from "./game-data";
import { periodId, periodLabel, type StatDim } from "./game-date";
import type { LedgerEntry, Resources } from "./store";

export type Flow = { income: number; expense: number; net: number; count: number };

export function emptyFlow(): Flow {
  return { income: 0, expense: 0, net: 0, count: 0 };
}

export function emptyFlows(): Record<ResourceKey, Flow> {
  return {
    whiteGold: emptyFlow(),
    tianji: emptyFlow(),
    fuchuan: emptyFlow(),
    zhuyu: emptyFlow(),
  };
}

function addTo(flow: Flow, amount: number) {
  if (amount > 0) flow.income += amount;
  else if (amount < 0) flow.expense += -amount;
  flow.net += amount;
  flow.count += 1;
}

export function summarizePeriod(entries: LedgerEntry[]) {
  const flows = emptyFlows();
  for (const e of entries) addTo(flows[e.key], e.amount);
  return flows;
}

export type PeriodBlock = {
  id: string;
  label: string;
  flows: Record<ResourceKey, Flow>;
};

export function groupByPeriod(entries: LedgerEntry[], dim: StatDim): PeriodBlock[] {
  const map = new Map<string, LedgerEntry[]>();
  for (const e of entries) {
    const id = periodId(e.date, dim);
    const list = map.get(id);
    if (list) list.push(e);
    else map.set(id, [e]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([id, list]) => ({
      id,
      label: periodLabel(id, dim),
      flows: summarizePeriod(list),
    }));
}

export function reasonBreakdown(
  entries: LedgerEntry[],
  key: ResourceKey,
  side: "income" | "expense",
) {
  const bag = new Map<string, { value: number; count: number }>();
  for (const e of entries) {
    if (e.key !== key) continue;
    if (side === "income" && e.amount <= 0) continue;
    if (side === "expense" && e.amount >= 0) continue;
    const value = Math.abs(e.amount);
    const cur = bag.get(e.reason) ?? { value: 0, count: 0 };
    cur.value += value;
    cur.count += 1;
    bag.set(e.reason, cur);
  }
  const total = [...bag.values()].reduce((s, v) => s + v.value, 0);
  return [...bag.entries()]
    .map(([name, v]) => ({
      name,
      value: v.value,
      count: v.count,
      pct: total ? v.value / total : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function filterEntries(
  entries: LedgerEntry[],
  opts: { date?: string | null; dim?: StatDim; period?: string | null },
) {
  return entries.filter((e) => {
    if (opts.date && e.date !== opts.date) return false;
    if (opts.dim && opts.period && periodId(e.date, opts.dim) !== opts.period) return false;
    return true;
  });
}

export function asStock(resources: Resources): Record<ResourceKey, number> {
  return {
    whiteGold: resources.whiteGold,
    tianji: resources.tianji,
    fuchuan: resources.fuchuan,
    zhuyu: resources.zhuyu,
  };
}

export { RESOURCE_KEYS };
