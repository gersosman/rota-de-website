alter table leads add column if not exists contact_channels jsonb not null default '[]'::jsonb;

create table if not exists outbound_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('email', 'telegram')),
  payload jsonb not null,
  attempts integer not null default 0,
  last_error text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists outbound_jobs_due_idx on outbound_jobs (status, next_attempt_at);

alter table outbound_jobs enable row level security;
