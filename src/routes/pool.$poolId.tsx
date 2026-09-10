"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { coverSrc, isCustomCover } from "@/lib/game-data";
import { formatAvg, poolStats } from "@/lib/stats";
import { useNotes } from "@/lib/store";
import { relativeTime } from "@/lib/game-date";
import { AppHeader, HydrateGate, PhoneFrame } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { RecordSheet, RecruitmentRecordSheet } from "@/components/pool-sheets";

export const Route = createFileRoute("/pool/$poolId")({
  component: PoolRoute,
});

function PoolRoute() {
  const { poolId } = Route.useParams();
  return (
    <HydrateGate>
      <PhoneFrame>
        <AppHeader title="卡池详情" backTo="/" />
        <PoolDetail poolId={poolId} />
      </PhoneFrame>
    </HydrateGate>
  );
}

function PoolDetail({ poolId }: { poolId: string }) {
  const pool = useNotes((s) => s.pools.find((p) => p.id === poolId));
  const pulls = useNotes((s) => s.pulls);
  const recordPull = useNotes((s) => s.recordPull);
  const undoLastPull = useNotes((s) => s.undoLastPull);
  const [editOpen, setEditOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);

  if (!pool || pool.archived) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 text-sm text-hint">
        卡池不存在或已归档
      </main>
    );
  }

  const stats = poolStats(pool.id, pulls);
  const ssrs = stats.history.flatMap((h) =>
    h.drops.map((d) => ({ ...d, at: h.at, count: h.count })),
  );

  return (
    <main className="flex-1 overflow-y-auto px-4 pb-8 pt-3">
      <div className="relative h-[108px] overflow-hidden rounded-2xl bg-neutral-400 shadow-card">
        {isCustomCover(pool.cover) ? (
          <img
            src={coverSrc(pool.cover)}
            alt=""
            className="h-full w-full object-cover object-left"
          />
        ) : null}
        <div className="pool-cover-shade absolute inset-0" />
        <span className="absolute inset-y-0 left-[52%] right-4 flex items-center justify-center text-2xl font-medium text-card">
          {pool.name}
        </span>
      </div>

      <section className="mt-3 rounded-2xl bg-card px-4 py-4 shadow-card">
        <div className="grid grid-cols-2 gap-3">
          <Pity
            label="小保底垫刀"
            value={pool.pity}
            max={40}
            hint={`再 ${Math.max(0, 40 - pool.pity)} 抽必金`}
          />
          {pool.type === "limited" ? (
            <Pity
              label={pool.guaranteedUp ? "大保底（必 UP）" : "距大保底"}
              value={pool.upPity}
              max={80}
              hint={pool.guaranteedUp ? "下一金必 UP" : `再 ${Math.max(0, 80 - pool.upPity)} 抽必 UP`}
            />
          ) : (
            <div className="rounded-xl bg-highlight px-3 py-3">
              <p className="text-xs text-hint">本池绝密</p>
              <p className="mt-1 text-2xl font-semibold tabular text-brown-deep">
                {stats.ssr}
              </p>
              <p className="mt-1 text-xs text-hint">均 {formatAvg(stats.avg)} 抽出金</p>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={() => recordPull(pool.id, 1, [])}
          >
            单抽无金
          </Button>
          <Button
            variant="outline"
            onClick={() => recordPull(pool.id, 10, [])}
          >
            十连无金
          </Button>
          <Button onClick={() => setRecordOpen(true)}>记录出货</Button>
        </div>
        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            className="text-xs text-hint"
            onClick={() => undoLastPull(pool.id)}
          >
            撤销上次
          </button>
        </div>
      </section>

      <section className="mt-3 rounded-2xl bg-card px-4 py-4 shadow-card">
        <h2 className="text-sm font-medium text-brown-deep">绝密记录</h2>
        {ssrs.length === 0 ? (
          <p className="py-6 text-center text-sm text-hint">本池还没有绝密</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {ssrs.map((d, i) => (
              <li key={`${d.at}-${i}`} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{d.name}</p>
                  <p className="text-xs text-hint">{relativeTime(d.at)}</p>
                </div>
                {pool.type === "limited" ? (
                  <span
                    className={
                      d.isUp
                        ? "rounded-full bg-gold-bar px-2 py-0.5 text-[11px] text-brown-deep"
                        : "rounded-full bg-line px-2 py-0.5 text-[11px] text-hint"
                    }
                  >
                    {d.isUp ? "UP" : "歪"}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <RecruitmentRecordSheet open={editOpen} onOpenChange={setEditOpen} pool={pool} />
      <RecordSheet open={recordOpen} onOpenChange={setRecordOpen} pool={pool} />
    </main>
  );
}

function Pity({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  hint: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="rounded-xl bg-highlight px-3 py-3">
      <p className="text-xs text-hint">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular text-brown-deep">
        {value}
        <span className="text-sm font-normal text-hint"> / {max}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gold-deep" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-hint">{hint}</p>
    </div>
  );
}
