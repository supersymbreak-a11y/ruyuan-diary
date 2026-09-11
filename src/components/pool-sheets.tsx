"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { Drawer } from "vaul";
import {
  SSR_AGENTS,
  coverSrc,
  isCustomCover,
  portraitSrc,
} from "@/lib/game-data";
import { useNotes, type Pool, type PoolType, type SsrDrop } from "@/lib/store";
import { cn } from "@/lib/utils";
import { publishSharedPool } from "@/lib/shared-pools";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";
import { Field, TextInput } from "./shell";

function Segment<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="grid grid-cols-2 rounded-xl bg-highlight p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "h-9 rounded-lg text-sm transition-colors",
            value === o.id ? "bg-card text-brown-deep shadow-card" : "text-hint",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AgentSuggest({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => {
    const q = value.trim();
    if (!q) return SSR_AGENTS.slice(0, 8);
    return SSR_AGENTS.filter((n) => n.includes(q)).slice(0, 8);
  }, [value]);
  return (
    <div className="relative">
      <TextInput
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && hits.length > 0 ? (
        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-line bg-card py-1 shadow-card">
          {hits.map((n) => (
            <li key={n}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-highlight"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(n);
                  setOpen(false);
                }}
              >
                {n}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function PoolEditorSheet({
  open,
  onOpenChange,
  pool,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pool: Pool | null;
}) {
  const addPool = useNotes((s) => s.addPool);
  const updatePool = useNotes((s) => s.updatePool);
  const archivePool = useNotes((s) => s.archivePool);
  const isEdit = Boolean(pool);
  const [name, setName] = useState("");
  const [type, setType] = useState<PoolType>("limited");
  const [up1, setUp1] = useState("");
  const [up2, setUp2] = useState("");

  const resetFrom = (p: Pool | null) => {
    if (p) {
      setName(p.name);
      setType(p.type);
      setUp1(p.upNames[0] ?? "");
      setUp2(p.upNames[1] ?? "");
    } else {
      setName("");
      setType("limited");
      setUp1("");
      setUp2("");
    }
  };

  useEffect(() => { if (open) resetFrom(pool); }, [open, pool]);

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) resetFrom(pool);
        onOpenChange(v);
      }}
      title={isEdit ? "编辑卡池" : "添加卡池"}
      footer={
        <div className="flex gap-2">
          {isEdit && pool && pool.id !== "permanent" ? (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                archivePool(pool.id);
                const archived = useNotes.getState().pools.find((item) => item.id === pool.id);
          if (archived) publishSharedPool(archived);
                onOpenChange(false);
              }}
            >
              归档
            </Button>
          ) : null}
          <Button
            className="flex-1"
            onClick={() => {
              const upNames = [up1, up2].map((s) => s.trim()).filter(Boolean);
              if (isEdit && pool) {
                updatePool(pool.id, {
                  name: name.trim() || pool.name,
                  type,
                  upNames: type === "limited" ? upNames : [],
                });
                const updated = useNotes.getState().pools.find((item) => item.id === pool.id);
      if (updated) publishSharedPool(updated);
              } else {
                const id = addPool({
                  name: name.trim() || (type === "anniversary" ? "周年庆卡池" : "当期限定"),
                  type,
                  upNames: type === "limited" ? upNames : [],
                  cover: "",
                });
                const created = useNotes.getState().pools.find((item) => item.id === id);
      if (created) publishSharedPool(created);
              }
              onOpenChange(false);
            }}
          >
            保存
          </Button>
        </div>
      }
    >
      {pool?.id !== "permanent" ? (
        <Field label="卡池类型">
          <Segment
            value={type === "anniversary" ? "anniversary" : "limited"}
            onChange={(value) => setType(value)}
            options={[
              { id: "anniversary", label: "周年庆卡池" },
              { id: "limited", label: "当期 UP 池" },
            ]}
          />
        </Field>
      ) : null}
      <Field label="卡池名称">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      {type === "limited" ? (
        <>
          <Field label="UP 密探 1">
            <TextInput value={up1} onChange={(e) => setUp1(e.target.value)} />
          </Field>
          <Field label="UP 密探 2">
            <TextInput value={up2} onChange={(e) => setUp2(e.target.value)} />
          </Field>
        </>
      ) : null}
    </Sheet>
  );
}

