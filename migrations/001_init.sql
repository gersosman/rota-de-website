-- ROTA DE core schema.
-- Portable Postgres: local PGlite, Cursor Postgres, and Supabase.
-- The Next.js server connects as the table owner (or Supabase service role),
-- which bypasses row level security. ENABLE ROW LEVEL SECURITY with no
-- policies denies the Supabase anon and authenticated roles. Do not point
-- a browser client at these tables. Do not store integration secrets here.

create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('admin', 'operator')),
  password_hash text not null,
  mfa_enabled boolean not null default false,
  mfa_secret_enc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);

create table recovery_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  token_hash text not null unique,
  mfa_passed boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_agent text,
  ip_hash text
);

create index sessions_profile_id_idx on sessions (profile_id);

create table lead_counters (
  year integer primary key,
  last_value integer not null
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  full_name text not null,
  email text,
  contact_preference text not null check (
    contact_preference in ('email', 'telegram', 'instagram', 'phone', 'unspecified')
  ),
  phone text,
  telegram_handle text,
  instagram_handle text,
  country text,
  age_range text,
  licence_classes jsonb not null default '[]'::jsonb,
  licence_country text,
  experience_range text,
  eu_eea_licence text check (eu_eea_licence in ('yes', 'no', 'unknown')),
  code95_status text check (code95_status in ('yes', 'no', 'unknown')),
  german_level text,
  intent text,
  source text not null check (
    source in ('website_assessment', 'website_contact', 'manual', 'telegram', 'instagram')
  ),
  status text not null check (
    status in (
      'NEW',
      'PRE_QUALIFICATION',
      'NEEDS_REVIEW',
      'CONTACTED',
      'CONSULTATION_PENDING',
      'PAYMENT_PENDING',
      'PAID',
      'ACTIVE',
      'COMPLETED',
      'CLOSED'
    )
  ),
  scenario_hint text check (
    scenario_hint in (
      'BESCHV_24A_ABS1_RELATED',
      'BESCHV_24A_ABS2_RELATED',
      'INSUFFICIENT_INFORMATION',
      'NEEDS_REVIEW'
    )
  ),
  notes text,
  last_contact_at timestamptz,
  follow_up_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index leads_status_idx on leads (status);
create index leads_created_at_idx on leads (created_at desc);
create index leads_email_idx on leads (email);
create index leads_open_idx on leads (deleted_at, status);

create table lead_status_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create index lead_status_events_lead_idx on lead_status_events (lead_id, created_at);

create table lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  author_id uuid references profiles (id),
  body text not null,
  counts_as_contact boolean not null default false,
  created_at timestamptz not null default now()
);

create index lead_notes_lead_idx on lead_notes (lead_id, created_at);

create table legislation_versions (
  id uuid primary key default gen_random_uuid(),
  version_label text not null,
  review_status text not null default 'unverified' check (
    review_status in ('unverified', 'internal_draft', 'reviewed_internally')
  ),
  summary_tr text not null,
  summary_de text not null,
  abs1_label_tr text not null,
  abs1_label_de text not null,
  abs1_note_tr text not null,
  abs1_note_de text not null,
  abs2_label_tr text not null,
  abs2_label_de text not null,
  abs2_note_tr text not null,
  abs2_note_de text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index legislation_one_active on legislation_versions (is_active) where is_active;

create table lead_assessments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  legislation_version_id uuid references legislation_versions (id),
  answers jsonb not null,
  classification text not null check (
    classification in (
      'BESCHV_24A_ABS1_RELATED',
      'BESCHV_24A_ABS2_RELATED',
      'INSUFFICIENT_INFORMATION',
      'NEEDS_REVIEW'
    )
  ),
  classification_reason text not null,
  disclaimer_ack boolean not null default false,
  created_at timestamptz not null default now()
);

