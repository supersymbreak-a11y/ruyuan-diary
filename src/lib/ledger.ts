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

/**
 * Display legacy monthly-shop voucher records with the current source label.
 * Older conversion rows share "兑换符传" with regular purchases, so identify
 * monthly-shop rows by their paired 1600 白金币 : 10 符传 conversion.
 */
export function ledgerReasonLabels(entries: LedgerEntry[]) {
  const monthlyShopIds = new Set<string>();
  const legacyVoucherEntries = entries.filter((entry) => entry.reason === "兑换符传");

  for (const entry of legacyVoucherEntries) {
    const isMonthlyShopConversion = legacyVoucherEntries.some((other) => {
      if (other === entry || other.date !== entry.date) return false;
      return entry.key === "whiteGold" && entry.amount < 0 && other.key === "fuchuan" && other.amount > 0
        ? Math.abs(entry.amount) === other.amount * 160
        : entry.key === "fuchuan" && entry.amount > 0 && other.key === "whiteGold" && other.amount < 0
          ? Math.abs(other.amount) === entry.amount * 160
          : false;
    });
    if (isMonthlyShopConversion) monthlyShopIds.add(entry.id);
  }

  return new Map(
    entries.map((entry) => [
      entry.id,
      entry.reason === "月卡符传" || monthlyShopIds.has(entry.id)
        ? "月卡商店符传"
        : entry.reason,
    ]),
  );
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
  const reasonLabels = ledgerReasonLabels(entries);
  for (const e of entries) {
    if (e.key !== key) continue;
    if (side === "income" && e.amount <= 0) continue;
    if (side === "expense" && e.amount >= 0) continue;
    const displayReason = reasonLabels.get(e.id) ?? e.reason;
    const isWhiteGoldExchange =
      side === "income" &&
      ((key === "tianji" && ["白金币购买", "兑换天机符传"].includes(displayReason)) ||
        (key === "fuchuan" && ["白金币购买", "月卡商店符传"].includes(displayReason)));
    const isFuchuanConversionExpense =
      key === "whiteGold" &&
      side === "expense" &&
      ["符传", "月卡商店符传"].includes(displayReason);
    const reason =
      isFuchuanConversionExpense
        ? "兑换符传"
        : isWhiteGoldExchange
        ? "白金币兑换"
        : key === "whiteGold" &&
            side === "income" &&
            ["兑换白金币", "每日茱萸", "茱萸转化"].includes(e.reason)
          ? "茱萸转化"
          : displayReason;
    const value = Math.abs(e.amount);
    const cur = bag.get(reason) ?? { value: 0, count: 0 };
    cur.value += value;
    cur.count += 1;
    bag.set(reason, cur);
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
