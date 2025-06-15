-- Orders table
create table if not exists public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  razorpay_order_id text not null,
  razorpay_payment_id text,
  razorpay_signature text,
  plan_id text not null,
  plan_name text not null,
  amount numeric not null,
  currency text not null default 'INR',
  interval text not null default 'month',
  status text not null default 'created',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Subscriptions table
create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null unique,
  plan_id text not null,
  plan_name text not null,
  status text not null default 'active',
  start_date timestamp with time zone default now() not null,
  end_date timestamp with time zone not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- RLS policies for orders
alter table public.orders enable row level security;
create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);
create policy "Service role can manage orders"
  on public.orders for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- RLS policies for subscriptions
alter table public.subscriptions enable row level security;
create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (auth.jwt() ->> 'role' = 'service_role');