export function RecordSheet({
  open,
  onOpenChange,
  pool,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pool: Pool | null;
}) {
  const recordPull = useNotes((s) => s.recordPull);
  const [count, setCount] = useState<1 | 10>(10);
  const [hasSsr, setHasSsr] = useState(false);
  const [name, setName] = useState("");
  const [isUp, setIsUp] = useState(true);
  const [extra, setExtra] = useState<SsrDrop[]>([]);

  const reset = () => {
    setCount(10);
    setHasSsr(false);
    setName("");
    setIsUp(true);
    setExtra([]);
  };

  const drops: SsrDrop[] = hasSsr
    ? [{ name: name.trim(), isUp }, ...extra.filter((d) => d.name.trim())]
    : [];

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) reset();
        onOpenChange(v);
      }}
      title={pool ? `记录 · ${pool.name}` : "记录抽卡"}
      footer={
        <Button
          className="w-full"
          onClick={() => {
            if (!pool) return;
            if (hasSsr && !name.trim()) return;
            recordPull(pool.id, count, drops);
            onOpenChange(false);
          }}
        >
          记入
        </Button>
      }
    >
      <Field label="抽数">
        <Segment
          value={String(count)}
          onChange={(v) => setCount(v === "1" ? 1 : 10)}
          options={[
            { id: "1", label: "单抽" },
            { id: "10", label: "十连" },
          ]}
        />
      </Field>
      <Field label="出货">
        <Segment
          value={hasSsr ? "yes" : "no"}
          onChange={(v) => setHasSsr(v === "yes")}
          options={[
            { id: "no", label: "无绝密" },
            { id: "yes", label: "有绝密" },
          ]}
        />
      </Field>
      {hasSsr ? (
        <div className="space-y-3">
          <Field label="绝密密探">
            <AgentSuggest value={name} onChange={setName} placeholder="输入或选择" />
          </Field>
          {pool?.type === "limited" ? (
            <button
              type="button"
              onClick={() => setIsUp((v) => !v)}
              className="flex h-11 w-full items-center justify-between rounded-xl border border-line bg-wash-top px-3 text-sm"
            >
              <span className="text-hint">是否当期 UP</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  isUp ? "bg-gold-bar text-brown-deep" : "bg-line text-hint",
                )}
              >
                {isUp ? "UP" : "歪了"}
              </span>
            </button>
          ) : null}
          {extra.map((d, i) => (
            <Field key={i} label={`额外绝密 ${i + 2}`}>
              <AgentSuggest
                value={d.name}
                onChange={(n) =>
                  setExtra((arr) => arr.map((x, j) => (j === i ? { ...x, name: n } : x)))
                }
              />
            </Field>
          ))}
          <Button
            variant="cream"
            className="w-full"
            onClick={() => setExtra((arr) => [...arr, { name: "", isUp: true }])}
          >
            同抽还有绝密
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}

type HistoryDrop = SsrDrop & {
  id: string;
  pullId: string;
  dropIndex: number;
  pityNumber: number;
  draws: number;
  isRateUpPool: boolean;
};

function historyForPool(pool: Pool, pulls: ReturnType<typeof useNotes.getState>["pulls"]) {
  const chronological = pulls.filter((pull) => pull.poolId === pool.id).slice().reverse();
  let fallbackPityNumber = 0;
  const cards: HistoryDrop[] = [];
  for (const pull of chronological) {
    pull.drops.forEach((drop, index) => {
      fallbackPityNumber += 1;
      cards.unshift({
        ...drop,
        id: `${pull.id}-${index}`,
        pullId: pull.id,
        dropIndex: index,
        pityNumber: drop.pityNumber ?? fallbackPityNumber,
        draws: drop.pullsToSsr ?? pull.count,
        isRateUpPool: pool.type === "limited",
      });
    });
  }
  return cards;
}

