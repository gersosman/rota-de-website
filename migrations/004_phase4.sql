alter table leads add column if not exists pipeline_stage text not null default 'new';
alter table leads drop constraint if exists leads_pipeline_stage_check;
alter table leads add constraint leads_pipeline_stage_check check (
  pipeline_stage in (
    'new', 'precheck', 'missing_info', 'suitable', 'matched', 'interview', 'offer',
    'contract', 'official', 'visa_pending', 'visa_approved', 'entered', 'started', 'completed', 'closed'
  )
);
alter table leads add column if not exists telegram_user_id text;

create table if not exists pipeline_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id),
  from_stage text,
  to_stage text not null,
  actor_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  full_name text not null,
  email text not null,
  message text not null,
  contact_preference text not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'waiting', 'answered', 'closed')),
  assigned_to uuid,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  city text,
  contact_person text,
  contact_email text,
  contact_phone text,
  industry text,
  company_status text not null default 'active' check (company_status in ('active', 'paused', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists job_opportunities (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id),
  job_title text not null,
  job_location text,
  salary_amount numeric,
  salary_basis text check (salary_basis in ('gross', 'net')),
  currency text not null default 'EUR',
  period_note text,
  working_hours text,
  job_type text,
  required_license text,
  required_qualification text,
  language_requirements text,
  accommodation_info text,
  contract_type text,
  available_positions integer,
  status text not null default 'draft' check (status in ('draft', 'open', 'paused', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists candidate_matches (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references leads(id),
  job_opportunity_id uuid not null references job_opportunities(id),
  match_status text not null default 'proposed' check (
    match_status in ('proposed', 'interview', 'declined', 'offer', 'contract', 'closed')
  ),
  interview_date date,
  employer_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  city text,
  stage_label text,
  body text not null,
  image_path text,
  hide_photo boolean not null default true,
  publication_consent boolean not null default false,
  approved boolean not null default false,
  representative boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  locale text not null check (locale in ('tr', 'de')),
  title text not null,
  body text not null,
  source_url text,
  source_label text,
  reviewed_on date,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, locale)
);

alter table contact_messages enable row level security;
alter table employers enable row level security;
alter table job_opportunities enable row level security;
alter table candidate_matches enable row level security;
alter table testimonials enable row level security;
alter table knowledge_articles enable row level security;
alter table pipeline_events enable row level security;
