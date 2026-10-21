-- Rubrics are separate from native definitions. Old rows deliberately remain
-- NULL: never infer an historical answer from today's mutable source.
alter table public.simulator_scenario_parameters add column assessment_rubric_json jsonb;
alter table public.simulator_scenario_library_memberships add column assessment_rubric_json jsonb;

create function public.invalidate_changed_scenario_rubric() returns trigger language plpgsql as $$
begin
  if new.definition_json is distinct from old.definition_json
     and new.assessment_rubric_json is not distinct from old.assessment_rubric_json then
    new.assessment_rubric_json := null;
  end if;
  return new;
end $$;
create trigger scenario_rubric_invalidate before update on public.simulator_scenario_parameters
for each row execute function public.invalidate_changed_scenario_rubric();

create function public.freeze_published_scenario_rubric() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.definition_json is distinct from old.definition_json
       or new.assessment_rubric_json is distinct from old.assessment_rubric_json
       or new.scenario_parameters_id is distinct from old.scenario_parameters_id
       or new.module_id is distinct from old.module_id
       or new.library_kind is distinct from old.library_kind
       or new.scenario_id is distinct from old.scenario_id
       or new.revision_number is distinct from old.revision_number then
      raise exception 'Published scenario snapshot is immutable' using errcode = '23514';
    end if;
  else
    select s.assessment_rubric_json into new.assessment_rubric_json
    from public.simulator_scenario_parameters s
    where s.id = new.scenario_parameters_id and s.module_id = new.module_id
      and s.definition_json = new.definition_json for share;
  end if;
  return new;
end $$;
create trigger scenario_publication_rubric before insert or update on public.simulator_scenario_library_memberships
for each row execute function public.freeze_published_scenario_rubric();

-- Compatibility assignments follow the published revision, not mutable source.
-- Historical assignments are deliberately NULL rather than retroactively filled.
alter table public.simulator_review_scenario_assignments add column library_membership_id uuid references public.simulator_scenario_library_memberships(id) on delete restrict;
alter table public.simulator_review_scenario_assignments add column library_revision_number integer;
alter table public.simulator_review_scenario_assignments add column definition_snapshot_json jsonb;
alter table public.simulator_review_scenario_assignments add column assessment_rubric_snapshot_json jsonb;
create function public.freeze_review_assignment_feedback_input() returns trigger language plpgsql as $$
begin
  if tg_op='INSERT' then
    select m.id,m.revision_number,m.definition_json,m.assessment_rubric_json
      into new.library_membership_id,new.library_revision_number,new.definition_snapshot_json,new.assessment_rubric_snapshot_json
    from public.simulator_scenario_library_memberships m
    where m.scenario_parameters_id=new.scenario_parameters_id and m.module_id=new.module_id
      and m.library_kind='practice' and m.archived_at is null for share;
  elsif new.scenario_parameters_id is distinct from old.scenario_parameters_id or new.module_id is distinct from old.module_id
    or new.library_membership_id is distinct from old.library_membership_id or new.library_revision_number is distinct from old.library_revision_number
    or new.definition_snapshot_json is distinct from old.definition_snapshot_json
    or new.assessment_rubric_snapshot_json is distinct from old.assessment_rubric_snapshot_json then
    raise exception 'Review assignment snapshot is immutable' using errcode='23514';
  end if;
  return new;
end $$;
create trigger review_assignment_feedback_snapshot before insert or update on public.simulator_review_scenario_assignments
for each row execute function public.freeze_review_assignment_feedback_input();

