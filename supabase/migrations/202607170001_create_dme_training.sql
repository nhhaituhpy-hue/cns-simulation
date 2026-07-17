-- DME training data is intentionally isolated from VOR and ADS-B.
-- The permissive policies are for the current internal MVP only.

create table if not exists public.dme_scenarios (
  id text primary key,
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  prompt text not null,
  overrides jsonb not null default '[]'::jsonb,
  expected_checkpoints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists dme_scenarios_created_at_idx
  on public.dme_scenarios (created_at desc);

create table if not exists public.dme_submissions (
  id text primary key,
  scenario_id text not null references public.dme_scenarios(id) on delete cascade,
  student_name text not null,
  student_code text not null,
  status text not null check (status in ('draft', 'submitted', 'reviewed')),
  started_at timestamptz not null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  events jsonb not null default '[]'::jsonb,
  answer jsonb not null default '{}'::jsonb,
  score numeric check (score is null or (score >= 0 and score <= 100)),
  examiner_comment text
);

create index if not exists dme_submissions_scenario_idx
  on public.dme_submissions (scenario_id, submitted_at desc);
create index if not exists dme_submissions_status_idx
  on public.dme_submissions (status, submitted_at desc);

alter table public.dme_scenarios enable row level security;
alter table public.dme_submissions enable row level security;

revoke all on table public.dme_scenarios from anon, authenticated;
revoke all on table public.dme_submissions from anon, authenticated;
grant select, insert, update, delete on table public.dme_scenarios to anon, authenticated;
grant select, insert, update, delete on table public.dme_submissions to anon, authenticated;

drop policy if exists "temporary public manage dme scenarios" on public.dme_scenarios;
create policy "temporary public manage dme scenarios"
  on public.dme_scenarios for all to anon, authenticated
  using (true) with check (true);

drop policy if exists "temporary public manage dme submissions" on public.dme_submissions;
create policy "temporary public manage dme submissions"
  on public.dme_submissions for all to anon, authenticated
  using (true) with check (true);
