-- Enums
create type task_priority as enum ('high', 'medium', 'low');
create type task_category as enum ('work', 'personal', 'finance', 'other');
create type task_status as enum ('pending', 'completed');
create type portfolio_market as enum ('usa', 'mx');
create type portfolio_currency as enum ('USD', 'MXN');

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_date timestamptz,
  priority task_priority not null default 'medium',
  category task_category not null default 'other',
  status task_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- Events
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  reminder_minutes int not null default 60,
  created_at timestamptz not null default now()
);

-- Portfolio positions
create table portfolio_positions (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  market portfolio_market not null,
  purchase_price numeric not null,
  shares numeric not null,
  alert_threshold_pct numeric not null default 8.0,
  currency portfolio_currency not null,
  created_at timestamptz not null default now()
);

-- RLS deshabilitado (app de usuario único, API usa service role)
alter table tasks disable row level security;
alter table events disable row level security;
alter table portfolio_positions disable row level security;
