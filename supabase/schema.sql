create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text not null,
  age integer,
  email text,
  branch text,
  procedure text,
  preferred_date date,
  preferred_time time,
  contact_method text,
  request_type text,
  message text,
  handled boolean not null default false
);

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_type text not null default 'contact',
  page text,
  fields jsonb not null default '{}'::jsonb,
  message text,
  user_agent text,
  handled boolean not null default false
);

create table if not exists public.loyalty_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page text,
  email text,
  fields jsonb not null default '{}'::jsonb,
  message text,
  user_agent text,
  handled boolean not null default false
);

create table if not exists public.vip_card_enrollments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text not null,
  full_name text,
  marketing_consent boolean default false
);

alter table public.appointments enable row level security;
alter table public.contact_requests enable row level security;
alter table public.loyalty_requests enable row level security;
alter table public.vip_card_enrollments enable row level security;

drop policy if exists appointments_public_insert on public.appointments;
create policy appointments_public_insert
  on public.appointments
  for insert
  to anon
  with check (
    char_length(trim(full_name)) >= 2
    and char_length(regexp_replace(phone, '\D', '', 'g')) >= 7
  );

drop policy if exists "Anyone can submit VIP card enrollment" on public.vip_card_enrollments;
create policy "Anyone can submit VIP card enrollment"
  on public.vip_card_enrollments
  for insert
  to anon
  with check (true);

create index if not exists appointments_created_at_idx on public.appointments (created_at desc);
create index if not exists appointments_phone_idx on public.appointments (phone);
create index if not exists contact_requests_created_at_idx on public.contact_requests (created_at desc);
create index if not exists loyalty_requests_created_at_idx on public.loyalty_requests (created_at desc);
create index if not exists loyalty_requests_email_idx on public.loyalty_requests (email);
create index if not exists vip_card_enrollments_created_at_idx on public.vip_card_enrollments (created_at desc);
create index if not exists vip_card_enrollments_email_idx on public.vip_card_enrollments (email);
