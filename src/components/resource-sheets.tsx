"use client";

import { useMemo, useState } from "react";
import {
  RESOURCE_META,
  TASKS,
  reasonsFor,
  type LedgerSide,
  type ResourceKey,
} from "@/lib/game-data";
import { DIM_OPTIONS, getGameDate, type StatDim } from "@/lib/game-date";
import { useNotes } from "@/lib/store";
import { cn } from "@/lib/utils";
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
    <div
      className="grid rounded-xl bg-highlight p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
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

export function AddRecordSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const addLedger = useNotes((s) => s.addLedger);
  const [key, setKey] = useState<ResourceKey>("whiteGold");
  const [side, setSide] = useState<LedgerSide>("income");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("月卡");
  const [custom, setCustom] = useState("");
  const [date, setDate] = useState(getGameDate);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const reasons = reasonsFor(key, side).filter(
    (item) => !(side === "expense" && ["tianji", "fuchuan", "zhuyu"].includes(key) && item.id === "其他"),
  );

  const applyConversion = (
    source: ResourceKey,
    sourceAmount: number,
    target: ResourceKey,
    targetAmount: number,
    label: string,
  ) => {
    addLedger({ key: source, amount: -sourceAmount, reason: `兑换${label}`, date });
    addLedger({ key: target, amount: targetAmount, reason: `兑换${label}`, date });
  };
  const exchangeKind =
    key === "whiteGold" && side === "income" && reason === "茱萸转化"
      ? "zhuyu-income"
      : key === "tianji" && side === "income" && reason === "白金币购买"
        ? "tianji-income"
        : key === "fuchuan" && side === "income" && reason === "白金币购买"
          ? "fuchuan-income"
          : key === "fuchuan" && side === "income" && reason === "月卡符传"
            ? "month-fuchuan-income"
      : side === "expense" && key === "zhuyu" && reason === "转化白金币"
        ? "zhuyu"
      : side === "expense" && key === "whiteGold" && reason === "天机符传"
        ? "tianji"
        : side === "expense" && key === "whiteGold" && reason === "月卡符传"
          ? "month-fuchuan"
          : side === "expense" && key === "whiteGold" && reason === "符传"
            ? "fuchuan"
            : null;
  const enteredAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const exchangeUnits = exchangeKind === "zhuyu"
    ? { source: enteredAmount, target: enteredAmount * 50 }
    : exchangeKind === "zhuyu-income"
      ? { source: Math.floor(enteredAmount / 50), target: Math.floor(enteredAmount / 50) * 50 }
      : exchangeKind === "tianji-income" || exchangeKind === "fuchuan-income"
        ? { source: enteredAmount * 200, target: enteredAmount }
        : exchangeKind === "month-fuchuan-income"
          ? { source: Math.floor(enteredAmount / 10) * 1600, target: Math.floor(enteredAmount / 10) * 10 }
    : exchangeKind === "month-fuchuan"
      ? { source: Math.floor(enteredAmount / 1600) * 1600, target: Math.floor(enteredAmount / 1600) * 10 }
      : { source: Math.floor(enteredAmount / 200) * 200, target: Math.floor(enteredAmount / 200) };

  const reset = () => {
    setKey("whiteGold");
    setSide("income");
    setAmount("");
    setReason("月卡");
    setCustom("");
    setDate(getGameDate());
    setAutoEnabled(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) reset();
        onOpenChange(v);
      }}
      title="添加记录"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
            const n = Math.abs(Math.round(Number(amount) || 0));
            if (!n) return;
            if (autoEnabled && exchangeKind && exchangeUnits.target > 0) {
              const source = exchangeKind === "zhuyu-income" ? "zhuyu" : "whiteGold";
              const target = exchangeKind === "zhuyu" || exchangeKind === "zhuyu-income" ? "whiteGold" : exchangeKind.includes("tianji") ? "tianji" : "fuchuan";
              applyConversion(source, exchangeUnits.source, target, exchangeUnits.target, target === "whiteGold" ? "白金币" : target === "tianji" ? "天机符传" : "符传");
              onOpenChange(false);
              return;
            }
            addLedger({
              key,
              amount: side === "income" ? n : -n,
              reason: reason === "其他" ? custom.trim() || "其他" : reason,
              date,
            });
            onOpenChange(false);
            }}
          >提交</Button>
        </div>
      }
    >
      <Field label="材料">
        <div className="grid grid-cols-4 gap-1.5">
          {RESOURCE_META.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setKey(m.key);
                setAmount("");
                setAutoEnabled(false);
                const next = reasonsFor(m.key, side);
                if (!next.some((r) => r.id === reason)) setReason(next[0]?.id ?? "其他");
              }}
              className={cn(
                "rounded-lg py-2 text-[11px] font-medium",
                key === m.key ? m.head : cn(m.body, m.num),
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="类型">
        <Segment
          value={side}
          onChange={(v) => {
            setSide(v);
            setAmount("");
            setAutoEnabled(false);
            const next = reasonsFor(key, v);
            if (!next.some((r) => r.id === reason)) setReason(next[0]?.id ?? "其他");
          }}
          options={[
            { id: "income" as const, label: "收益" },
            { id: "expense" as const, label: "消耗" },
          ]}
        />
      </Field>
      <Field label={side === "income" ? "来源" : "用途"}>
        <div className="flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <button
              key={`${r.side}-${r.id}`}
              type="button"
              onClick={() => { setReason(r.id); setAmount(""); setAutoEnabled(false); }}
              className={cn(
                "h-8 rounded-full px-3 text-xs",
                reason === r.id
                  ? "bg-gold-bar text-brown-deep"
                  : "bg-highlight text-hint",
              )}
            >
              {r.id}
            </button>
          ))}
        </div>
        {reason === "其他" ? (
          <TextInput
            className="mt-2"
            placeholder="自定义来源"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        ) : null}
      </Field>
      <Field label="数量">
        <TextInput
          inputMode="numeric"
          value={amount}
          placeholder="0"
          onChange={(e) => { setAmount(e.target.value.replace(/[^\d]/g, "")); setAutoEnabled(false); }}
        />
      </Field>
      {exchangeKind ? (
        <Field label="自动兑换">
          <label className="mb-1.5 flex items-center gap-2 text-xs text-brown-deep">
            <input type="checkbox" checked={autoEnabled} onChange={(event) => setAutoEnabled(event.target.checked)} className="size-4 accent-gold" />
            提交时执行自动兑换
          </label>
          {exchangeKind === "zhuyu" ? (
            <button type="button" disabled={enteredAmount < 1} onClick={() => setAutoEnabled((v) => !v)} className={cn("h-9 w-full rounded-lg px-2 text-xs text-brown-deep disabled:cursor-not-allowed disabled:opacity-40", autoEnabled ? "bg-gold-bar" : "bg-highlight")}>
              {enteredAmount || 1} 茱萸 → {(enteredAmount || 1) * 50} 白金币
            </button>
          ) : exchangeKind === "zhuyu-income" ? (
            <button type="button" disabled={exchangeUnits.source < 1} onClick={() => setAutoEnabled((v) => !v)} className={cn("h-9 w-full rounded-lg px-2 text-xs text-brown-deep disabled:cursor-not-allowed disabled:opacity-40", autoEnabled ? "bg-gold-bar" : "bg-highlight")}>
              {exchangeUnits.source || 1} 茱萸 → {exchangeUnits.target || 50} 白金币
            </button>
          ) : exchangeKind === "tianji-income" ? (
            <button type="button" disabled={enteredAmount < 1} onClick={() => setAutoEnabled((v) => !v)} className={cn("h-9 w-full rounded-lg px-2 text-xs text-brown-deep disabled:cursor-not-allowed disabled:opacity-40", autoEnabled ? "bg-gold-bar" : "bg-highlight")}>
              {exchangeUnits.source || 200} 白金币 → {exchangeUnits.target || 1} 天机符传
            </button>
          ) : exchangeKind === "fuchuan-income" ? (
            <button type="button" disabled={enteredAmount < 1} onClick={() => setAutoEnabled((v) => !v)} className={cn("h-9 w-full rounded-lg px-2 text-xs text-brown-deep disabled:cursor-not-allowed disabled:opacity-40", autoEnabled ? "bg-gold-bar" : "bg-highlight")}>
              {exchangeUnits.source || 200} 白金币 → {exchangeUnits.target || 1} 符传
            </button>
          ) : exchangeKind === "month-fuchuan-income" ? (
            <button type="button" disabled={exchangeUnits.target < 10} onClick={() => setAutoEnabled((v) => !v)} className={cn("h-9 w-full rounded-lg px-2 text-xs text-brown-deep disabled:cursor-not-allowed disabled:opacity-40", autoEnabled ? "bg-gold-bar" : "bg-highlight")}>
              {exchangeUnits.source || 1600} 白金币 → {exchangeUnits.target || 10} 符传（月卡）
            </button>
          ) : exchangeKind === "tianji" ? (
            <button type="button" disabled={exchangeUnits.target < 1} onClick={() => setAutoEnabled((v) => !v)} className={cn("h-9 w-full rounded-lg px-2 text-xs text-brown-deep disabled:cursor-not-allowed disabled:opacity-40", autoEnabled ? "bg-gold-bar" : "bg-highlight")}>
              {exchangeUnits.source || 200} 白金币 → {exchangeUnits.target || 1} 天机符传
            </button>
          ) : exchangeKind === "month-fuchuan" ? (
            <button type="button" disabled={exchangeUnits.target < 1} onClick={() => setAutoEnabled((v) => !v)} className={cn("h-9 w-full rounded-lg px-2 text-xs text-brown-deep disabled:cursor-not-allowed disabled:opacity-40", autoEnabled ? "bg-gold-bar" : "bg-highlight")}>
              {exchangeUnits.source || 1600} 白金币 → {exchangeUnits.target || 10} 符传（月卡）
            </button>
          ) : (
            <button type="button" disabled={exchangeUnits.target < 1} onClick={() => setAutoEnabled((v) => !v)} className={cn("h-9 w-full rounded-lg px-2 text-xs text-brown-deep disabled:cursor-not-allowed disabled:opacity-40", autoEnabled ? "bg-gold-bar" : "bg-highlight")}>
              {exchangeUnits.source || 200} 白金币 → {exchangeUnits.target || 1} 符传
            </button>
          )}
        </Field>
      ) : null}
      <Field label="日期">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
    </Sheet>
  );
}

