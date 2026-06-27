-- SELLIZI Supabase schema starter.
-- Admin tables are intentionally prefixed with admin_ to keep the admin space separate from seller and buyer RLS paths.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'seller' check (role in ('seller', 'buyer', 'admin')),
  display_name text,
  username text unique,
  bio text,
  phone text,
  country text,
  avatar_url text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.seller_stores (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  name text not null,
  slug text unique not null,
  logo_url text,
  currency text not null default 'XAF',
  social_links jsonb not null default '{}',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.seller_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  store_id uuid references public.seller_stores(id),
  product_type text not null,
  name text not null,
  description text,
  price numeric(14,2) not null default 0,
  currency text not null default 'XAF',
  image_url text,
  delivery_schema jsonb not null default '{}',
  delivery_payload jsonb not null default '{}',
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.buyer_purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_email text not null,
  buyer_name text,
  buyer_id uuid references public.profiles(id),
  product_id uuid references public.seller_products(id),
  seller_id uuid references public.profiles(id),
  payment_reference text unique,
  payment_status text not null default 'pending',
  pin_hash text,
  access_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  target_email text,
  type text not null check (type in ('order', 'payment', 'broadcast')),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  requester_email text,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  priority text not null default 'normal',
  created_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  sender_role text not null default 'user',
  body text not null,
  attachment_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id),
  product_id uuid references public.seller_products(id),
  buyer_id uuid references public.profiles(id),
  anonymous_id text,
  event_type text not null,
  referrer text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id),
  target_email text,
  target_all boolean not null default false,
  type text not null check (type in ('info', 'promo', 'alert')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_ashtechpay_transactions (
  id uuid primary key default gen_random_uuid(),
  reference text,
  transaction_id text,
  buyer_email text,
  amount numeric(14,2),
  currency text,
  country_code text,
  operator text,
  phone text,
  status text,
  raw_response jsonb,
  raw_webhook jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_ashtechpay_webhooks (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table if not exists public.admin_support_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_email text,
  subject text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  source text,
  body text,
  raw_context jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.seller_stores enable row level security;
alter table public.seller_products enable row level security;
alter table public.buyer_purchases enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.analytics_events enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "seller_store_owner" on public.seller_stores for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "seller_product_owner" on public.seller_products for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "buyer_purchase_by_email_or_id" on public.buyer_purchases for select using (auth.uid() = buyer_id or buyer_email = auth.jwt() ->> 'email');
create policy "notifications_owner" on public.notifications for all using (auth.uid() = user_id or target_email = auth.jwt() ->> 'email') with check (auth.uid() = user_id or target_email = auth.jwt() ->> 'email');
create policy "tickets_owner" on public.support_tickets for all using (auth.uid() = user_id or requester_email = auth.jwt() ->> 'email') with check (auth.uid() = user_id or requester_email = auth.jwt() ->> 'email');
create policy "messages_ticket_owner" on public.support_messages for select using (exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or t.requester_email = auth.jwt() ->> 'email')));
create policy "push_owner" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "analytics_insert_any" on public.analytics_events for insert with check (true);
create policy "analytics_seller_read" on public.analytics_events for select using (auth.uid() = seller_id);

insert into public.admin_settings(key, value)
values ('support_email', '"honestansah@gmial.com"'::jsonb)
on conflict (key) do nothing;
