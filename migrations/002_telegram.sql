-- Phase 2: Telegram update idempotency and button-flow state.
-- Secrets stay in the environment. These tables store chat state only.

create table telegram_updates (
  update_id bigint primary key,
  received_at timestamptz not null default now()
);

create table telegram_sessions (
  chat_key text primary key,
  step text not null,
  draft jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table telegram_updates enable row level security;
alter table telegram_sessions enable row level security;

update integration_accounts
set last_error = 'Bot bağlı değil. Token doğrulanmadan ve webhook kurulmadan bağlı gösterilmez.',
    updated_at = now()
where provider = 'telegram' and status = 'disconnected';
