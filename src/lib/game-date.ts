import { getISOWeek, getISOWeekYear } from "date-fns";

const TZ = "Asia/Shanghai";
const RESET_HOUR = 5;

type Wall = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function wall(date: Date): Wall {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function ymd(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftDay(year: number, month: number, day: number, delta: number) {
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

/** Game calendar date: resets at 05:00 Asia/Shanghai. */
export function getGameDate(now = new Date()): string {
  const w = wall(now);
  if (w.hour < RESET_HOUR) {
    const prev = shiftDay(w.year, w.month, w.day, -1);
    return ymd(prev.year, prev.month, prev.day);
  }
  return ymd(w.year, w.month, w.day);
}

/** Monday of the current game week (reset still 05:00). */
export function getGameWeekId(now = new Date()): string {
  const date = getGameDate(now);
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(year, month - 1, day));
  const dow = utc.getUTCDay();
  const offset = dow === 0 ? 6 : dow - 1;
  utc.setUTCDate(utc.getUTCDate() - offset);
  return utc.toISOString().slice(0, 10);
}

export function nextReset(now = new Date()): Date {
  const w = wall(now);
  const targetDay = w.hour < RESET_HOUR ? 0 : 1;
  const t = shiftDay(w.year, w.month, w.day, targetDay);
  // 05:00 Shanghai = 21:00 UTC previous calendar day
  return new Date(Date.UTC(t.year, t.month - 1, t.day, RESET_HOUR - 8, 0, 0));
}

export function formatResetCountdown(now = new Date()): string {
  const ms = Math.max(0, nextReset(now).getTime() - now.getTime());
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}分钟后刷新`;
  return `${h}小时${m}分后刷新`;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function formatGameDateLabel(now = new Date()): string {
  const date = getGameDate(now);
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(year, month - 1, day));
  const wd = WEEKDAYS[utc.getUTCDay()] ?? "";
  return `${month}月${day}日 周${wd}`;
}

export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now.getTime() - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d === 1) return "昨天";
  if (d < 7) return `${d}天前`;
  const dt = new Date(iso);
  const w = wall(dt);
  return `${w.month}月${w.day}日`;
}

export type StatDim = "week" | "month" | "year";

export function parseGameDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function periodId(date: string, dim: StatDim): string {
  const d = parseGameDate(date);
  if (dim === "week") {
    return `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, "0")}`;
  }
  if (dim === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return String(d.getFullYear());
}

export function periodLabel(id: string, dim: StatDim): string {
  if (dim === "week") {
    const [y, w] = id.split("-W");
    return `${y}年第${Number(w)}周`;
  }
  if (dim === "month") {
    const [y, m] = id.split("-");
    return `${y}年${Number(m)}月`;
  }
  return `${id}年`;
}

export function formatMd(date: string) {
  const parts = date.split("-");
  return `${parts[1]}-${parts[2]}`;
}

export const DIM_OPTIONS: { id: StatDim; label: string }[] = [
  { id: "week", label: "按周统计" },
  { id: "month", label: "按月统计" },
  { id: "year", label: "按年统计" },
];
