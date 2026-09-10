export interface Env {
  DB: D1Database;
  ADMIN_TOKEN?: string;
}

type PoolInput = {
  id: string;
  name: string;
  type: "permanent" | "anniversary" | "limited";
  upNames: string[];
  cover: string;
  archived: boolean;
  createdAt: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

function validPool(value: unknown): value is PoolInput {
  if (!value || typeof value !== "object") return false;
  const pool = value as Record<string, unknown>;
  return typeof pool.id === "string" && pool.id.length > 0 && pool.id.length <= 120
    && typeof pool.name === "string" && pool.name.length > 0 && pool.name.length <= 80
    && ["permanent", "anniversary", "limited"].includes(pool.type as string)
    && Array.isArray(pool.upNames) && pool.upNames.every((name) => typeof name === "string")
    && typeof pool.cover === "string" && pool.cover.length <= 3_000_000
    && typeof pool.archived === "boolean" && typeof pool.createdAt === "string";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    const url = new URL(request.url);
    if (url.pathname !== "/pools") return json({ error: "Not found" }, 404);

    if (request.method === "GET") {
      const result = await env.DB.prepare(
        "SELECT id, name, type, up_names AS upNames, cover, archived, created_at AS createdAt FROM shared_pools ORDER BY CASE WHEN id = 'permanent' THEN 0 ELSE 1 END, created_at DESC, id DESC",
      ).all<PoolInput>();
      return json(result.results);
    }

    if (request.method === "POST") {
      if (env.ADMIN_TOKEN && request.headers.get("authorization") !== `Bearer ${env.ADMIN_TOKEN}`) {
        return json({ error: "Unauthorized" }, 401);
      }
      const body = await request.json().catch(() => null);
      if (!validPool(body)) return json({ error: "Invalid pool" }, 400);
      const pool = body as PoolInput;
      await env.DB.prepare(
        "INSERT INTO shared_pools (id, name, type, up_names, cover, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, up_names=excluded.up_names, cover=excluded.cover, archived=excluded.archived, updated_at=datetime('now')",
      ).bind(pool.id, pool.name, pool.type, JSON.stringify(pool.upNames), pool.cover, pool.archived ? 1 : 0, pool.createdAt).run();
      return json({ ok: true });
    }
    return json({ error: "Method not allowed" }, 405);
  },
};
