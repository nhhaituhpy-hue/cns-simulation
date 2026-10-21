-- Private editing workspace; only explicit final confirmation creates source.
create table public.ai_authoring_sessions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete restrict,
  module_id text not null check (module_id in ('dvor-1150','dvor-1150a','dme-1119a','dvor-220','dme-320','ads-b')),
  revision integer not null default 1 check (revision > 0),
  state_json jsonb not null check (jsonb_typeof(state_json) = 'object' and octet_length(state_json::text) <= 2097152),
  documents_json jsonb not null default '[]'::jsonb check (jsonb_typeof(documents_json) = 'array' and jsonb_array_length(documents_json) <= 5),
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9._:-]{1,128}$'),
  status text not null default 'editing' check (status in ('editing','completed')),
  scenario_id text unique,
  scenario_row_id uuid unique references public.simulator_scenario_parameters(id) on delete restrict,
  finalize_idempotency_key text check (finalize_idempotency_key ~ '^[A-Za-z0-9._:-]{1,128}$'),
  finalized_revision integer check (finalized_revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (actor_id, idempotency_key),
  unique (id, actor_id),
  constraint ai_authoring_completion_shape check (
    (status='editing' and scenario_id is null and scenario_row_id is null and finalize_idempotency_key is null and finalized_revision is null and completed_at is null)
    or (status='completed' and scenario_id is not null and scenario_row_id is not null and finalize_idempotency_key is not null and finalized_revision is not null and finalized_revision=revision and completed_at is not null)
  )
);
create index ai_authoring_actor_recent_idx on public.ai_authoring_sessions (actor_id, module_id, updated_at desc, id);
create trigger ai_authoring_set_updated_at before update on public.ai_authoring_sessions for each row execute function public.set_updated_at();
revoke all on table public.ai_authoring_sessions from public;

-- Upload namespaces remain owned even after documents are replaced.
create table public.ai_authoring_document_namespaces (
  namespace uuid primary key,
  session_id uuid not null,
  actor_id uuid not null,
  foreign key (session_id,actor_id) references public.ai_authoring_sessions(id,actor_id) on delete restrict
);
create index ai_authoring_document_session_idx on public.ai_authoring_document_namespaces(session_id);
revoke all on table public.ai_authoring_document_namespaces from public;

create table public.ai_authoring_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  actor_id uuid not null references public.users(id) on delete restrict,
  base_revision integer not null check (base_revision > 0),
  request_json jsonb not null check (jsonb_typeof(request_json) = 'object' and octet_length(request_json::text) <= 16384),
  state_json jsonb not null check (jsonb_typeof(state_json) = 'object' and octet_length(state_json::text) <= 2097152),
  documents_json jsonb not null default '[]'::jsonb check (jsonb_typeof(documents_json) = 'array' and jsonb_array_length(documents_json) <= 5),
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9._:-]{1,128}$'),
  status text not null default 'queued' check (status in ('queued','running','completed','failed','stale')),
  attempts integer not null default 0 check (attempts between 0 and 2),
  attempt_token uuid,
  worker_id text check (length(worker_id) between 1 and 200),
  lease_expires_at timestamptz,
  error_code text check (error_code is null or error_code ~ '^[A-Z_]{1,64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (session_id, idempotency_key),
  foreign key (session_id, actor_id) references public.ai_authoring_sessions(id, actor_id) on delete restrict,
  constraint ai_authoring_analysis_lease_shape check (
    (status='running' and attempts>0 and attempt_token is not null and worker_id is not null and lease_expires_at is not null)
    or (status<>'running' and lease_expires_at is null)
  ),
  constraint ai_authoring_analysis_completion_shape check (
    (status in ('queued','running') and completed_at is null)
    or (status in ('completed','failed','stale') and completed_at is not null)
  )
);
create index ai_authoring_analysis_claim_idx on public.ai_authoring_analysis_jobs (created_at,id) where status in ('queued','running');
create index ai_authoring_analysis_actor_idx on public.ai_authoring_analysis_jobs (actor_id,status);
create index ai_authoring_analysis_daily_idx on public.ai_authoring_analysis_jobs (actor_id,created_at desc);
create index ai_authoring_analysis_session_idx on public.ai_authoring_analysis_jobs (session_id,created_at desc,id desc);
create trigger ai_authoring_analysis_set_updated_at before update on public.ai_authoring_analysis_jobs for each row execute function public.set_updated_at();
revoke all on table public.ai_authoring_analysis_jobs from public;
comment on table public.ai_authoring_sessions is 'Private admin-owned guided drafts, never published automatically.';
comment on table public.ai_authoring_analysis_jobs is 'Private leased analysis snapshots; completion never creates a scenario source.';
