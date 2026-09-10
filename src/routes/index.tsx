"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PoolCard } from "@/components/pool-card";
import { NicknameSheet, PoolEditorSheet, PoolHistoryGrid, RecruitmentRecordSheet } from "@/components/pool-sheets";
import { AppHeader, HydrateGate, PhoneFrame, TabBar } from "@/components/shell";
import { IconPulls, IconSsr, IconTrophy } from "@/components/stat-icons";
import { Button } from "@/components/ui/button";
import { formatAvg, overviewStats, poolStats } from "@/lib/stats";
import { useNotes, type Pool } from "@/lib/store";
import { listSharedPools, saveSharedPool, toSharedPool } from "@/lib/shared-pools";

export const Route = createFileRoute("/")({ component: GachaRoute });

function GachaRoute() {
  return (
    <HydrateGate>
      <PhoneFrame>
        <AppHeader title="招募记录" />
        <GachaPage />
        <TabBar current="gacha" />
      </PhoneFrame>
    </HydrateGate>
  );
}

function GachaPage() {
  const nickname = useNotes((s) => s.nickname);
  const pools = useNotes((s) => s.pools);
  const pulls = useNotes((s) => s.pulls);
  const [nickOpen, setNickOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Pool | null>(null);
  const [recordPool, setRecordPool] = useState<Pool | null>(null);
  const [expandedPoolId, setExpandedPoolId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const remote = await listSharedPools();
        const local = useNotes.getState().pools;
        const remoteIds = new Set(remote.map((pool) => pool.id));
        const missing = remote.length === 0
          ? local.map(toSharedPool)
          : local.filter((pool) => !remoteIds.has(pool.id)).map(toSharedPool);

        await Promise.all(missing.map((pool) => saveSharedPool({ data: pool })));
        if (cancelled) return;
        useNotes.getState().mergeSharedPools([...remote, ...missing]);
      } catch (error) {
        console.error("公共卡池同步失败", error);
      }
    };

    if (useNotes.persist.hasHydrated()) void sync();
    const unsubscribe = useNotes.persist.onFinishHydration(() => { void sync(); });
    const syncOnFocus = () => { void sync(); };
    window.addEventListener("focus", syncOnFocus);
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("focus", syncOnFocus);
    };
  }, []);

  const orderedPools = pools
    .filter((p) => !p.archived)
    .sort((a, b) => {
      if (a.id === "permanent") return -1;
      if (b.id === "permanent") return 1;
      // Anniversary pools are always directly below the permanent pool.
      if (a.type === "anniversary" && b.type !== "anniversary") return -1;
      if (b.type === "anniversary" && a.type !== "anniversary") return 1;
      // Keep the two existing schedule pools in the requested relative order.
      if (a.name === "动如雷霆" && b.name === "弓箭江东") return -1;
      if (a.name === "弓箭江东" && b.name === "动如雷霆") return 1;
      const createdOrder = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      return createdOrder || b.id.localeCompare(a.id);
    });
  const cloudIndex = orderedPools.findIndex((p) => p.name === "云雨滂润");
  const tengIndex = orderedPools.findIndex((p) => p.name === "腾陵张胆" || p.name === "滕陵张胆");
  const goldIndex = orderedPools.findIndex((p) => p.name === "金相玉质");
  if (cloudIndex >= 0 && tengIndex >= 0 && goldIndex >= 0) {
    const cloudPool = orderedPools[cloudIndex];
    const tengPool = orderedPools[tengIndex];
    const goldPool = orderedPools[goldIndex];
    const specialNames = new Set(["云雨滂润", "金相玉质", "腾陵张胆", "滕陵张胆"]);
    const pairStart = Math.min(cloudIndex, tengIndex);
    const insertAt = orderedPools
      .slice(0, pairStart)
      .filter((pool) => !specialNames.has(pool.name)).length;
    const remaining = orderedPools.filter((pool) => !specialNames.has(pool.name));
    orderedPools.splice(
      0,
      orderedPools.length,
      ...remaining.slice(0, insertAt),
      tengPool,
      goldPool,
      cloudPool,
      ...remaining.slice(insertAt),
    );
  }
  const visible = orderedPools;
  const stats = overviewStats(pools, pulls);

  return (
    <main className="flex-1 overflow-y-auto px-4 pb-20 pt-3">
      <button
        type="button"
        onClick={() => setNickOpen(true)}
        className="mb-3 text-[15px] font-medium text-brown-deep"
      >
        {nickname}
      </button>

      <section className="rounded-2xl bg-card px-4 pb-4 pt-5 shadow-card">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric icon={<IconPulls />} value={stats.totalPulls} label="总招募次数" />
          <Metric icon={<IconSsr />} value={stats.totalSsr} label="总绝密个数" />
          <Metric
            icon={<IconTrophy />}
            value={formatAvg(stats.avg)}
            label="平均出绝密次数"
          />
        </div>

        <Highlight
          title="抽出次数最多的绝密密探"
          name={stats.topSsr?.name ?? "—"}
          sideLabel="共抽出"
          sideValue={stats.topSsr ? `${stats.topSsr.count}个` : "0个"}
        />
        <Highlight
          title="up池中歪出次数最多的绝密密探"
          name={stats.topOff?.name ?? "—"}
          sideLabel="共歪了"
          sideValue={stats.topOff ? `${stats.topOff.count}个` : "0个"}
        />
      </section>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <StatPanel title="普池统计">
          <Row label="总次数" value={stats.perm.pulls} />
          <Row label="总绝密数" value={stats.perm.ssr} />
          <Row label="平均出绝密次数" value={formatAvg(stats.perm.avg)} />
        </StatPanel>
        <StatPanel title="UP池统计">
          <Row label="总次数" value={stats.up.pulls} />
          <Row label="总绝密数" value={stats.up.ssr} />
          <Row label="UP角色总数" value={stats.up.upHits} />
          <Row label="平均出绝密次数" value={formatAvg(stats.up.avg)} />
          <Row
            label="小保底不歪比例"
            value={stats.up.ssr ? `${(stats.up.noOffRate * 100).toFixed(1)}%` : "--"}
          />
        </StatPanel>
      </div>

      <div className="mt-3 space-y-2.5">
        {visible.map((pool) => {
          const expanded = expandedPoolId === pool.id;
          return (
            <div key={pool.id}>
              <PoolCard
                pool={pool}
                stats={poolStats(pool.id, pulls)}
                expanded={expanded}
                onOpen={() => setExpandedPoolId(expanded ? null : pool.id)}
                onEdit={() => setRecordPool(pool)}
              />
              {expanded ? (
                <div className="-mt-2 rounded-b-2xl bg-card px-3 pb-3 pt-5 shadow-card">
                  <PoolHistoryGrid pool={pool} interactive={false} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <Button
        variant="outline"
        className="mt-3 w-full border-dashed"
        onClick={() => {
          setEditing(null);
          setEditorOpen(true);
        }}
      >
        <Plus className="size-4" />
        添加卡池
      </Button>

      <NicknameSheet open={nickOpen} onOpenChange={setNickOpen} />
      <PoolEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        pool={editing}
      />
      <RecruitmentRecordSheet
        open={Boolean(recordPool)}
        onOpenChange={(open) => {
          if (!open) setRecordPool(null);
        }}
        pool={recordPool}
      />
    </main>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      {icon}
      <p className="mt-2 text-[22px] font-semibold tabular leading-none text-brown-deep">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] text-hint">{label}</p>
    </div>
  );
}

function Highlight({
  title,
  name,
  sideLabel,
  sideValue,
}: {
  title: string;
  name: string;
  sideLabel: string;
  sideValue: string;
}) {
  return (
    <div className="mt-3 flex items-center justify-between rounded-xl bg-highlight px-3.5 py-3">
      <div>
        <p className="text-[12px] text-brown-deep/80">{title}</p>
        <p className="mt-1 text-[15px] font-medium text-gold-deep">{name}</p>
      </div>
      <div className="text-right">
        <p className="text-[12px] text-brown-deep/80">{sideLabel}</p>
        <p className="mt-1 text-[15px] font-medium text-gold-deep">{sideValue}</p>
      </div>
    </div>
  );
}

function StatPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-card shadow-card">
      <h2 className="bg-gradient-to-b from-gold-bar to-gold px-3 py-2.5 text-center text-[15px] font-medium text-brown-deep">
        {title}
      </h2>
      <div className="space-y-2.5 px-3 py-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[13px]">
      <span className="text-hint">{label}</span>
      <span className="tabular font-medium text-brown-deep">{value}</span>
    </div>
  );
}
