-- Life System — full schema. Paste into Supabase SQL editor (new project) and run once.
-- Single-user. All access is server-side via service_role, so RLS is enabled with NO
-- policies purely as a second wall (service_role bypasses RLS; a leaked anon key gets nothing).

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'bank',        -- bank | savings | ewallet | investment | epf | cash
  balance numeric(12,2) not null default 0,
  currency text not null default 'MYR',
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null,            -- negative = spend, positive = income
  account_id uuid references accounts(id) on delete set null,
  category text,
  note text,
  life_area text default 'money',
  source text not null default 'manual',    -- manual | email | import
  occurred_on date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete set null,
  name text not null,                       -- Moomoo | Webull | ASNB | EPF A3 ...
  invested_amount numeric(12,2) not null default 0,
  current_value numeric(12,2) not null default 0,
  updated_at timestamptz default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- Japan trip, Emergency fund ...
  target_amount numeric(12,2) not null,
  saved_amount numeric(12,2) not null default 0,
  target_date date,
  priority int default 0,
  life_area text default 'money',
  created_at timestamptz default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null,                      -- Roadtax, Car insurance, Passport, Work cert ...
  life_area text default 'general',         -- car | career | travel | family | health | money | general
  due_date date not null,
  recur text not null default 'none',       -- none | monthly | yearly
  amount numeric(12,2),
  done boolean default false,
  created_at timestamptz default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  life_area text default 'general',
  created_at timestamptz default now()
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,               -- path in the 'attachments' storage bucket
  linked_table text,                        -- polymorphic: which table this belongs to
  linked_id uuid,                           -- ...and which row
  life_area text default 'general',
  note text,
  created_at timestamptz default now()
);

-- one-row settings (the Plan brain's knobs)
create table if not exists settings (
  id int primary key default 1,
  buffer_months int not null default 6,           -- your emergency-fund buffer, in months of spend
  default_monthly_spend numeric(12,2) not null default 2000,  -- fallback until enough real data
  check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- Indexes matching the app's query patterns (keep reads fast as history grows).
create index if not exists idx_transactions_occurred_on on transactions (occurred_on);
create index if not exists idx_transactions_account     on transactions (account_id);
create index if not exists idx_reminders_due            on reminders (due_date) where done = false;

-- Defense-in-depth: lock every table to server-side (service_role) access only.
alter table accounts     enable row level security;
alter table transactions enable row level security;
alter table investments  enable row level security;
alter table goals        enable row level security;
alter table reminders    enable row level security;
alter table notes        enable row level security;
alter table attachments  enable row level security;
alter table settings     enable row level security;
