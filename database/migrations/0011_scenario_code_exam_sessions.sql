-- Code-based Scenario Exam domain.
-- This migration is isolated from the legacy exam_* tables. It creates the
-- identity/session/audit contract; application services are responsible for
-- server-authoritative transitions and random membership assignment.

create table public.scenario_exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  opens_at timestamptz,
  closes_at timestamptz,
  duration_minutes integer not null,
  status text not null default 'draft',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scenario_exams_name_valid check (length(btrim(name)) between 3 and 200),
  constraint scenario_exams_description_valid check (length(description) <= 2000),
  constraint scenario_exams_duration_valid check (duration_minutes between 1 and 1440),
  constraint scenario_exams_window_valid check (closes_at is null or opens_at is null or closes_at > opens_at),
  constraint scenario_exams_status_valid check (status in ('draft', 'open', 'locked', 'closed', 'archived'))
);

create table public.scenario_exam_codes (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.scenario_exams(id) on delete restrict,
  code_hash text not null unique,
  code_hint text not null,
  candidate_name text not null,
  candidate_unit text not null,
  status text not null default 'issued',
  issued_at timestamptz not null default now(),
  redeemed_at timestamptz,
  revoked_at timestamptz,
  terminal_at timestamptz,
  redeem_user_id uuid references public.users(id) on delete set null,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scenario_exam_codes_hash_valid check (code_hash ~ '^[0-9a-f]{64}$'),
  constraint scenario_exam_codes_hint_valid check (length(btrim(code_hint)) between 2 and 16),
  constraint scenario_exam_codes_candidate_name_valid check (length(btrim(candidate_name)) between 2 and 160),
  constraint scenario_exam_codes_candidate_unit_valid check (length(btrim(candidate_unit)) between 2 and 200),
  constraint scenario_exam_codes_status_valid check (status in ('issued', 'redeemed', 'in_progress', 'submitted', 'timed_out', 'revoked'))
);

create table public.scenario_exam_code_subjects (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.scenario_exam_codes(id) on delete restrict,
  module_id text not null,
  position integer not null,
  status text not null default 'not_started',
  started_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scenario_exam_code_subjects_module_valid check (
    module_id in ('dvor-1150', 'dvor-1150a', 'dme-1119a', 'dvor-220', 'dme-320', 'ads-b')
  ),
  constraint scenario_exam_code_subjects_position_valid check (position > 0),
  constraint scenario_exam_code_subjects_status_valid check (status in ('not_started', 'in_progress', 'submitted', 'timed_out')),
  unique (code_id, module_id),
  unique (code_id, position)
);

create table public.scenario_exam_sessions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null unique references public.scenario_exam_codes(id) on delete restrict,
  candidate_user_id uuid references public.users(id) on delete set null,
  session_token_hash text not null unique,
  status text not null default 'in_progress',
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  terminal_reason text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scenario_exam_sessions_token_hash_valid check (session_token_hash ~ '^[0-9a-f]{64}$'),
  constraint scenario_exam_sessions_status_valid check (status in ('in_progress', 'submitted', 'timed_out', 'revoked')),
  constraint scenario_exam_sessions_reason_valid check (terminal_reason is null or terminal_reason in ('submitted', 'timed_out', 'revoked')),
  constraint scenario_exam_sessions_deadline_valid check (deadline_at > started_at),
  constraint scenario_exam_sessions_terminal_valid check (
    (status = 'in_progress' and submitted_at is null and terminal_reason is null)
    or (status in ('submitted', 'timed_out', 'revoked') and submitted_at is not null and terminal_reason is not null)
  )
);

