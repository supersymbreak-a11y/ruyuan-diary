import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Pool, PoolType } from "./store";

export type SharedPoolDefinition = Pick<
  Pool,
  "id" | "name" | "type" | "upNames" | "cover" | "archived" | "createdAt"
>;

const sharedPoolSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(80),
  type: z.enum(["permanent", "anniversary", "limited"]),
  upNames: z.array(z.string().max(40)).max(12),
  cover: z.string().max(3_000_000).refine(
    (value) => value === "" || /^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(value),
    "封面必须是网页生成的 JPEG 图片",
  ),
  archived: z.boolean(),
  createdAt: z.string(),
});

type SharedPoolRow = {
  id: string;
  name: string;
  type: PoolType;
  upNames: string[];
  cover: string;
  archived: boolean;
  createdAt: string;
};

const listSharedPoolsServer = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("./db");
  const sql = await getSql();
  return sql<SharedPoolRow>`
    select
      id,
      name,
      type,
      up_names as "upNames",
      cover,
      archived,
      created_at::text as "createdAt"
    from shared_pools
    order by
      case when id = 'permanent' then 0 else 1 end,
      created_at desc,
      id desc
  `;
});

const saveSharedPoolServer = createServerFn({ method: "POST" })
  .validator(sharedPoolSchema)
  .handler(async ({ data }) => {
    const { getSql } = await import("./db");
    const sql = await getSql();
    await sql`
      insert into shared_pools (
        id, name, type, up_names, cover, archived, created_at, updated_at
      ) values (
        ${data.id},
        ${data.name},
        ${data.type},
        ${JSON.stringify(data.type === "limited" ? data.upNames : [])}::jsonb,
        ${data.cover},
        ${data.archived},
        ${data.createdAt}::timestamptz,
        now()
      )
      on conflict (id) do update set
        name = excluded.name,
        type = excluded.type,
        up_names = excluded.up_names,
        cover = excluded.cover,
        archived = excluded.archived,
        updated_at = now()
    `;
    return { ok: true };
  });

const SHARED_POOLS_API_URL =
  (import.meta.env.VITE_SHARED_POOLS_API_URL as string | undefined)?.replace(/\/$/, "")
  ?? "https://ruyuan-diary-pools-api.supersymbreak.workers.dev";

export async function listSharedPools(): Promise<SharedPoolRow[]> {
  if (SHARED_POOLS_API_URL) {
    const response = await fetch(`${SHARED_POOLS_API_URL}/pools`);
    if (!response.ok) throw new Error(`公共卡池读取失败（${response.status}）`);
    return (await response.json()) as SharedPoolRow[];
  }
  return listSharedPoolsServer();
}

export async function saveSharedPool({ data }: { data: SharedPoolDefinition }): Promise<{ ok: true }> {
  if (SHARED_POOLS_API_URL) {
    const response = await fetch(`${SHARED_POOLS_API_URL}/pools`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`公共卡池保存失败（${response.status}）`);
    return (await response.json()) as { ok: true };
  }
  return saveSharedPoolServer({ data });
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

export function publishSharedPool(pool: Pool) {
  void saveSharedPool({ data: toSharedPool(pool) }).catch((error) => {
    console.error("公共卡池保存失败", error);
  });
}
