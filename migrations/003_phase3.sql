-- Phase 3: WhatsApp state, journey fields, first-party analytics.
-- Tokens stay in the environment. No document bytes are stored.

alter table leads drop constraint if exists leads_contact_preference_check;
alter table leads add constraint leads_contact_preference_check check (
  contact_preference in ('email', 'telegram', 'instagram', 'phone', 'whatsapp', 'unspecified')
);

alter table leads drop constraint if exists leads_source_check;
alter table leads add constraint leads_source_check check (
  source in ('website_assessment', 'website_contact', 'manual', 'telegram', 'instagram', 'whatsapp')
);

alter table conversations drop constraint if exists conversations_channel_check;
alter table conversations add constraint conversations_channel_check check (
  channel in ('website', 'telegram', 'instagram', 'email', 'whatsapp')
);

alter table leads add column if not exists ce_intent text;
alter table leads add column if not exists src3_status text;
alter table leads add column if not exists family_status text;
alter table leads add column if not exists spouse_german text;
alter table leads add column if not exists children_ages text;
alter table leads add column if not exists city text;
alter table leads add column if not exists marketing_opt_in boolean not null default false;
alter table leads add column if not exists merged_into uuid references leads (id);

alter table leads drop constraint if exists leads_ce_intent_check;
alter table leads add constraint leads_ce_intent_check check (ce_intent is null or ce_intent in ('have', 'planning'));
alter table leads drop constraint if exists leads_src3_status_check;
alter table leads add constraint leads_src3_status_check check (src3_status is null or src3_status in ('have', 'planning', 'info'));
alter table leads drop constraint if exists leads_family_status_check;
alter table leads add constraint leads_family_status_check check (family_status is null or family_status in ('alone', 'spouse', 'family'));
alter table leads drop constraint if exists leads_spouse_german_check;
alter table leads add constraint leads_spouse_german_check check (spouse_german is null or spouse_german in ('yes', 'no', 'unknown'));

alter table messages add column if not exists external_id text;
alter table messages add column if not exists delivery_status text;
create unique index if not exists messages_external_id_idx on messages (external_id) where external_id is not null;

create table if not exists whatsapp_events (
  event_key text primary key,
  received_at timestamptz not null default now()
);

create table if not exists whatsapp_sessions (
  chat_key text primary key,
  step text not null,
  draft jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  session_key text not null,
  step text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_name_idx on analytics_events (name, created_at desc);

create table if not exists lead_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  kind text not null,
  status text not null default 'not_requested' check (status in ('not_requested', 'requested', 'received')),
  created_at timestamptz not null default now()
);

alter table whatsapp_events enable row level security;
alter table whatsapp_sessions enable row level security;
alter table analytics_events enable row level security;
alter table lead_documents enable row level security;

insert into integration_accounts (provider, status, secret_ref, last_error)
values ('whatsapp', 'disconnected', 'WHATSAPP_ACCESS_TOKEN', 'Kurulum bekleniyor.')
on conflict (provider) do nothing;

insert into automation_settings (kind, enabled)
values ('whatsapp_welcome', false)
on conflict (kind) do nothing;
