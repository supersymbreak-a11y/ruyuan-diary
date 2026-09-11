"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "./utils";
import { getGameDate, getGameWeekId } from "./game-date";
import { DEFAULT_POOLS, type ResourceKey } from "./game-data";

export type PoolType = "permanent" | "anniversary" | "limited";

export type SsrDrop = {
  name: string;
  isUp: boolean;
  /** The user-facing ordinal for this pity record (for example, the 77th). */
  pityNumber?: number;
  /** Draws spent before this agent was recruited. */
  pullsToSsr?: number;
};

export type PullRecord = {
  id: string;
  poolId: string;
  count: number;
  drops: SsrDrop[];
  pityBefore: number;
  pityAfter: number;
  upPityBefore: number;
  upPityAfter: number;
  guaranteedUpBefore: boolean;
  guaranteedUpAfter: boolean;
  at: string;
};

export type Pool = {
  id: string;
  name: string;
  type: PoolType;
  upNames: string[];
  pity: number;
  upPity: number;
  guaranteedUp: boolean;
  cover: string;
  archived: boolean;
  createdAt: string;
};

export type Resources = {
  whiteGold: number;
  tianji: number;
  fuchuan: number;
  zhuyu: number;
};

export type LedgerEntry = {
  id: string;
  date: string;
  key: ResourceKey;
  amount: number;
  reason: string;
  at: string;
  pullId?: string;
};

type Calendar = {
  daily: { date: string; tasks: Record<string, number> };
  weekly: { weekId: string; tasks: Record<string, number> };
};

export type NotesData = {
  nickname: string;
  pools: Pool[];
  pulls: PullRecord[];
  resources: Resources;
  ledger: LedgerEntry[];
  daily: Calendar["daily"];
  weekly: Calendar["weekly"];
  deductOnPull: boolean;
};

type NotesState = NotesData & {
  setNickname: (n: string) => void;
  tickCalendar: () => void;
  addPool: (input: {
    name: string;
    type: PoolType;
    upNames: string[];
    cover: string;
    pity?: number;
    upPity?: number;
  }) => string;
  updatePool: (id: string, patch: Partial<Pool>) => void;
  mergeSharedPools: (definitions: Array<Pick<Pool, "id" | "name" | "type" | "upNames" | "cover" | "archived" | "createdAt">>) => void;
  archivePool: (id: string) => void;
  recordPull: (poolId: string, count: number, drops: SsrDrop[]) => void;
  removeRecruitment: (pullId: string, dropIndex: number) => void;
  undoLastPull: (poolId?: string) => void;
  addResource: (key: ResourceKey, delta: number) => void;
  setResource: (key: ResourceKey, value: number) => void;
  setResources: (patch: Partial<Resources>) => void;
  addLedger: (input: {
    key: ResourceKey;
    amount: number;
    reason: string;
    date?: string;
    pullId?: string;
  }) => void;
  removeLedger: (id: string) => void;
  bumpTask: (id: string, max: number, scope: "daily" | "weekly") => void;
  setTask: (id: string, value: number, scope: "daily" | "weekly") => void;
  setDeductOnPull: (v: boolean) => void;
  importJson: (json: string) => void;
  resetAll: () => void;
};

function normalizePools(pools: Pool[]): Pool[] {
  const permanent = pools.find((pool) => pool.id === "permanent") ?? { ...DEFAULT_POOLS[0] };
  return [
    { ...permanent, type: "permanent", archived: false },
    ...pools.filter((pool) => pool.id !== "permanent" && pool.id !== "limited-current").map((pool): Pool => {
      const type: PoolType = pool.type === "anniversary" ? "anniversary" : "limited";
      return {
        ...pool,
        type,
        upNames: type === "limited" ? pool.upNames : [],
        upPity: type === "limited" ? pool.upPity : 0,
        guaranteedUp: type === "limited" ? pool.guaranteedUp : false,
      };
    }),
  ];
}

function emptyResources(): Resources {
  return { whiteGold: 0, tianji: 0, fuchuan: 0, zhuyu: 0 };
}

function seed(): NotesData {
  return {
    nickname: "殿下",
    pools: DEFAULT_POOLS.map((p) => ({ ...p })),
    pulls: [],
    resources: emptyResources(),
    ledger: [],
    daily: { date: getGameDate(), tasks: {} },
    weekly: { weekId: getGameWeekId(), tasks: {} },
    deductOnPull: true,
  };
}

function withCalendar<T extends Calendar>(s: T): T {
  const date = getGameDate();
  const weekId = getGameWeekId();
  return {
    ...s,
    daily: s.daily.date === date ? s.daily : { date, tasks: {} },
    weekly: s.weekly.weekId === weekId ? s.weekly : { weekId, tasks: {} },
  };
}

