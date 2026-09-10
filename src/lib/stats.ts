import type { Pool, PullRecord } from "./store";

export type NameCount = { name: string; count: number };

export type OverviewStats = {
  totalPulls: number;
  totalSsr: number;
  avg: number;
  topSsr: NameCount | null;
  topOff: NameCount | null;
  perm: { pulls: number; ssr: number; avg: number };
  up: {
    pulls: number;
    ssr: number;
    upHits: number;
    avg: number;
    noOffRate: number;
  };
};

export function formatAvg(n: number, digits = 1) {
  if (!n || !Number.isFinite(n)) return "--";
  return n.toFixed(digits);
}

function bump(map: Map<string, number>, name: string) {
  map.set(name, (map.get(name) ?? 0) + 1);
}

function top(map: Map<string, number>): NameCount | null {
  let best: NameCount | null = null;
  for (const [name, count] of map) {
    if (!best || count > best.count) best = { name, count };
  }
  return best;
}

export function noOffStats(pulls: PullRecord[]) {
  let guaranteed = false;
  let attempts = 0;
  let hits = 0;

  for (const pull of pulls.slice().reverse()) {
    for (const drop of pull.drops) {
      if (!guaranteed) {
        attempts += 1;
        if (drop.isUp) hits += 1;
      }
      guaranteed = !drop.isUp;
    }
  }

  return { attempts, hits, rate: attempts ? hits / attempts : 0 };
}

export function overviewStats(pools: Pool[], pulls: PullRecord[]): OverviewStats {
  const byId = new Map(pools.map((p) => [p.id, p]));
  let totalPulls = 0;
  let totalSsr = 0;
  const ssrCount = new Map<string, number>();
  const offCount = new Map<string, number>();
  let permPulls = 0;
  let permSsr = 0;
  let upPulls = 0;
  let upSsr = 0;
  let upHits = 0;

  for (const pull of pulls) {
    const pool = byId.get(pull.poolId);
    if (!pool) continue;
    totalPulls += pull.count;
    const perm = pool.type !== "limited";
    if (perm) permPulls += pull.count;
    else upPulls += pull.count;

    for (const drop of pull.drops) {
      totalSsr += 1;
      bump(ssrCount, drop.name);
      if (perm) {
        permSsr += 1;
        continue;
      }
      upSsr += 1;
      if (drop.isUp) upHits += 1;
      else bump(offCount, drop.name);
    }
  }

  let noOffAttempts = 0;
  let noOffHits = 0;
  for (const pool of pools) {
    if (pool.type !== "limited") continue;
    const result = noOffStats(pulls.filter((pull) => pull.poolId === pool.id));
    noOffAttempts += result.attempts;
    noOffHits += result.hits;
  }

  return {
    totalPulls,
    totalSsr,
    avg: totalSsr ? totalPulls / totalSsr : 0,
    topSsr: top(ssrCount),
    topOff: top(offCount),
    perm: {
      pulls: permPulls,
      ssr: permSsr,
      avg: permSsr ? permPulls / permSsr : 0,
    },
    up: {
      pulls: upPulls,
      ssr: upSsr,
      upHits,
      avg: upSsr ? upPulls / upSsr : 0,
      noOffRate: noOffAttempts ? noOffHits / noOffAttempts : 0,
    },
  };
}

export function poolStats(poolId: string, pulls: PullRecord[]) {
  const mine = pulls.filter((p) => p.poolId === poolId);
  const count = mine.reduce((s, p) => s + p.count, 0);
  const ssr = mine.reduce((s, p) => s + p.drops.length, 0);
  const upHits = mine.reduce(
    (s, p) => s + p.drops.filter((d) => d.isUp).length,
    0,
  );
  const noOff = noOffStats(mine);
  return {
    pulls: count,
    ssr,
    upHits,
    avg: ssr ? count / ssr : 0,
    noOffRate: noOff.rate,
    history: mine,
  };
}
