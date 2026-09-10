import type { Pool } from "./store";

export type SharedPoolDefinition = Pick<
  Pool,
  "id" | "name" | "type" | "upNames" | "cover" | "archived" | "createdAt"
>;

export async function listSharedPools(): Promise<SharedPoolDefinition[]> {
  return [];
}

export async function saveSharedPool(): Promise<{ ok: true }> {
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

export function publishSharedPool(): void {}
