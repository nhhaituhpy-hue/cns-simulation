-- Durable private draft-generation queue. This migration never publishes a source.
create table public.ai_scenario_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete restrict,
  module_id text not null check (module_id in ('dvor-1150','dvor-1150a','dme-1119a','dvor-220','dme-320','ads-b')),
  name text not null check (length(btrim(name)) between 1 and 200),
  input_json jsonb not null check (jsonb_typeof(input_json) = 'object'),
  documents_json jsonb not null default '[]'::jsonb check (jsonb_typeof(documents_json) = 'array' and jsonb_array_length(documents_json) <= 5),
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key text not null check (length(idempotency_key) between 1 and 128),
  status text not null default 'queued' check (status in ('queued','extracting','generating','validating','completed','failed')),
  phase text not null default 'queued' check (phase in ('queued','extracting','generating','validating','completed','failed')),
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 2),
  max_attempts integer not null default 2 check (max_attempts between 1 and 2 and attempts <= max_attempts),
  attempt_token uuid,
  worker_id text,
  lease_expires_at timestamptz,
  prompt_version text not null default 'scenario-generation-v1',
  schema_version text not null default 'native-v1',
  model_version text not null default 'pending',
  provenance_json jsonb check (provenance_json is null or jsonb_typeof(provenance_json) = 'object'),
  error_code text check (error_code is null or length(error_code) <= 64),
  error_message text check (error_message is null or length(error_message) <= 300),
  scenario_id text unique,
  scenario_row_id uuid unique references public.simulator_scenario_parameters(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (actor_id, idempotency_key),
  constraint ai_generation_lease_shape check (
    (status in ('extracting','generating','validating') and attempt_token is not null and worker_id is not null and lease_expires_at is not null)
    or (status in ('queued','completed','failed') and lease_expires_at is null)
  ),
  constraint ai_generation_completion_shape check (
    (status = 'completed' and scenario_id is not null and scenario_row_id is not null and completed_at is not null)
    or (status <> 'completed' and scenario_id is null and scenario_row_id is null and completed_at is null)
  )
);
create index ai_generation_claim_idx on public.ai_scenario_generation_jobs (created_at, id) where status in ('queued','extracting','generating','validating');
create index ai_generation_actor_recent_idx on public.ai_scenario_generation_jobs (actor_id, module_id, created_at desc);
create trigger ai_generation_set_updated_at before update on public.ai_scenario_generation_jobs for each row execute function public.set_updated_at();
revoke all on table public.ai_scenario_generation_jobs from public;
comment on table public.ai_scenario_generation_jobs is 'Private admin-owned generation jobs. Completion inserts unpublished source only; no callback or automatic membership.';
