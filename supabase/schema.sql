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

-- Payslip module (ported from standalone payslip-system; single-user, no auth cols).
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ssm_no text not null,
  address text not null,
  business_type text,
  start_date date, reg_date date, expiry_date date,
  created_at timestamptz default now()
);
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  ic_no text, epf_no text, socso_no text, income_tax_no text,
  bank_name text, bank_account text, designation text,
  join_date date,
  basic_salary numeric(12,2) not null default 0,
  is_active boolean default true,
  age_over_60 boolean default false,
  is_malaysian boolean default true,
  created_at timestamptz default now()
);
create table if not exists payslips (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  basic_salary numeric(12,2) not null,
  allowances numeric(12,2) not null default 0,
  overtime numeric(12,2) not null default 0,
  bonus numeric(12,2) not null default 0,
  gross_pay numeric(12,2) not null,
  epf_employee numeric(12,2) not null default 0,
  epf_employer numeric(12,2) not null default 0,
  socso_employee numeric(12,2) not null default 0,
  socso_employer numeric(12,2) not null default 0,
  eis_employee numeric(12,2) not null default 0,
  eis_employer numeric(12,2) not null default 0,
  pcb numeric(12,2) not null default 0,
  other_deductions numeric(12,2) not null default 0,
  total_deductions numeric(12,2) not null,
  net_pay numeric(12,2) not null,
  pdf_path text,
  notes text,
  created_at timestamptz default now(),
  unique (employee_id, period_year, period_month)
);
alter table companies enable row level security;
alter table employees enable row level security;
alter table payslips enable row level security;

-- Face ID / passkey credentials (WebAuthn), one row per registered device.
create table if not exists passkeys (
  id text primary key,              -- credential id (base64url)
  public_key text not null,         -- COSE public key (base64url)
  counter bigint not null default 0,
  transports text,
  created_at timestamptz default now()
);
alter table passkeys enable row level security;

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