function HistoryCard({ drop, onClick, interactive = true }: { drop: HistoryDrop; onClick?: () => void; interactive?: boolean }) {
  const className = cn(
    "relative aspect-[3/4] overflow-visible rounded-xl bg-brown-deep shadow-card",
    interactive && "transition-transform active:scale-[0.97]",
  );
  return interactive ? (
    <button type="button" onClick={onClick} aria-label={`查看或删除${drop.name}的招募记录`} className={className}>
      <img src={portraitSrc(drop.name)} alt={`${drop.name}立绘`} className="absolute inset-0 h-full w-full rounded-xl object-cover" />
      <span className="absolute -left-1 -top-1 z-10 min-w-7 rounded-md bg-gold-bar px-1 py-0.5 text-center text-sm font-semibold tabular text-brown-deep shadow-card">
        {drop.pityNumber}
      </span>
      <p
        className={cn(
          "absolute inset-x-0 bottom-0 flex h-5 items-center justify-center rounded-b-xl text-base font-medium tabular text-card",
          !drop.isRateUpPool || drop.isUp ? "bg-gold-bar/85" : "bg-stat-red/85",
        )}
      >
        {drop.draws}
      </p>
    </button>
  ) : (
    <div className={className} aria-hidden="true">
      <img src={portraitSrc(drop.name)} alt="" className="absolute inset-0 h-full w-full rounded-xl object-cover" />
      <span className="absolute -left-1 -top-1 z-10 min-w-7 rounded-md bg-gold-bar px-1 py-0.5 text-center text-sm font-semibold tabular text-brown-deep shadow-card">
        {drop.pityNumber}
      </span>
      <p className={cn("absolute inset-x-0 bottom-0 flex h-5 items-center justify-center rounded-b-xl text-base font-medium tabular text-card", !drop.isRateUpPool || drop.isUp ? "bg-gold-bar/85" : "bg-stat-red/85")}>
        {drop.draws}
      </p>
    </div>
  );
}

