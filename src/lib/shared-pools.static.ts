import type { Pool } from "./store";

export type SharedPoolDefinition = Pick<
  Pool,
  "id" | "name" | "type" | "upNames" | "cover" | "archived" | "createdAt"
>;

const API_URL = (import.meta.env.VITE_SHARED_POOLS_API_URL as string | undefined)?.replace(/\/$/, "");

function normalizeRemotePools(value: unknown): SharedPoolDefinition[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const item = row as Record<string, unknown>;
    let upNames: string[] = [];
    if (Array.isArray(item.upNames)) upNames = item.upNames.filter((name): name is string => typeof name === "string");
    else if (typeof item.upNames === "string") {
      try {
        const parsed = JSON.parse(item.upNames);
        if (Array.isArray(parsed)) upNames = parsed.filter((name): name is string => typeof name === "string");
      } catch { /* keep empty */ }
    }
    return { ...item, upNames, archived: Boolean(item.archived) } as SharedPoolDefinition;
  });
}

export async function listSharedPools(): Promise<SharedPoolDefinition[]> {
  if (!API_URL) return [];
  const response = await fetch(`${API_URL}/pools`);
  if (!response.ok) throw new Error(`公共卡池读取失败（${response.status}）`);
  return normalizeRemotePools(await response.json());
}

export async function saveSharedPool({ data }: { data: SharedPoolDefinition }): Promise<{ ok: true }> {
  if (API_URL) {
    const response = await fetch(`${API_URL}/pools`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`公共卡池保存失败（${response.status}）`);
  }
  return { ok: true };
}

export function toSharedPool(pool: Pool): SharedPoolDefinition {
  return {
    id: pool.id,
    name: pool.name,
    type: pool.type,
    upNames: pool.type === "limited" ? pool.upNames : [],
    cover: pool.cover,
    archived: pool.archived,
    createdAt: pool.createdAt,
  };
}

export function publishSharedPool(pool: Pool): void {
  void saveSharedPool({ data: toSharedPool(pool) }).catch((error) => {
    console.error("公共卡池保存失败", error);
  });
}