function applyPity(pool: Pool, count: number, drops: SsrDrop[]) {
  let pity = pool.pity;
  let upPity = pool.upPity;
  let guaranteedUp = pool.guaranteedUp;
  const resolved: SsrDrop[] = [];

  if (drops.length === 0) {
    pity = Math.min(40, pity + count);
    if (pool.type === "limited") upPity = Math.min(80, upPity + count);
    return { pity, upPity, guaranteedUp, resolved };
  }

  for (const drop of drops) {
    const namedUp = pool.upNames.includes(drop.name);
    let isUp = drop.isUp || namedUp;
    if (pool.type !== "limited") isUp = false;
    if (pool.type === "limited" && guaranteedUp) isUp = true;
    resolved.push({
      name: drop.name.trim() || "未知绝密",
      isUp,
      pityNumber: drop.pityNumber,
      pullsToSsr: drop.pullsToSsr,
    });
    pity = 0;
    if (pool.type === "limited") {
      if (isUp) {
        upPity = 0;
        guaranteedUp = false;
      } else {
        upPity = 0;
        guaranteedUp = true;
      }
    }
  }
  return { pity, upPity, guaranteedUp, resolved };
}

export const useNotes = create<NotesState>()(
  persist(
    (set, get) => ({
      ...seed(),

      setNickname: (n) => set({ nickname: n.trim() || "殿下" }),

      tickCalendar: () => set((s) => withCalendar(s)),

      addPool: (input) => {
        const id = uid();
        const pool: Pool = {
          id,
          name: input.name.trim() || "未名卡池",
          type: input.type === "anniversary" ? "anniversary" : "limited",
          upNames: input.type === "limited" ? input.upNames.map((n) => n.trim()).filter(Boolean) : [],
          cover: input.cover,
          pity: Math.max(0, Math.min(39, input.pity ?? 0)),
          upPity: input.type === "limited" ? Math.max(0, Math.min(79, input.upPity ?? 0)) : 0,
          guaranteedUp: false,
          archived: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ pools: [pool, ...s.pools] }));
        return id;
      },

      updatePool: (id, patch) =>
        set((s) => ({
          pools: s.pools.map((p) => {
            if (p.id !== id) return p;
            const type: PoolType = p.id === "permanent"
              ? "permanent"
              : patch.type === "anniversary" || (patch.type === undefined && p.type === "anniversary")
                ? "anniversary"
                : "limited";
            return {
              ...p,
              ...patch,
              id: p.id,
              type,
              upNames: type === "limited" ? (patch.upNames ?? p.upNames) : [],
              upPity: type === "limited" ? (patch.upPity ?? p.upPity) : 0,
              guaranteedUp: type === "limited" ? (patch.guaranteedUp ?? p.guaranteedUp) : false,
            };
          }),
        })),

      mergeSharedPools: (definitions) =>
        set((s) => {
          const localById = new Map(s.pools.map((pool) => [pool.id, pool]));
          const merged = definitions.map((definition): Pool => {
            const local = localById.get(definition.id);
            return {
              ...definition,
              pity: local?.pity ?? 0,
              upPity: definition.type === "limited" ? (local?.upPity ?? 0) : 0,
              guaranteedUp: definition.type === "limited" ? (local?.guaranteedUp ?? false) : false,
            };
          });
          return { pools: normalizePools(merged) };
        }),

      archivePool: (id) =>
        set((s) => ({
          pools: s.pools.map((p) =>
            p.id === id ? { ...p, archived: true } : p,
          ),
        })),

      recordPull: (poolId, count, drops) => {
        const state = get();
        const pool = state.pools.find((p) => p.id === poolId);
        if (!pool || count <= 0) return;
        const before = {
          pity: pool.pity,
          upPity: pool.upPity,
          guaranteedUp: pool.guaranteedUp,
        };
        const after = applyPity(pool, count, drops);
        const rec: PullRecord = {
          id: uid(),
          poolId,
          count,
          drops: after.resolved,
          pityBefore: before.pity,
          pityAfter: after.pity,
          upPityBefore: before.upPity,
          upPityAfter: after.upPity,
          guaranteedUpBefore: before.guaranteedUp,
          guaranteedUpAfter: after.guaranteedUp,
          at: new Date().toISOString(),
        };
        set({
          pulls: [rec, ...state.pulls],
          pools: state.pools.map((p) =>
            p.id === poolId
              ? {
                  ...p,
                  pity: after.pity,
                  upPity: after.upPity,
                  guaranteedUp: after.guaranteedUp,
                }
              : p,
          ),
        });
      },

      removeRecruitment: (pullId, dropIndex) => {
        const state = get();
        const rec = state.pulls.find((pull) => pull.id === pullId);
        if (!rec || !rec.drops[dropIndex]) return;

        if (rec.drops.length > 1) {
          set({
            pulls: state.pulls.map((pull) =>
              pull.id === pullId
                ? { ...pull, drops: pull.drops.filter((_, index) => index !== dropIndex) }
                : pull,
            ),
          });
          return;
        }

        const isLatestForPool = state.pulls.find((pull) => pull.poolId === rec.poolId)?.id === rec.id;

        set({
          pulls: state.pulls.filter((pull) => pull.id !== rec.id),
          pools: state.pools.map((pool) =>
            pool.id === rec.poolId && isLatestForPool
              ? {
                  ...pool,
                  pity: rec.pityBefore,
                  upPity: rec.upPityBefore,
                  guaranteedUp: rec.guaranteedUpBefore,
                }
              : pool,
          ),
        });
      },

      undoLastPull: (poolId) => {
        const state = get();
        const rec = state.pulls.find((p) => (poolId ? p.poolId === poolId : true));
        if (!rec) return;
        set({
          pulls: state.pulls.filter((p) => p.id !== rec.id),
          pools: state.pools.map((p) =>
            p.id === rec.poolId
              ? {
                  ...p,
                  pity: rec.pityBefore,
                  upPity: rec.upPityBefore,
                  guaranteedUp: rec.guaranteedUpBefore,
                }
              : p,
          ),
        });
      },

      addResource: (key, delta) =>
        set((s) => ({
          resources: {
            ...s.resources,
            [key]: Math.max(0, s.resources[key] + delta),
          },
        })),

      setResource: (key, value) =>
        set((s) => ({
          resources: { ...s.resources, [key]: Math.max(0, Math.round(value)) },
        })),

      setResources: (patch) =>
        set((s) => ({
          resources: {
            ...s.resources,
            ...Object.fromEntries(
              Object.entries(patch).map(([k, v]) => [k, Math.max(0, Math.round(Number(v) || 0))]),
            ),
          },
        })),

      addLedger: (input) => {
        const amount = Math.round(input.amount);
        if (!amount) return;
        const entry: LedgerEntry = {
          id: uid(),
          date: input.date || getGameDate(),
          key: input.key,
          amount,
          reason: input.reason.trim() || "其他",
          at: new Date().toISOString(),
          pullId: input.pullId,
        };
        set((s) => ({
          ledger: [entry, ...s.ledger],
          resources: {
            ...s.resources,
            [input.key]: Math.max(0, s.resources[input.key] + amount),
          },
        }));
      },

      removeLedger: (id) =>
        set((s) => {
          const entry = s.ledger.find((e) => e.id === id);
          if (!entry) return s;
          return {
            ledger: s.ledger.filter((e) => e.id !== id),
            resources: {
              ...s.resources,
              [entry.key]: Math.max(0, s.resources[entry.key] - entry.amount),
            },
          };
        }),

      bumpTask: (id, max, scope) =>
        set((s) => {
          const cal = withCalendar(s);
          const bucket = scope === "daily" ? cal.daily : cal.weekly;
          const cur = bucket.tasks[id] ?? 0;
          const next = cur >= max ? 0 : cur + 1;
          const tasks = { ...bucket.tasks, [id]: next };
          return scope === "daily"
            ? { ...cal, daily: { ...cal.daily, tasks } }
            : { ...cal, weekly: { ...cal.weekly, tasks } };
        }),

      setTask: (id, value, scope) =>
        set((s) => {
          const cal = withCalendar(s);
          const bucket = scope === "daily" ? cal.daily : cal.weekly;
          const tasks = { ...bucket.tasks, [id]: Math.max(0, value) };
          return scope === "daily"
            ? { ...cal, daily: { ...cal.daily, tasks } }
            : { ...cal, weekly: { ...cal.weekly, tasks } };
        }),

      setDeductOnPull: (v) => set({ deductOnPull: v }),

      importJson: (json) => {
        const parsed = JSON.parse(json) as Partial<NotesData> & {
          resources?: Partial<Resources> & { copper?: number };
        };
        const base = seed();
        const copper = parsed.resources?.copper ?? 0;
        set({
          nickname: parsed.nickname || base.nickname,
          pools: normalizePools(parsed.pools?.length ? parsed.pools : base.pools),
          pulls: parsed.pulls ?? [],
          resources: {
            whiteGold: parsed.resources?.whiteGold ?? 0,
            tianji: parsed.resources?.tianji ?? 0,
            fuchuan: parsed.resources?.fuchuan ?? 0,
            zhuyu: parsed.resources?.zhuyu ?? copper,
          },
          ledger: parsed.ledger ?? [],
          daily: parsed.daily ?? base.daily,
          weekly: parsed.weekly ?? base.weekly,
          deductOnPull: parsed.deductOnPull ?? true,
        });
      },

      resetAll: () => set(seed()),
    }),
    {
      name: "ruyuan-notes-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.pools = normalizePools(state.pools);
        const res = state.resources as Resources & { copper?: number };
        if (res && ("copper" in res || typeof res.zhuyu !== "number")) {
          state.resources = {
            whiteGold: res.whiteGold ?? 0,
            tianji: res.tianji ?? 0,
            fuchuan: res.fuchuan ?? 0,
            zhuyu: res.zhuyu ?? res.copper ?? 0,
          };
        }
        if (!Array.isArray(state.ledger)) state.ledger = [];
      },
      partialize: (s) => ({
        nickname: s.nickname,
        pools: s.pools,
        pulls: s.pulls,
        resources: s.resources,
        ledger: s.ledger,
        daily: s.daily,
        weekly: s.weekly,
        deductOnPull: s.deductOnPull,
      }),
    },
  ),
);
