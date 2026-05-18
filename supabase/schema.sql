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

alter table public.contact_requests enable row level security;
alter table public.loyalty_requests enable row level security;

create index if not exists contact_requests_created_at_idx on public.contact_requests (created_at desc);
create index if not exists loyalty_requests_created_at_idx on public.loyalty_requests (created_at desc);
create index if not exists loyalty_requests_email_idx on public.loyalty_requests (email);