create index lead_assessments_lead_idx on lead_assessments (lead_id, created_at);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads (id) on delete set null,
  channel text not null check (channel in ('website', 'telegram', 'instagram', 'email')),
  external_thread_id text,
  status text not null default 'open' check (status in ('open', 'waiting_human', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, external_thread_id)
);

create index conversations_lead_idx on conversations (lead_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound', 'internal')),
  body text not null,
  category text,
  knowledge_source_id uuid,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);

create table services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_tr text not null,
  name_de text not null,
  description_tr text not null,
  description_de text not null,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'EUR',
  active boolean not null default false,
  legally_separate boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table service_orders (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id),
  service_id uuid not null references services (id),
  status text not null check (
    status in ('draft', 'pending_payment', 'paid', 'cancelled', 'refunded')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references service_orders (id),
  lead_id uuid references leads (id),
  provider text not null,
  provider_ref text,
  status text not null check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'EUR',
  verified_via_webhook boolean not null default false,
  created_at timestamptz not null default now(),
  constraint payments_success_requires_webhook check (
    status <> 'succeeded' or verified_via_webhook
  )
);

create index payments_lead_idx on payments (lead_id);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('requested', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index appointments_window_idx on appointments (starts_at, status);

create table content_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('reel', 'image', 'carousel', 'story')),
  title text not null,
  status text not null check (
    status in ('draft', 'in_review', 'approved', 'scheduled', 'published', 'failed', 'manual')
  ),
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table content_assets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references content_posts (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table automation_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  status text not null check (status in ('pending', 'running', 'succeeded', 'failed')),
  idempotency_key text unique,
  last_error text,
  run_at timestamptz,
  finished_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index automation_jobs_status_idx on automation_jobs (status, created_at desc);

create table automation_settings (
  kind text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table faq_entries (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('tr', 'de')),
  question text not null,
  answer text not null,
  published boolean not null default false,
  source_note text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('faq', 'legislation', 'service', 'policy')),
  body text not null,
  version_label text not null,
  review_status text not null check (
    review_status in ('unverified', 'internal_draft', 'reviewed_internally')
  ),
  is_active boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads (id) on delete set null,
  purpose text not null,
  text_version text not null,
  granted boolean not null,
  created_at timestamptz not null default now()
);

create table integration_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  status text not null check (status in ('disconnected', 'mock', 'connected', 'error')),
  external_account_id text,
  secret_ref text,
  last_error text,
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on audit_logs (created_at desc);

create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table deletion_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads (id),
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  note text
);

create table intake_submissions (
  idempotency_key text primary key,
  lead_id uuid not null references leads (id) on delete cascade,
  public_code text not null,
  created_at timestamptz not null default now()
);

create table rate_limits (
  bucket text primary key,
  hits integer not null,
  window_start timestamptz not null
);

