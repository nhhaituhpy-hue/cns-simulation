-- Separate, durable in-progress tutoring. Never creates a practice submission.
create table public.ai_practice_hint_jobs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id),
  module_id text not null check(module_id in ('dvor-1150','dvor-1150a','dme-1119a','dvor-220','dme-320','ads-b')),
  scenario_id text not null,
  library_membership_id uuid not null references public.simulator_scenario_library_memberships(id),
  library_revision_number integer not null,
  run_key text not null check(length(run_key) between 1 and 200),
  question text not null default '' check(length(question)<=1000),
  definition_json jsonb not null,
  assessment_rubric_json jsonb,
  payload_json jsonb,
  input_hash text not null check(length(input_hash)=64),
  idempotency_key uuid not null,
  status text not null default 'queued' check(status in ('queued','running','completed','failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3 check(max_attempts between 1 and 3),
  attempt_token uuid,
  worker_id text,
  lease_expires_at timestamptz,
  available_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  result_json jsonb,
  error_code text,
  unique(actor_id,idempotency_key),
  check(attempts between 0 and max_attempts),
  check(jsonb_typeof(definition_json)='object'),
  check(assessment_rubric_json is null or jsonb_typeof(assessment_rubric_json)='object'),
  check(payload_json is null or (jsonb_typeof(payload_json)='object' and octet_length(payload_json::text)<=750000)),
  check(result_json is null or (jsonb_typeof(result_json)='object' and octet_length(result_json::text)<=25000)),
  check(input_hash ~ '^[0-9a-f]{64}$')
);
create index ai_practice_hint_claim_idx on public.ai_practice_hint_jobs(available_at,created_at) where status in ('queued','running');
create index ai_practice_hint_quota_idx on public.ai_practice_hint_jobs(actor_id,created_at);
revoke all on public.ai_practice_hint_jobs from public;
