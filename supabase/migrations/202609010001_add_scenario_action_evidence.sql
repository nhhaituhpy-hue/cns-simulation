alter table public.vor_submissions
  add column if not exists action_history jsonb not null default '[]'::jsonb,
  add column if not exists resolution jsonb;

alter table public.dme_submissions
  add column if not exists action_history jsonb not null default '[]'::jsonb,
  add column if not exists resolution jsonb;

alter table public.vor_submissions
  drop constraint if exists vor_submissions_action_history_array,
  drop constraint if exists vor_submissions_resolution_object;

alter table public.dme_submissions
  drop constraint if exists dme_submissions_action_history_array,
  drop constraint if exists dme_submissions_resolution_object;

alter table public.vor_submissions
  add constraint vor_submissions_action_history_array
  check (jsonb_typeof(action_history) = 'array'),
  add constraint vor_submissions_resolution_object
  check (resolution is null or jsonb_typeof(resolution) = 'object');

alter table public.dme_submissions
  add constraint dme_submissions_action_history_array
  check (jsonb_typeof(action_history) = 'array'),
  add constraint dme_submissions_resolution_object
  check (resolution is null or jsonb_typeof(resolution) = 'object');

comment on column public.vor_submissions.action_history is
  'Append-only technical PMDT actions recorded during the student session.';
comment on column public.vor_submissions.resolution is
  'Technical scenario resolution checks captured at submission time.';
comment on column public.dme_submissions.action_history is
  'Append-only technical PMDT actions recorded during the student session.';
comment on column public.dme_submissions.resolution is
  'Technical scenario resolution checks captured at submission time.';
