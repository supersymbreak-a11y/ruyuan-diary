CREATE TABLE IF NOT EXISTS shared_pools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('permanent', 'anniversary', 'limited')),
  up_names TEXT NOT NULL DEFAULT '[]',
  cover TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
