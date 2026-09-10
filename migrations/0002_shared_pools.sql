create table if not exists shared_pools (
  id text primary key,
  name text not null,
  type text not null check (type in ('permanent', 'anniversary', 'limited')),
  up_names jsonb not null default '[]'::jsonb,
  cover text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shared_pools_created_at_idx
  on shared_pools (created_at);