create table internal_keys (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table recovery_codes enable row level security;
alter table sessions enable row level security;
alter table lead_counters enable row level security;
alter table leads enable row level security;
alter table lead_status_events enable row level security;
alter table lead_notes enable row level security;
alter table legislation_versions enable row level security;
alter table lead_assessments enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table services enable row level security;
alter table service_orders enable row level security;
alter table payments enable row level security;
alter table appointments enable row level security;
alter table content_posts enable row level security;
alter table content_assets enable row level security;
alter table automation_jobs enable row level security;
alter table automation_settings enable row level security;
alter table faq_entries enable row level security;
alter table knowledge_sources enable row level security;
alter table consent_records enable row level security;
alter table integration_accounts enable row level security;
alter table audit_logs enable row level security;
alter table app_settings enable row level security;
alter table deletion_requests enable row level security;
alter table intake_submissions enable row level security;
alter table rate_limits enable row level security;
alter table internal_keys enable row level security;

insert into legislation_versions (
  id,
  version_label,
  review_status,
  summary_tr,
  summary_de,
  abs1_label_tr,
  abs1_label_de,
  abs1_note_tr,
  abs1_note_de,
  abs2_label_tr,
  abs2_label_de,
  abs2_note_tr,
  abs2_note_de,
  is_active
) values (
  '00000000-0000-4000-8000-000000000001',
  'taslak-0',
  'unverified',
  'Bu metin doğrulanmamış bir taslaktır. Güncel Beschäftigungsverordnung metnini resmî kaynaktan kontrol edip yönetim panelinden güncelleyin. Sistem vize, oturum, çalışma izni veya iş kararı vermez.',
  'Dieser Text ist ein ungeprüfter Entwurf. Der aktuelle Wortlaut der Beschäftigungsverordnung ist aus der amtlichen Quelle zu prüfen und im Verwaltungsbereich zu pflegen. Das System trifft keine Entscheidung über Visum, Aufenthalt, Beschäftigungserlaubnis oder ein Arbeitsverhältnis.',
  '§ 24a Abs. 1 ile ilişkili inceleme izi',
  'Prüfpfad mit Bezug zu § 24a Abs. 1',
  'Aday AB/AEA sürücü belgesi ve Code 95 bildirdiğinde dosya bu izle insan incelemesine ayrılır. Bu bir kabul veya ret değildir. Rakamsal eşikler bu sürüme kodlanmaz; ölçüt metnini yönetici günceller.',
  'Wenn eine EU/EWR-Fahrerlaubnis und Code 95 angegeben werden, wird die Akte diesem Prüfpfad zur menschlichen Prüfung zugeordnet. Das ist keine Zu- oder Absage. Zahlengrenzen sind nicht im Code festgeschrieben.',
  '§ 24a Abs. 2 ile ilişkili inceleme izi',
  'Prüfpfad mit Bezug zu § 24a Abs. 2',
  'Aday meslekî tır ehliyeti bildirdiğinde ve Code 95 olmadığını belirttiğinde dosya bu izle insan incelemesine ayrılır. Bu bir kabul veya ret değildir.',
  'Wenn eine berufliche Lkw-Klasse angegeben und Code 95 verneint wird, wird die Akte diesem Prüfpfad zur menschlichen Prüfung zugeordnet. Das ist keine Zu- oder Absage.',
  true
);

insert into app_settings (key, value) values
  (
    'company',
    '{
      "legalName": "",
      "legalForm": "",
      "addressLine": "",
      "postalCode": "",
      "city": "",
      "country": "",
      "email": "",
      "phone": "",
      "registerCourt": "",
      "registerNumber": "",
      "vatId": "",
      "responsiblePerson": ""
    }'::jsonb
  ),
  (
    'retention',
    '{
      "leadDays": 730,
      "auditDays": 365,
      "note": "Bu süre yasal tavsiye değildir. Saklama kararını işletme kendisi verir."
    }'::jsonb
  );

insert into integration_accounts (provider, status, secret_ref, last_error) values
  ('instagram', 'disconnected', 'META_PAGE_ACCESS_TOKEN', 'Hesap bağlanmadı. Faz 1 bağlantı kurmaz.'),
  ('telegram', 'disconnected', 'TELEGRAM_BOT_TOKEN', 'Bot bağlanmadı. Faz 1 bağlantı kurmaz.'),
  ('email', 'disconnected', 'EMAIL_API_KEY', 'E-posta sağlayıcısı bağlanmadı.'),
  ('payment', 'disconnected', 'PAYMENT_SECRET_KEY', 'Ödeme sağlayıcısı bağlanmadı. Test modu dahil hiçbir tahsilat yapılmıyor.');

insert into automation_settings (kind, enabled) values
  ('instagram_welcome', false),
  ('telegram_welcome', false),
  ('ai_reply', false),
  ('new_lead_notice', false),
  ('payment_notice', false),
  ('appointment_reminder', false),
  ('follow_up', false),
  ('content_publish', false),
  ('failed_job_notice', false);
