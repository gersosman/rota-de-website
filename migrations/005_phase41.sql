alter table leads add column if not exists tracker_stage text not null default 'received';
alter table leads drop constraint if exists leads_tracker_stage_check;
alter table leads add constraint leads_tracker_stage_check check (
  tracker_stage in (
    'received', 'reviewing', 'contact', 'started', 'matching', 'completed',
    'missing_info', 'awaiting_reply', 'closed'
  )
);
alter table leads add column if not exists availability text;

alter table conversations drop constraint if exists conversations_channel_check;
alter table conversations add constraint conversations_channel_check check (
  channel in ('website', 'telegram', 'instagram', 'email', 'assistant')
);

create table if not exists tracker_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  from_stage text,
  to_stage text not null,
  actor_id uuid references profiles (id),
  public_message text not null,
  created_at timestamptz not null default now()
);

create index if not exists tracker_events_lead_idx on tracker_events (lead_id, created_at);

create table if not exists tracker_copy (
  stage text primary key,
  body text not null,
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_created_idx on notifications (created_at desc);

create table if not exists ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  source_url text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into tracker_copy (stage, body) values
  ('received', 'Başvurunuz ROTA DE sistemine başarıyla kaydedilmiştir. Destek ekibimiz sizinle en kısa sürede iletişime geçecektir.'),
  ('reviewing', 'Destek ekibimiz başvurunuzu incelemektedir. Bilgileriniz değerlendirildikten sonra sizinle iletişime geçilecektir.'),
  ('contact', 'Başvurunuzla ilgili değerlendirme tamamlanmıştır. Destek ekibimiz sizinle iletişim kuracaktır.'),
  ('started', 'Almanya''da şoförlük yolculuğunuz için süreç başlatılmıştır. Bundan sonraki adımlar destek ekibimiz tarafından sizinle birlikte yürütülecektir.'),
  ('matching', 'Profiliniz uygun işveren seçenekleri açısından değerlendirilmektedir. Uygun fırsatlar oluştuğunda sizinle iletişime geçilecektir.'),
  ('completed', 'ROTA DE ile yürüttüğünüz süreç tamamlanmıştır. Almanya yolculuğunuzda başarılar dileriz!'),
  ('missing_info', 'Başvurunuz için ek bilgi gerekiyor. Destek ekibimiz sizinle iletişime geçecektir.'),
  ('awaiting_reply', 'Başvurunuzla ilgili sizden bir yanıt bekleniyor. Size ulaştığımız kanalı kontrol edebilirsiniz.'),
  ('closed', 'Bu başvuru kapatılmıştır. Yeni bir değerlendirme için yeniden başvurabilirsiniz.')
on conflict (stage) do nothing;

insert into tracker_events (lead_id, to_stage, public_message)
select l.id, 'received', c.body
from leads l
join tracker_copy c on c.stage = 'received'
where l.deleted_at is null
  and not exists (select 1 from tracker_events e where e.lead_id = l.id);

insert into ai_knowledge (title, body, source_url, enabled)
select
  'ROTA DE hizmet sınırı',
  'ROTA DE başvuru toplar, adayı inceler ve uygun dosyalarda işveren görüşmesi ile sözleşme sürecinin koordinasyonunu yapar. Vize, oturum ve çalışma izni kararını Alman makamları verir. ROTA DE bu sonucu garanti etmez. İş sözleşmesi de vize garantisi değildir.',
  'https://www.gesetze-im-internet.de/beschv_2013/__24a.html',
  true
where not exists (select 1 from ai_knowledge where title = 'ROTA DE hizmet sınırı');

insert into ai_knowledge (title, body, source_url, enabled)
select
  '§24a BeschV iki yol',
  'Beschäftigungsverordnung §24a iki ayrı yolu anlatır. Abs. 1, gerekli AB/AEA sürücü belgesi ve mesleki yeterlilik koşullarını karşılayanlar içindir. Abs. 2, belirli şartlarda Almanya''da ehliyet ve mesleki yeterlilik edinilecek yolu anlatır. 15 aylık süre otomatik bir hak değildir. İş sözleşmesi, işveren, Federal İş Ajansı onayı ve eğitim koşulları kişisel duruma göre değişir.',
  'https://www.gesetze-im-internet.de/beschv_2013/__24a.html',
  true
where not exists (select 1 from ai_knowledge where title = '§24a BeschV iki yol');

insert into ai_knowledge (title, body, source_url, enabled)
select
  'SRC3 ve FQN',
  'SRC3 Türkiye''deki mesleki yeterlilik belgesidir. Almanya''daki güncel mesleki yeterlilik belgesi Fahrerqualifizierungsnachweis (FQN) adıyla anılır. Code 95 bu yeterliliğin yaygın adıdır. SRC3, FQN yerine otomatik geçmez.',
  'https://bmdv.bund.de/SharedDocs/DE/Artikel/StV/fahrerqualifizierungsnachweis.html',
  true
where not exists (select 1 from ai_knowledge where title = 'SRC3 ve FQN');

insert into ai_knowledge (title, body, source_url, enabled)
select
  'Maaş',
  'Doğrulanmış işveren verisi yokken net veya brüt maaş rakamı söylenmez. Brüt ile net farklıdır. Vergi sınıfı, çalışma süresi ve sözleşme sonucu değiştirir.',
  null,
  true
where not exists (select 1 from ai_knowledge where title = 'Maaş');

insert into ai_knowledge (title, body, source_url, enabled)
select
  'Aile',
  'Eş ve çocukla gelme niyeti kayda geçer. Aile birleşimi şartları oturum türüne ve aile durumuna göre değişir. A1 Almanca şartı her oturum türüne otomatik uygulanmaz. Çocuklar için tek bir yaş kuralı yazılmaz.',
  'https://www.make-it-in-germany.com/de/leben-in-deutschland/familie-nachholen',
  true
where not exists (select 1 from ai_knowledge where title = 'Aile');

insert into app_settings (key, value)
values ('assistant', '{"enabled": true, "dailyLimit": 40}'::jsonb)
on conflict (key) do nothing;

alter table tracker_events enable row level security;
alter table tracker_copy enable row level security;
alter table notifications enable row level security;
alter table ai_knowledge enable row level security;