create table public.practice_submissions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete restrict,
  module_id text not null,
  scenario_id text not null,
  library_membership_id uuid not null references public.simulator_scenario_library_memberships(id) on delete restrict,
  library_revision_number integer not null,
  definition_json jsonb not null,
  assessment_rubric_json jsonb,
  payload_json jsonb,
  input_hash text not null,
  idempotency_key text not null,
  submitted_at timestamptz not null default now(),
  unique(actor_id, idempotency_key),
  check (jsonb_typeof(definition_json) = 'object'),
  check (payload_json is null or (jsonb_typeof(payload_json) = 'object' and octet_length(payload_json::text) <= 750000)),
  check (input_hash ~ '^[0-9a-f]{64}$'),
  check (idempotency_key ~ '^[A-Za-z0-9._:-]{1,128}$')
);
create table public.ai_attempt_feedback_jobs (
  id uuid primary key default gen_random_uuid(),
  practice_submission_id uuid references public.practice_submissions(id) on delete cascade,
  exam_item_id uuid references public.scenario_exam_session_items(id) on delete cascade,
  legacy_attempt_item_id uuid references public.exam_attempt_items(id) on delete cascade,
  module_id text not null,
  definition_json jsonb not null,
  assessment_rubric_json jsonb,
  payload_json jsonb,
  snapshot_hash text not null,
  rubric_version integer generated always as (coalesce((assessment_rubric_json->>'version')::integer,0)) stored,
  feedback_version integer not null default 1 check (feedback_version = 1),
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 5),
  attempt_token uuid,
  worker_id text,
  lease_expires_at timestamptz,
  available_at timestamptz not null default now(),
  feedback_json jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (num_nonnulls(practice_submission_id, exam_item_id, legacy_attempt_item_id) = 1),
  check (jsonb_typeof(definition_json) = 'object'),
  check (feedback_json is null or (jsonb_typeof(feedback_json) = 'object' and octet_length(feedback_json::text) <= 250000)),
  unique (practice_submission_id, snapshot_hash, rubric_version, feedback_version),
  unique (exam_item_id, snapshot_hash, rubric_version, feedback_version),
  unique (legacy_attempt_item_id, snapshot_hash, rubric_version, feedback_version),
  unique (practice_submission_id, feedback_version),
  unique (exam_item_id, feedback_version),
  unique (legacy_attempt_item_id, feedback_version)
);
create index ai_feedback_queue on public.ai_attempt_feedback_jobs (available_at, created_at, id) where status in ('queued','running');
revoke all on public.practice_submissions, public.ai_attempt_feedback_jobs from public;

create function public.hash_feedback_snapshot() returns trigger language plpgsql as $$
begin
  new.snapshot_hash := encode(sha256(convert_to(jsonb_build_array(new.module_id,new.definition_json,new.assessment_rubric_json,new.payload_json)::text,'UTF8')),'hex');
  return new;
end $$;
create trigger feedback_snapshot_hash before insert or update on public.ai_attempt_feedback_jobs for each row execute function public.hash_feedback_snapshot();

create function public.enqueue_practice_feedback() returns trigger language plpgsql as $$
begin
  insert into public.ai_attempt_feedback_jobs(practice_submission_id,module_id,definition_json,assessment_rubric_json,payload_json)
  values(new.id,new.module_id,new.definition_json,new.assessment_rubric_json,new.payload_json);
  return new;
end $$;
create trigger practice_feedback_outbox after insert on public.practice_submissions
for each row execute function public.enqueue_practice_feedback();

create function public.guard_feedback_snapshot() returns trigger language plpgsql as $$
begin
  if tg_table_name = 'practice_submissions' then
    raise exception 'Practice submission is immutable' using errcode='23514';
  end if;
  if new.definition_json is distinct from old.definition_json or new.assessment_rubric_json is distinct from old.assessment_rubric_json
     or new.payload_json is distinct from old.payload_json or new.module_id is distinct from old.module_id
     or new.practice_submission_id is distinct from old.practice_submission_id or new.exam_item_id is distinct from old.exam_item_id
     or new.legacy_attempt_item_id is distinct from old.legacy_attempt_item_id or new.feedback_version is distinct from old.feedback_version then
    raise exception 'Feedback input is immutable' using errcode='23514';
  end if;
  return new;
end $$;
create trigger practice_submission_immutable before update on public.practice_submissions for each row execute function public.guard_feedback_snapshot();
create trigger feedback_input_immutable before update on public.ai_attempt_feedback_jobs for each row execute function public.guard_feedback_snapshot();

alter table public.scenario_exam_session_items add column assessment_rubric_snapshot_json jsonb;
create function public.freeze_code_exam_feedback_input() returns trigger language plpgsql as $$
begin
  if tg_op='INSERT' then
    select m.assessment_rubric_json into new.assessment_rubric_snapshot_json
    from public.simulator_scenario_library_memberships m
    where m.id=new.library_membership_id and m.module_id=new.module_id
      and m.revision_number=new.library_revision_number and m.definition_json=new.definition_snapshot_json for share;
  else
    if new.definition_snapshot_json is distinct from old.definition_snapshot_json
       or new.assessment_rubric_snapshot_json is distinct from old.assessment_rubric_snapshot_json
       or new.library_membership_id is distinct from old.library_membership_id
       or new.library_revision_number is distinct from old.library_revision_number
       or new.session_id is distinct from old.session_id or new.module_id is distinct from old.module_id
       or new.scenario_id is distinct from old.scenario_id
       or (old.status in ('submitted','timed_out') and (new.result_json is distinct from old.result_json or new.status is distinct from old.status)) then
      raise exception 'Exam input is immutable' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