function RecruitmentDeleteSheet({
  drop,
  onClose,
  onReplace,
}: {
  drop: HistoryDrop | null;
  onClose: () => void;
  onReplace?: (drop: HistoryDrop) => void;
}) {
  const removeRecruitment = useNotes((state) => state.removeRecruitment);
  const updateRecruitmentCount = useNotes((state) => state.updateRecruitmentCount);
  const [countDraft, setCountDraft] = useState("");

  useEffect(() => {
    setCountDraft(drop ? String(drop.draws) : "");
  }, [drop]);

  return (
    <Drawer.Root open={Boolean(drop)} onOpenChange={(value) => { if (!value) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-banner/45" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-[430px] rounded-t-2xl bg-card outline-none">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
          <Drawer.Title className="px-5 pb-2 pt-4 text-center text-lg font-medium text-ink">
            招募记录
          </Drawer.Title>
          {drop ? (
            <div className="px-7 pb-6 pt-3">
              <div className="mx-auto w-24">
                <div className="relative aspect-[3/4] overflow-visible rounded-xl bg-brown-deep shadow-card">
                  <img src={portraitSrc(drop.name)} alt={`${drop.name}立绘`} className="absolute inset-0 h-full w-full rounded-xl object-cover" />
                  <span className="absolute -left-1 -top-1 min-w-7 rounded-md bg-gold-bar px-1 py-0.5 text-center text-sm font-semibold tabular text-brown-deep">
                    {drop.pityNumber}
                  </span>
                  <button type="button" aria-label={`移除${drop.name}并重新选择`} onClick={() => { if (onReplace) onReplace(drop); else { removeRecruitment(drop.pullId, drop.dropIndex); onClose(); } }} className="absolute -right-2 -top-2 z-20 flex size-7 items-center justify-center rounded-full bg-stat-red text-lg leading-none text-card shadow-card">−</button>
                  <p className={cn("absolute inset-x-0 bottom-0 flex h-5 items-center justify-center rounded-b-xl text-base font-medium tabular text-card", !drop.isRateUpPool || drop.isUp ? "bg-gold-bar/85" : "bg-stat-red/85")}>{drop.draws}</p>
                </div>
              </div>
              <div className="mt-7 space-y-3">
                <div className="flex items-center gap-4 text-base text-brown-deep">
                  <span className="w-24 shrink-0">第几个保底</span>
                  <div className="flex h-11 flex-1 items-center justify-center rounded-xl border border-line bg-card text-lg tabular text-gold-deep">{drop.pityNumber}</div>
                </div>
                <div className="flex items-center gap-4 text-base text-brown-deep">
                  <span className="w-24 shrink-0">招募次数</span>
                  <TextInput
                    aria-label="招募次数"
                    inputMode="numeric"
                    value={countDraft}
                    onChange={(event) => setCountDraft(event.target.value.replace(/[^\d]/g, ""))}
                    className="h-11 flex-1 text-center text-lg tabular text-gold-deep"
                  />
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-hint">修改或删除后，卡池统计将立即更新</p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <Button variant="cream" size="lg" onClick={onClose}>取消</Button>
                <Button
                  size="lg"
                  className="bg-gold-deep text-card"
                  onClick={() => {
                    updateRecruitmentCount(drop.pullId, drop.dropIndex, Number(countDraft));
                    onClose();
                  }}
                >
                  保存修改
                </Button>
                <Button
                  size="lg"
                  className="bg-stat-red text-card"
                  onClick={() => {
                    removeRecruitment(drop.pullId, drop.dropIndex);
                    onClose();
                  }}
                >
                  删除记录
                </Button>
              </div>
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function PoolHistoryGrid({ pool, interactive = true }: { pool: Pool; interactive?: boolean }) {
  const pulls = useNotes((state) => state.pulls);
  const [selectedDrop, setSelectedDrop] = useState<HistoryDrop | null>(null);
  const history = useMemo(() => historyForPool(pool, pulls), [pool, pulls]);
  if (history.length === 0) {
    return <p className="py-5 text-center text-sm text-hint">本池还没有绝密记录</p>;
  }
  return (
    <>
      <div
        className={cn(
          "grid grid-cols-5 gap-2.5 px-1 py-1",
          history.length > 30 && "max-h-[630px] overflow-y-auto overscroll-auto",
        )}
      >
        {history.map((drop) => <HistoryCard key={drop.id} drop={drop} interactive={interactive} onClick={() => setSelectedDrop(drop)} />)}
      </div>
      {interactive ? <RecruitmentDeleteSheet drop={selectedDrop} onClose={() => setSelectedDrop(null)} /> : null}
    </>
  );
}

/** A visual, card-first editor for recreating a pool's recruitment history. */
export function RecruitmentRecordSheet({
  open,
  onOpenChange,
  pool,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pool: Pool | null;
}) {
  const pulls = useNotes((s) => s.pulls);
  const recordPull = useNotes((s) => s.recordPull);
  const removeRecruitment = useNotes((s) => s.removeRecruitment);
  const updatePool = useNotes((s) => s.updatePool);
  const [adding, setAdding] = useState(false);
  const [agent, setAgent] = useState("");
  const [count, setCount] = useState("1");
  const [nameDraft, setNameDraft] = useState("");
  const [upDraft, setUpDraft] = useState("");
  const [remainingDraft, setRemainingDraft] = useState("40");
  const [selectedDrop, setSelectedDrop] = useState<HistoryDrop | null>(null);
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);

  useEffect(() => {
    if (!open || !pool) return;
    setNameDraft(pool.name);
    setUpDraft(pool.upNames.join(" / "));
    setRemainingDraft(String(Math.max(0, 40 - pool.pity)));
  }, [open, pool]);

  const history = useMemo<HistoryDrop[]>(() => {
    if (!pool) return [];
    return historyForPool(pool, pulls);
  }, [pool, pulls]);

  const resetAdd = () => {
    setAdding(false);
    setAgent("");
    setCount("1");
  };

  const close = () => {
    resetAdd();
    setSelectedDrop(null);
    onOpenChange(false);
  };

  const submit = () => {
    if (!pool || !agent.trim()) return;
    const pullCount = Math.max(1, Math.min(999, Number(count) || 1));
    const ordinal = history.length + 1;
    const currentUpNames = pool.type === "limited" ? upDraft
      .split(/[、,/\s]+/)
      .map((name) => name.trim())
      .filter(Boolean) : [];
    recordPull(pool.id, pullCount, [
      {
        name: agent.trim(),
        isUp: currentUpNames.includes(agent.trim()),
        pityNumber: ordinal,
        pullsToSsr: pullCount,
      },
    ]);
    resetAdd();
  };

  const savePoolDetails = () => {
    if (!pool) return;
    const remaining = Math.max(0, Math.min(40, Number(remainingDraft) || 0));
    const upNames = upDraft
      .split(/[、,/\s]+/)
      .map((name) => name.trim())
      .filter(Boolean);
    updatePool(pool.id, {
      name: nameDraft.trim() || pool.name,
      upNames: pool.type === "limited" ? upNames : [],
      pity: 40 - remaining,
    });
    const updated = useNotes.getState().pools.find((item) => item.id === pool.id);
    if (updated) publishSharedPool(updated);
    close();
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) resetAdd();
        onOpenChange(value);
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-banner/45" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[94dvh] max-w-[430px] flex-col overflow-hidden rounded-t-2xl bg-app outline-none md:h-[90dvh]">
          <Drawer.Title className="sr-only">招募记录</Drawer.Title>
          {adding ? (
            <section className="flex min-h-0 flex-1 flex-col bg-card">
              <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-line px-12">
                <button
                  type="button"
                  aria-label="返回招募记录"
                  onClick={resetAdd}
                  className="absolute left-1 flex size-11 items-center justify-center text-ink"
                >
                  <ChevronLeft className="size-6" strokeWidth={1.75} />
                </button>
                <h2 className="text-lg font-medium text-ink">提交招募</h2>
              </header>
              <div className="flex flex-1 flex-col justify-center px-7 pb-10">
                <div className="relative mx-auto flex aspect-[3/4] w-40 flex-col overflow-hidden rounded-2xl border border-gold-deep/60 bg-wash-top text-gold-deep">
                  <button type="button" aria-label="打开密探列表" onClick={() => setAgentPickerOpen(true)} className="relative min-h-0 flex-1 overflow-hidden">
                    {agent.trim() ? <img src={portraitSrc(agent)} alt={`${agent}立绘`} className="h-full w-full object-cover" /> : <Plus className="absolute inset-0 m-auto size-10" strokeWidth={1.5} />}
                  </button>
                  <TextInput aria-label="密探名称" value={agent} onChange={(event) => setAgent(event.target.value)} placeholder="请输入密探名称" maxLength={30} className="h-10 shrink-0 rounded-none border-0 bg-card/90 text-center text-sm" />
                </div>

                <label className="mt-8 flex items-center gap-4 text-base text-brown-deep">
                  <span className="shrink-0">招募次数</span>
                  <TextInput
                    className="text-center text-lg text-gold-deep"
                    inputMode="numeric"
                    value={count}
                    onChange={(event) => setCount(event.target.value.replace(/[^\d]/g, ""))}
                  />
                </label>
                <Button className="mt-9 w-full" size="lg" onClick={submit} disabled={!agent.trim()}>
                  确认提交
                </Button>
              </div>
            </section>
          ) : (
            <section className="flex min-h-0 flex-1 flex-col">
              <header className="relative flex h-14 shrink-0 items-center justify-center bg-card px-12">
                <button
                  type="button"
                  aria-label="关闭招募记录"
                  onClick={close}
                  className="absolute left-1 flex size-11 items-center justify-center text-ink"
                >
                  <ChevronLeft className="size-6" strokeWidth={1.75} />
                </button>
                <h2 className="text-lg font-medium text-ink">招募记录</h2>
              </header>
              {pool ? (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
                    <div className="relative h-[108px] overflow-hidden rounded-2xl bg-neutral-400 shadow-card">
                      {isCustomCover(pool.cover) ? (
                        <img src={coverSrc(pool.cover)} alt="" className="h-full w-full object-cover object-left" />
                      ) : null}
                      <div className="pool-cover-shade absolute inset-0" />
                      <textarea
                        aria-label="卡池名称"
                        value={nameDraft}
                        onChange={(event) => setNameDraft(event.target.value)}
                        rows={2}
                        className="pool-name-input absolute right-3 top-1/2 h-[4.5rem] w-20 -translate-y-1/2 resize-none overflow-hidden whitespace-normal break-all border-0 bg-transparent px-0 text-center text-card placeholder:text-card/60 focus:ring-0"
                      />
                    </div>
                    <section className="mt-4 rounded-2xl bg-card px-4 py-4 shadow-card">
                      {pool.type === "limited" ? (
                        <div className="flex items-center gap-2 border-b border-line pb-4">
                          <span className="shrink-0 text-sm text-brown-deep">UP角色：</span>
                          <TextInput
                            aria-label="UP角色"
                            value={upDraft}
                            onChange={(event) => setUpDraft(event.target.value)}
                            placeholder="输入UP角色，使用空格或 / 分隔"
                            className="h-9 border-0 bg-transparent px-0 text-sm text-gold-deep focus:ring-0"
                          />
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between pt-4">
                        <p className="text-sm font-medium text-brown-deep">距离下次保底还需多少次招募</p>
                        <TextInput
                          aria-label="距离下次保底还需多少次招募"
                          className="h-11 w-20 shrink-0 text-center text-lg tabular text-gold-deep"
                          inputMode="numeric"
                          value={remainingDraft}
                          onChange={(event) => setRemainingDraft(event.target.value.replace(/[^\d]/g, ""))}
                        />
                      </div>
                      <p className="mt-5 text-sm font-medium text-brown-deep">请按照抽出的顺序提交绝密密探数据</p>
                      <div className="mt-4 grid grid-cols-4 gap-3">
                        <button
                          type="button"
                          onClick={() => setAdding(true)}
                          className="flex aspect-[3/4] items-center justify-center rounded-xl border border-gold-deep/60 bg-wash-top text-gold-deep transition-colors hover:bg-highlight"
                          aria-label="添加绝密密探记录"
                        >
                          <Plus className="size-9" strokeWidth={1.5} />
                        </button>
                        {history.map((drop) => <HistoryCard key={drop.id} drop={drop} onClick={() => setSelectedDrop(drop)} />)}
                      </div>
                      {history.length === 0 ? (
                        <p className="py-7 text-center text-sm text-hint">先添加第一位抽到的绝密密探吧</p>
                      ) : null}
                    </section>
                  </div>
                  <div className="shrink-0 bg-card px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <Button className="w-full" size="lg" onClick={savePoolDetails}>保存</Button>
                  </div>
                </>
              ) : null}
            </section>
          )}
        </Drawer.Content>
      </Drawer.Portal>
      <RecruitmentDeleteSheet
        drop={selectedDrop}
        onClose={() => setSelectedDrop(null)}
        onReplace={(drop) => {
          removeRecruitment(drop.pullId, drop.dropIndex);
          setSelectedDrop(null);
          setAgent("");
          setCount("1");
          setAdding(true);
        }}
      />
      <AgentPickerSheet
        open={agentPickerOpen}
        onClose={() => setAgentPickerOpen(false)}
        onSelect={(name) => {
          setAgent(name);
          setAgentPickerOpen(false);
        }}
      />
    </Drawer.Root>
  );
}

const AGENT_FILTER_TAGS: Record<string, { elements: string[]; jobs: string[] }> = {
  凌统: { elements: ["火"], jobs: ["破军"] }, 孙尚香: { elements: ["火"], jobs: ["破军"] }, 吕蒙: { elements: ["火"], jobs: ["破军"] }, 陆逊: { elements: ["火"], jobs: ["破军"] },
  孙权: { elements: ["火"], jobs: ["龙盾"] }, 郭解: { elements: ["火"], jobs: ["龙盾"] },
  钟繇: { elements: ["火"], jobs: ["神纪"] }, 荀彧: { elements: ["风"], jobs: ["神纪"] }, 蒯越: { elements: ["火"], jobs: ["神纪"] }, 诸葛诞: { elements: ["火"], jobs: ["神纪"] }, 张燕: { elements: ["火"], jobs: ["神纪"] }, 甄宓: { elements: ["火"], jobs: ["神纪"] }, 张郃: { elements: ["火"], jobs: ["神纪"] },
  程普: { elements: ["火"], jobs: ["诡道"] }, 程昱: { elements: ["火"], jobs: ["诡道"] }, 张修: { elements: ["火"], jobs: ["诡道"] }, 甘吉: { elements: ["火"], jobs: ["诡道"] },
  吕布: { elements: ["地"], jobs: ["破军"] }, 马腾: { elements: ["地"], jobs: ["破军"] }, 安期: { elements: ["地"], jobs: ["破军"] }, 马超: { elements: ["地"], jobs: ["破军"] }, 张辽: { elements: ["地"], jobs: ["破军"] },
  夏侯惇: { elements: ["地"], jobs: ["龙盾"] }, 张仲景: { elements: ["地"], jobs: ["岐黄"] }, 刘璋: { elements: ["地"], jobs: ["神纪"] }, 董白: { elements: ["地"], jobs: ["神纪"] }, 荀攸: { elements: ["地"], jobs: ["诡道"] }, 戏学: { elements: ["地"], jobs: ["诡道"] },
  太史慈: { elements: ["风"], jobs: ["破军"] }, 张飞: { elements: ["风"], jobs: ["破军"] },
  张昭: { elements: ["风"], jobs: ["神纪"] }, 张邈: { elements: ["风"], jobs: ["神纪"] }, 曹丕: { elements: ["风"], jobs: ["诡道"] }, 庞羲: { elements: ["风"], jobs: ["诡道"] }, 曹植: { elements: ["风"], jobs: ["诡道"] }, 郭嘉: { elements: ["风"], jobs: ["诡道"] },
  诸葛瑾: { elements: ["水"], jobs: ["破军"] }, 孔融: { elements: ["水"], jobs: ["神纪"] }, 刘豹: { elements: ["水"], jobs: ["神纪"] }, 令狐茂: { elements: ["水"], jobs: ["神纪"] }, 周瑜: { elements: ["水"], jobs: ["神纪"] }, 王粲: { elements: ["水"], jobs: ["神纪"] },
  士燮: { elements: ["水"], jobs: ["诡道"] }, 刘繇: { elements: ["水"], jobs: ["诡道"] }, 甘宁: { elements: ["水"], jobs: ["诡道"] }, 蔡琰: { elements: ["水"], jobs: ["诡道"] }, 鲁肃: { elements: ["水"], jobs: ["诡道"] },
  庞德: { elements: ["水"], jobs: ["破军"] }, 郭女王: { elements: ["水"], jobs: ["破军"] },
  夏侯渊: { elements: ["阳"], jobs: ["破军"] }, 朱然: { elements: ["阳"], jobs: ["龙盾"] }, 黄月英: { elements: ["阳"], jobs: ["龙盾"] }, 董奉: { elements: ["阳"], jobs: ["岐黄"] }, 华佗: { elements: ["阳"], jobs: ["岐黄"] }, 诸葛亮: { elements: ["阳"], jobs: ["神纪"] }, 祢衡: { elements: ["阳"], jobs: ["神纪"] }, 徐庶: { elements: ["阳"], jobs: ["神纪"] }, 庞统: { elements: ["阳"], jobs: ["神纪"] }, 杨修: { elements: ["阳"], jobs: ["神纪"] },
  张绣: { elements: ["阴"], jobs: ["破军"] }, 满宠: { elements: ["阴"], jobs: ["破军"] }, 虞翻: { elements: ["阴"], jobs: ["破军"] }, 张角: { elements: ["阴"], jobs: ["破军"] },
  司马徽: { elements: ["阴"], jobs: ["诡道"] }, 黄盖: { elements: ["阴"], jobs: ["诡道"] }, 张闿: { elements: ["阴"], jobs: ["诡道"] }, 张鲁: { elements: ["阴"], jobs: ["诡道"] }, 葛洪: { elements: ["阴"], jobs: ["诡道"] }, 贾诩: { elements: ["阴"], jobs: ["诡道"] },
};

function AgentPickerSheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
}) {
  const [element, setElement] = useState("全部");
  const [job, setJob] = useState("全部");
  const pools = useNotes((state) => state.pools);
  const elements = ["全部", "火", "地", "风", "水", "阳", "阴", "混沌"];
  const jobs = ["全部", "破军", "龙盾", "岐黄", "神纪", "诡道"];
  const allAgents = useMemo(
    () => [...new Set([...SSR_AGENTS, ...pools.flatMap((pool) => pool.upNames)])],
    [pools],
  );
  const agents = useMemo(() => allAgents.filter((name) => {
    if (element === "全部" && job === "全部") return true;
    const tags = AGENT_FILTER_TAGS[name];
    if (!tags) return false;
    if (element !== "全部" && !tags.elements.includes(element)) return false;
    if (job !== "全部" && !tags.jobs.includes(job)) return false;
    return true;
  }), [allAgents, element, job]);
  return (
    <Drawer.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[70] bg-banner/45" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex h-[94dvh] max-w-[430px] flex-col overflow-hidden rounded-t-2xl bg-card outline-none">
          <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-line">
            <button type="button" aria-label="返回提交招募" onClick={onClose} className="absolute left-1 flex size-11 items-center justify-center text-ink">
              <ChevronLeft className="size-6" strokeWidth={1.75} />
            </button>
            <h2 className="text-lg font-medium text-ink">密探列表</h2>
          </header>
          <div className="shrink-0 space-y-2 bg-highlight px-3 py-3">
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-0.5 w-7 shrink-0 text-xs font-semibold text-brown-deep">属性</span>
              {elements.map((item) => (
                <button key={item} type="button" onClick={() => setElement(item)} className={cn("flex shrink-0 items-center rounded-full px-2 py-1 text-sm", element === item ? "bg-gold-bar text-brown-deep" : "bg-card text-hint")}>
                  {item}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-0.5 w-7 shrink-0 text-xs font-semibold text-brown-deep">职业</span>
              {jobs.map((item) => (
                <button key={item} type="button" onClick={() => setJob(item)} className={cn("flex shrink-0 items-center rounded-full px-2 py-1 text-sm", job === item ? "bg-gold-bar text-brown-deep" : "bg-card text-hint")}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-card px-3 py-4">
            <div className="grid grid-cols-4 gap-3">
              {agents.map((name) => (
                <button key={name} type="button" onClick={() => onSelect(name)} className="group">
                  <div className="aspect-[3/4] overflow-hidden rounded-lg border-2 border-gold-deep/70 bg-wash-top shadow-card">
                    <img src={portraitSrc(name)} alt={`${name}立绘`} className="h-full w-full rounded-lg object-cover object-center" />
                  </div>
                  <div className="mt-1 rounded-full border border-gold-deep/60 px-1 py-0.5 text-center text-xs text-brown-deep group-active:bg-highlight">{name}</div>
                </button>
              ))}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function NicknameSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const nickname = useNotes((s) => s.nickname);
  const setNickname = useNotes((s) => s.setNickname);
  const [draft, setDraft] = useState(nickname);
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) setDraft(nickname);
        onOpenChange(v);
      }}
      title="称呼"
      footer={
        <Button
          className="w-full"
          onClick={() => {
            setNickname(draft);
            onOpenChange(false);
          }}
        >
          保存
        </Button>
      }
    >
      <Field label="显示名称">
        <TextInput value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={12} />
      </Field>
    </Sheet>
  );
}