create table public.scenario_exam_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.scenario_exam_sessions(id) on delete restrict,
  code_subject_id uuid not null references public.scenario_exam_code_subjects(id) on delete restrict,
  module_id text not null,
  library_membership_id uuid not null references public.simulator_scenario_library_memberships(id) on delete restrict,
  library_revision_number integer not null,
  scenario_id text not null,
  scenario_name text not null,
  definition_snapshot_json jsonb not null,
  engine_version text not null,
  evaluator_version text not null,
  status text not null default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  submission_ref text,
  result_json jsonb,
  result_summary_json jsonb,
  examiner_score numeric(5,2),
  examiner_comment text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scenario_exam_session_items_module_valid check (
    module_id in ('dvor-1150', 'dvor-1150a', 'dme-1119a', 'dvor-220', 'dme-320', 'ads-b')
  ),
  constraint scenario_exam_session_items_revision_valid check (library_revision_number > 0),
  constraint scenario_exam_session_items_definition_object check (jsonb_typeof(definition_snapshot_json) = 'object'),
  constraint scenario_exam_session_items_result_object check (result_json is null or jsonb_typeof(result_json) = 'object'),
  constraint scenario_exam_session_items_summary_object check (result_summary_json is null or jsonb_typeof(result_summary_json) = 'object'),
  constraint scenario_exam_session_items_status_valid check (status in ('in_progress', 'submitted', 'timed_out')),
  constraint scenario_exam_session_items_score_valid check (examiner_score is null or examiner_score between 0 and 100),
  constraint scenario_exam_session_items_comment_valid check (examiner_comment is null or length(examiner_comment) <= 4000),
  unique (session_id, code_subject_id)
);

create table public.scenario_exam_audit_events (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.scenario_exams(id) on delete restrict,
  code_id uuid references public.scenario_exam_codes(id) on delete restrict,
  session_id uuid references public.scenario_exam_sessions(id) on delete restrict,
  actor_user_id uuid references public.users(id) on delete set null,
  event_type text not null,
  event_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint scenario_exam_audit_event_type_valid check (
    event_type in (
      'exam_created', 'exam_opened', 'exam_locked', 'exam_closed',
      'code_issued', 'code_redeemed', 'session_started', 'subject_started',
      'scenario_assigned', 'item_submitted', 'session_submitted',
      'session_timed_out', 'code_revoked', 'review_updated'
    )
  ),
  constraint scenario_exam_audit_event_object check (jsonb_typeof(event_json) = 'object')
);

create index scenario_exams_status_window_idx
  on public.scenario_exams (status, opens_at, closes_at);

create index scenario_exam_codes_exam_status_idx
  on public.scenario_exam_codes (exam_id, status, created_at desc);

create index scenario_exam_code_subjects_code_position_idx
  on public.scenario_exam_code_subjects (code_id, position);

create index scenario_exam_sessions_active_deadline_idx
  on public.scenario_exam_sessions (status, deadline_at)
  where status = 'in_progress';

create index scenario_exam_session_items_session_status_idx
  on public.scenario_exam_session_items (session_id, status, module_id);

create index scenario_exam_audit_events_code_created_idx
  on public.scenario_exam_audit_events (code_id, created_at desc);

create trigger scenario_exams_set_updated_at
before update on public.scenario_exams
for each row execute function public.set_updated_at();

create trigger scenario_exam_codes_set_updated_at
before update on public.scenario_exam_codes
for each row execute function public.set_updated_at();

create trigger scenario_exam_code_subjects_set_updated_at
before update on public.scenario_exam_code_subjects
for each row execute function public.set_updated_at();

create trigger scenario_exam_sessions_set_updated_at
before update on public.scenario_exam_sessions
for each row execute function public.set_updated_at();

create trigger scenario_exam_session_items_set_updated_at
before update on public.scenario_exam_session_items
for each row execute function public.set_updated_at();

revoke all on table public.scenario_exams from public;
revoke all on table public.scenario_exam_codes from public;
revoke all on table public.scenario_exam_code_subjects from public;
revoke all on table public.scenario_exam_sessions from public;
revoke all on table public.scenario_exam_session_items from public;
revoke all on table public.scenario_exam_audit_events from public;

comment on table public.scenario_exam_codes is
  'One-time candidate codes; plaintext codes are never stored.';

comment on table public.scenario_exam_session_items is
  'Immutable scenario snapshot selected when a candidate starts a module.';