export function StockSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const resources = useNotes((s) => s.resources);
  const setResources = useNotes((s) => s.setResources);
  const [draft, setDraft] = useState<Record<ResourceKey, string>>({
    whiteGold: "0",
    tianji: "0",
    fuchuan: "0",
    zhuyu: "0",
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setDraft({
            whiteGold: String(resources.whiteGold),
            tianji: String(resources.tianji),
            fuchuan: String(resources.fuchuan),
            zhuyu: String(resources.zhuyu),
          });
        }
        onOpenChange(v);
      }}
      title="设置基础库存"
      footer={
        <Button
          className="w-full"
          onClick={() => {
            setResources({
              whiteGold: Number(draft.whiteGold) || 0,
              tianji: Number(draft.tianji) || 0,
              fuchuan: Number(draft.fuchuan) || 0,
              zhuyu: Number(draft.zhuyu) || 0,
            });
            onOpenChange(false);
          }}
        >
          保存
        </Button>
      }
    >
      {RESOURCE_META.map((m) => (
        <Field key={m.key} label={m.label}>
          <TextInput
            inputMode="numeric"
            value={draft[m.key]}
            onChange={(e) =>
              setDraft((d) => ({ ...d, [m.key]: e.target.value.replace(/[^\d]/g, "") }))
            }
          />
        </Field>
      ))}
      <p className="text-[11px] text-hint">只改当前持有量，不会写入详细记录。</p>
    </Sheet>
  );
}