create trigger code_exam_feedback_snapshot before insert or update on public.scenario_exam_session_items
for each row execute function public.freeze_code_exam_feedback_input();

create function public.enqueue_code_exam_feedback() returns trigger language plpgsql as $$
begin
  if new.status in ('submitted','timed_out') then
    insert into public.ai_attempt_feedback_jobs(exam_item_id,module_id,definition_json,assessment_rubric_json,payload_json)
    values(new.id,new.module_id,new.definition_snapshot_json,new.assessment_rubric_snapshot_json,new.result_json->'payload')
    on conflict (exam_item_id,feedback_version) do nothing;
  end if;
  return new;
end $$;
-- The outbox is inside every submission/timeout transaction, including direct
-- RPC callers. No application dual-write or polling reconciliation gap.
create trigger code_exam_feedback_outbox after insert or update of status on public.scenario_exam_session_items
for each row execute function public.enqueue_code_exam_feedback();

-- Legacy RPCs use a separate schema; capture the exact legacy definition at
-- begin, never reconstruct an old attempt from today's canonical source.
alter table public.exam_attempt_items add column definition_snapshot_json jsonb;
alter table public.exam_attempt_items add column assessment_rubric_snapshot_json jsonb;
alter table public.exam_attempts add column revoked_at timestamptz;
create function public.freeze_legacy_exam_feedback_input() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.assessment_rubric_snapshot_json := null;
    if new.module_code = 'vor' then
      select to_jsonb(s) into new.definition_snapshot_json from public.vor_scenarios s where s.id=new.scenario_id for share;
    elsif new.module_code = 'dme' then
      select to_jsonb(s) into new.definition_snapshot_json from public.dme_scenarios s where s.id=new.scenario_id for share;
    elsif new.module_code = 'ads-b' then
      select jsonb_strip_nulls(jsonb_build_object('schemaVersion',1,'id',s.id,'name',s.title,'description',s.description,
        'difficulty',case s.difficulty when 'easy' then 'basic' when 'medium' then 'intermediate' when 'hard' then 'advanced' end,
        'sites',s.sites_json::jsonb,'targetSensorId',s.target_sensor_id,'targetLoginUser',s.target_login_user,
        'expectedActions',s.expected_actions_json::jsonb,'hardwareFault',nullif(s.hardware_fault_json,'')::jsonb,
        'eventLog',nullif(s.event_log_json,'')::jsonb)) into new.definition_snapshot_json
      from public.scenarios s where s.id=new.scenario_id for share;
      select s.assessment_rubric_json into new.assessment_rubric_snapshot_json from public.simulator_scenario_parameters s
      where s.module_id='ads-b' and s.scenario_id=new.scenario_id and s.definition_json=new.definition_snapshot_json for share;
    end if;
  elsif new.definition_snapshot_json is distinct from old.definition_snapshot_json
    or new.assessment_rubric_snapshot_json is distinct from old.assessment_rubric_snapshot_json
    or new.attempt_id is distinct from old.attempt_id or new.module_code is distinct from old.module_code
    or new.scenario_id is distinct from old.scenario_id or new.paper_scenario_id is distinct from old.paper_scenario_id
    or (old.status='submitted' and (new.result_json is distinct from old.result_json or new.status is distinct from old.status)) then
    raise exception 'Legacy exam input is immutable' using errcode='23514';
  end if;
  return new;
end $$;
create trigger legacy_exam_feedback_snapshot before insert or update on public.exam_attempt_items
for each row execute function public.freeze_legacy_exam_feedback_input();
create function public.enqueue_legacy_exam_feedback() returns trigger language plpgsql as $$
begin
  if new.status='submitted' then
    insert into public.ai_attempt_feedback_jobs(legacy_attempt_item_id,module_id,definition_json,assessment_rubric_json,payload_json,status,error_code)
    values(new.id,new.module_code,coalesce(new.definition_snapshot_json,'{}'),new.assessment_rubric_snapshot_json,new.result_json,
      case when new.definition_snapshot_json is null then 'failed' else 'queued' end,
      case when new.definition_snapshot_json is null then 'SNAPSHOT_UNAVAILABLE' end)
    on conflict (legacy_attempt_item_id,feedback_version) do nothing;
  end if;
  return new;
end $$;
create trigger legacy_exam_feedback_outbox after insert or update of status on public.exam_attempt_items
for each row execute function public.enqueue_legacy_exam_feedback();