export function CheckInSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const daily = useNotes((s) => s.daily);
  const weekly = useNotes((s) => s.weekly);
  const bumpTask = useNotes((s) => s.bumpTask);
  const addLedger = useNotes((s) => s.addLedger);
  const [fuchuanAmount, setFuchuanAmount] = useState("");

  const batchCheckIn = () => {
    for (const task of TASKS) {
      if (!task.rewardKey) continue;
      const amount = task.rewardAmount ?? Math.abs(Math.round(Number(fuchuanAmount) || 0));
      if (amount <= 0) continue;
      addLedger({ key: task.rewardKey, amount, reason: task.label });
      const bag = task.scope === "daily" ? daily.tasks : weekly.tasks;
      if ((bag[task.id] ?? 0) < task.max) bumpTask(task.id, task.max, task.scope);
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, typeof TASKS>();
    for (const t of TASKS) {
      const list = map.get(t.group) ?? [];
      list.push(t);
      map.set(t.group, list);
    }
    return [...map.entries()];
  }, []);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="日常打卡"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button className="flex-1" onClick={batchCheckIn}>
            一键打卡
          </Button>
        </div>
      }
    >
      {groups.map(([group, tasks]) => (
        <section key={group} className="mb-3 overflow-hidden rounded-2xl border border-line">
          <h2 className="bg-gold-bar/80 px-3 py-2 text-sm font-medium text-brown-deep">
            {group}
          </h2>
          <ul>
            {tasks.map((t) => {
              return (
                <li key={t.id} className="border-t border-line">
                  <div className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="text-sm text-ink">{t.label}</span>
                      {t.hint ? (
                        <span className="ml-2 text-[11px] text-hint">{t.hint}</span>
                      ) : null}
                    </span>
                    {t.id === "fuchuan-month" ? (
                      <input
                        type="number"
                        min="0"
                        value={fuchuanAmount}
                        onChange={(event) => setFuchuanAmount(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        placeholder="数量"
                        className="h-8 w-20 rounded-lg border border-line bg-card px-2 text-right text-xs text-ink outline-none focus:ring-2 focus:ring-gold"
                        aria-label="符传月卡数量"
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Sheet>
  );
}

export function DateFilterSheet({
  open,
  onOpenChange,
  value,
  onChange,
  dates,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: string | null;
  onChange: (v: string | null) => void;
  dates: string[];
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="查询日期">
      <button
        type="button"
        onClick={() => {
          onChange(null);
          onOpenChange(false);
        }}
        className={cn(
          "mb-2 flex h-11 w-full items-center rounded-xl px-3 text-sm",
          value === null ? "bg-gold-bar text-brown-deep" : "bg-highlight text-ink",
        )}
      >
        全部日期
      </button>
      <Field label="自选">
        <TextInput
          type="date"
          value={value ?? ""}
          onChange={(e) => {
            onChange(e.target.value || null);
            onOpenChange(false);
          }}
        />
      </Field>
      {dates.length ? (
        <div className="mt-1 space-y-1">
          {dates.slice(0, 14).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                onChange(d);
                onOpenChange(false);
              }}
              className={cn(
                "flex h-11 w-full items-center rounded-xl px-3 text-sm",
                value === d ? "bg-gold-bar text-brown-deep" : "bg-highlight text-ink",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      ) : null}
    </Sheet>
  );
}

export function DimSheet({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: StatDim;
  onChange: (v: StatDim) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="时间维度">
      <div className="space-y-2">
        {DIM_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              onChange(o.id);
              onOpenChange(false);
            }}
            className={cn(
              "flex h-12 w-full items-center rounded-xl px-4 text-sm",
              value === o.id ? "bg-gold-bar text-brown-deep" : "bg-highlight text-ink",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
