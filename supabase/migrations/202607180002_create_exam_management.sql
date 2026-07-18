-- Official examination management, paper composition, candidate assignment,
-- and server-gated attempt progression.

create table public.exam_modules (
  code text primary key,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  check (code = lower(btrim(code)) and code ~ '^[a-z0-9][a-z0-9-]{1,31}$')
);

create table public.exam_subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (code = upper(btrim(code)) and char_length(code) between 2 and 32),
  check (char_length(btrim(name)) between 2 and 120),
  check (description is null or char_length(btrim(description)) <= 500)
);

create table public.exam_subject_modules (
  subject_id uuid not null references public.exam_subjects(id) on delete cascade,
  module_code text not null references public.exam_modules(code) on delete restrict,
  module_name text not null check (char_length(btrim(module_name)) between 2 and 80),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (subject_id, module_code)
);

-- This catalog supplies a real composite FK for the otherwise polymorphic
-- module + scenario_id reference. Source-table triggers keep it synchronized.
create table public.exam_scenario_catalog (
  module_code text not null references public.exam_modules(code) on delete restrict,
  scenario_id text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (module_code, scenario_id),
  check (char_length(btrim(scenario_id)) between 1 and 200),
  check (char_length(btrim(title)) between 1 and 300)
);

create table public.exam_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(name)) between 3 and 200),
  check (description is null or char_length(btrim(description)) <= 1000)
);

create table public.exam_set_subjects (
  id uuid primary key default gen_random_uuid(),
  exam_set_id uuid not null references public.exam_sets(id) on delete cascade,
  subject_id uuid not null references public.exam_subjects(id) on delete restrict,
  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default now(),
  unique (exam_set_id, subject_id),
  unique (exam_set_id, position),
  unique (id, exam_set_id, subject_id)
);

create table public.exam_papers (
  id uuid primary key default gen_random_uuid(),
  exam_set_subject_id uuid not null,
  exam_set_id uuid not null,
  subject_id uuid not null references public.exam_subjects(id) on delete restrict,
  paper_number integer not null check (paper_number > 0),
  title text not null,
  is_saved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (exam_set_subject_id, exam_set_id, subject_id)
    references public.exam_set_subjects(id, exam_set_id, subject_id) on delete cascade,
  unique (exam_set_subject_id, paper_number),
  unique (id, exam_set_id, subject_id),
  check (char_length(btrim(title)) between 1 and 200)
);

create table public.exam_paper_scenarios (
  id uuid primary key default gen_random_uuid(),
  exam_paper_id uuid not null,
  exam_set_id uuid not null,
  subject_id uuid not null references public.exam_subjects(id) on delete restrict,
  module_code text not null,
  scenario_id text not null,
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  foreign key (exam_paper_id, exam_set_id, subject_id)
    references public.exam_papers(id, exam_set_id, subject_id) on delete cascade,
  foreign key (subject_id, module_code)
    references public.exam_subject_modules(subject_id, module_code) on delete restrict,
  foreign key (module_code, scenario_id)
    references public.exam_scenario_catalog(module_code, scenario_id) on update cascade on delete restrict,
  unique (exam_paper_id, position),
  unique (exam_paper_id, module_code, scenario_id),
  unique (id, exam_paper_id, module_code, scenario_id)
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  exam_date date not null,
  location text not null check (location in ('ha_noi', 'da_nang', 'tp_hcm')),
  decision_basis text not null,
  exam_set_id uuid not null references public.exam_sets(id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'locked', 'archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, exam_set_id),
  check (char_length(btrim(name)) between 3 and 200),
  check (char_length(btrim(decision_basis)) between 3 and 500)
);

create table public.exam_examiners (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null,
  exam_set_id uuid not null,
  subject_id uuid not null references public.exam_subjects(id) on delete restrict,
  full_name text not null,
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (exam_id, exam_set_id)
    references public.exams(id, exam_set_id) on delete cascade,
  foreign key (exam_set_id, subject_id)
    references public.exam_set_subjects(exam_set_id, subject_id) on delete restrict,
  unique (exam_id, position),
  check (char_length(btrim(full_name)) between 2 and 160)
);

create table public.exam_candidates (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null,
  exam_set_id uuid not null,
  full_name text not null,
  work_unit text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (exam_id, exam_set_id)
    references public.exams(id, exam_set_id) on delete cascade,
  unique (exam_id, email),
  unique (id, exam_id, exam_set_id),
  check (char_length(btrim(full_name)) between 2 and 160),
  check (char_length(btrim(work_unit)) between 2 and 200),
  check (email = lower(btrim(email))),
  check (email ~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@attech[.]com[.]vn$')
);

create table public.exam_candidate_subjects (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  exam_id uuid not null references public.exams(id) on delete cascade,
  exam_set_id uuid not null,
  subject_id uuid not null references public.exam_subjects(id) on delete restrict,
  exam_paper_id uuid not null,
  official_score numeric(5,2) check (official_score is null or (official_score >= 0 and official_score <= 100)),
  examiner_comment text,
  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'submitted', 'reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (candidate_id, exam_id, exam_set_id)
    references public.exam_candidates(id, exam_id, exam_set_id) on delete cascade,
  foreign key (exam_paper_id, exam_set_id, subject_id)
    references public.exam_papers(id, exam_set_id, subject_id) on delete restrict,
  unique (candidate_id, subject_id),
  unique (id, exam_paper_id),
  check (examiner_comment is null or char_length(btrim(examiner_comment)) <= 4000)
);

create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_subject_id uuid not null,
  exam_paper_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (candidate_subject_id, exam_paper_id)
    references public.exam_candidate_subjects(id, exam_paper_id) on delete restrict,
  unique (candidate_subject_id),
  unique (id, exam_paper_id),
  check (
    (status = 'in_progress' and submitted_at is null)
    or (status = 'submitted' and submitted_at is not null)
  )
);

create table public.exam_attempt_items (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null,
  exam_paper_id uuid not null,
  paper_scenario_id uuid not null,
  module_code text not null,
  scenario_id text not null,
  position integer not null check (position > 0),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'submitted')),
  started_at timestamptz,
  submitted_at timestamptz,
  submission_ref text,
  result_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (attempt_id, exam_paper_id)
    references public.exam_attempts(id, exam_paper_id) on delete restrict,
  foreign key (paper_scenario_id, exam_paper_id, module_code, scenario_id)
    references public.exam_paper_scenarios(id, exam_paper_id, module_code, scenario_id) on delete restrict,
  foreign key (module_code, scenario_id)
    references public.exam_scenario_catalog(module_code, scenario_id) on update cascade on delete restrict,
  unique (attempt_id, paper_scenario_id),
  unique (attempt_id, position),
  check (submission_ref is null or char_length(btrim(submission_ref)) between 1 and 500),
  check (result_json is null or jsonb_typeof(result_json) = 'object'),
  check (
    (status = 'pending' and started_at is null and submitted_at is null)
    or (status = 'in_progress' and started_at is not null and submitted_at is null)
    or (status = 'submitted' and started_at is not null and submitted_at is not null)
  )
);

create index exam_subjects_active_order_idx on public.exam_subjects (is_active, sort_order, name);
create index exam_subject_modules_order_idx on public.exam_subject_modules (subject_id, sort_order);
create index exam_scenario_catalog_title_idx on public.exam_scenario_catalog (module_code, title);
create index exam_sets_status_updated_idx on public.exam_sets (status, updated_at desc);
create index exam_set_subjects_set_idx on public.exam_set_subjects (exam_set_id, position);
create index exam_papers_set_subject_idx on public.exam_papers (exam_set_id, subject_id, paper_number);
create index exam_paper_scenarios_paper_idx on public.exam_paper_scenarios (exam_paper_id, position);
create index exams_status_date_idx on public.exams (status, exam_date desc);
create index exams_set_idx on public.exams (exam_set_id);
create index exam_examiners_exam_idx on public.exam_examiners (exam_id, position);
create index exam_candidates_exam_name_idx on public.exam_candidates (exam_id, full_name);
create index exam_candidates_email_idx on public.exam_candidates (lower(email), exam_id);
create index exam_candidate_subjects_exam_idx on public.exam_candidate_subjects (exam_id, candidate_id);
create index exam_candidate_subjects_paper_idx on public.exam_candidate_subjects (exam_paper_id);
create index exam_attempts_user_idx on public.exam_attempts (user_id, started_at desc);
create index exam_attempt_items_attempt_idx on public.exam_attempt_items (attempt_id, position);
create unique index exam_attempt_items_one_in_progress_idx
  on public.exam_attempt_items (attempt_id)
  where status = 'in_progress';

create or replace function public.set_exam_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger exam_subjects_set_updated_at before update on public.exam_subjects
  for each row execute function public.set_exam_updated_at();
create trigger exam_scenario_catalog_set_updated_at before update on public.exam_scenario_catalog
  for each row execute function public.set_exam_updated_at();
create trigger exam_sets_set_updated_at before update on public.exam_sets
  for each row execute function public.set_exam_updated_at();
create trigger exam_papers_set_updated_at before update on public.exam_papers
  for each row execute function public.set_exam_updated_at();
create trigger exams_set_updated_at before update on public.exams
  for each row execute function public.set_exam_updated_at();
create trigger exam_examiners_set_updated_at before update on public.exam_examiners
  for each row execute function public.set_exam_updated_at();
create trigger exam_candidates_set_updated_at before update on public.exam_candidates
  for each row execute function public.set_exam_updated_at();
create trigger exam_candidate_subjects_set_updated_at before update on public.exam_candidate_subjects
  for each row execute function public.set_exam_updated_at();
create trigger exam_attempts_set_updated_at before update on public.exam_attempts
  for each row execute function public.set_exam_updated_at();
create trigger exam_attempt_items_set_updated_at before update on public.exam_attempt_items
  for each row execute function public.set_exam_updated_at();

create or replace function public.guard_exam_state()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_set_status text;
begin
  if tg_op = 'UPDATE' and old.status = 'archived' then
    raise exception 'Kỳ thi đã lưu trữ là hồ sơ chỉ đọc.' using errcode = '23503';
  end if;

  select status into target_set_status
  from public.exam_sets
  where id = new.exam_set_id
  for update;
  if not found or target_set_status is distinct from 'ready' then
    raise exception 'Kỳ thi chỉ có thể sử dụng bộ đề đã hoàn thiện.' using errcode = '23503';
  end if;

  if tg_op = 'UPDATE'
     and new.status = 'archived'
     and old.status <> 'archived'
     and exists (
       select 1
       from public.exam_attempts attempt
       join public.exam_candidate_subjects cs on cs.id = attempt.candidate_subject_id
       where cs.exam_id = old.id and attempt.status = 'in_progress'
     ) then
    raise exception 'Kỳ thi còn lượt đang thực hiện; hãy khóa thay vì lưu trữ.' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger guard_exam_state
  before insert or update on public.exams
  for each row execute function public.guard_exam_state();

create or replace function public.guard_archived_exam_roster()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_exam_id uuid;
  previous_exam_id uuid;
begin
  target_exam_id := case when tg_op = 'DELETE' then old.exam_id else new.exam_id end;
  previous_exam_id := case when tg_op = 'UPDATE' then old.exam_id else target_exam_id end;
  if exists (
    select 1 from public.exams e
    where e.id in (target_exam_id, previous_exam_id) and e.status = 'archived'
  ) then
    raise exception 'Danh sách của kỳ thi đã lưu trữ là hồ sơ chỉ đọc.' using errcode = '23503';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger guard_archived_exam_examiners
  before insert or update or delete on public.exam_examiners
  for each row execute function public.guard_archived_exam_roster();
create trigger guard_archived_exam_candidates
  before insert or update or delete on public.exam_candidates
  for each row execute function public.guard_archived_exam_roster();

create or replace function public.guard_archived_candidate_subject()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_exam_id uuid;
  previous_exam_id uuid;
begin
  target_exam_id := case when tg_op = 'DELETE' then old.exam_id else new.exam_id end;
  previous_exam_id := case when tg_op = 'UPDATE' then old.exam_id else target_exam_id end;
  if exists (
    select 1 from public.exams e
    where e.id in (target_exam_id, previous_exam_id) and e.status = 'archived'
  ) then
    if tg_op = 'UPDATE'
       and public.current_app_role() = 'admin'
       and new.id = old.id
       and new.candidate_id = old.candidate_id
       and new.exam_id = old.exam_id
       and new.exam_set_id = old.exam_set_id
       and new.subject_id = old.subject_id
       and new.exam_paper_id = old.exam_paper_id
       and new.created_at = old.created_at
       and new.status = 'reviewed'
       and new.official_score is not null
       and exists (
         select 1 from public.exam_attempts attempt
         where attempt.candidate_subject_id = old.id and attempt.status = 'submitted'
       ) then
      return new;
    end if;
    raise exception 'Phân môn của kỳ thi đã lưu trữ là hồ sơ chỉ đọc.' using errcode = '23503';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger guard_archived_candidate_subject
  before insert or update or delete on public.exam_candidate_subjects
  for each row execute function public.guard_archived_candidate_subject();

create or replace function public.validate_ready_exam_set()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'ready' and (
    not exists (select 1 from public.exam_set_subjects s where s.exam_set_id = new.id)
    or exists (
      select 1 from public.exam_set_subjects s
      where s.exam_set_id = new.id
        and not exists (select 1 from public.exam_papers p where p.exam_set_subject_id = s.id)
    )
    or exists (
      select 1 from public.exam_papers p
      where p.exam_set_id = new.id
        and (not p.is_saved or not exists (
          select 1 from public.exam_paper_scenarios ps where ps.exam_paper_id = p.id
        ))
    )
  ) then
    raise exception 'Bộ đề chỉ có thể sẵn sàng khi mọi môn, đề và kịch bản đã hoàn thiện.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and exists (
       select 1 from public.exams e
       where e.exam_set_id = old.id and e.status <> 'archived'
     ) then
    raise exception 'Không thể đổi trạng thái bộ đề đang được kỳ thi sử dụng.' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger validate_ready_exam_set
  before insert or update on public.exam_sets
  for each row execute function public.validate_ready_exam_set();

insert into public.exam_modules (code, name, sort_order)
values
  ('vor', 'VOR', 10),
  ('dme', 'DME', 20),
  ('ads-b', 'ADS-B', 30);

insert into public.exam_subjects (id, code, name, description, sort_order)
values
  ('10000000-0000-4000-8000-000000000001', 'VOR-DME', 'VOR-DME', 'Môn thi kết hợp kịch bản VOR và DME.', 10),
  ('10000000-0000-4000-8000-000000000002', 'ADS-B', 'ADS-B', 'Môn thi giám sát ADS-B.', 20);

insert into public.exam_subject_modules (subject_id, module_code, module_name, sort_order)
values
  ('10000000-0000-4000-8000-000000000001', 'vor', 'VOR', 10),
  ('10000000-0000-4000-8000-000000000001', 'dme', 'DME', 20),
  ('10000000-0000-4000-8000-000000000002', 'ads-b', 'ADS-B', 10);

insert into public.exam_scenario_catalog (module_code, scenario_id, title)
select 'vor', id, title from public.vor_scenarios
union all
select 'dme', id, title from public.dme_scenarios
union all
select 'ads-b', id, title from public.scenarios;

create or replace function public.sync_exam_scenario_catalog()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_module text := tg_argv[0];
begin
  if tg_op = 'DELETE' then
    delete from public.exam_scenario_catalog
    where module_code = source_module and scenario_id = old.id;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.id is distinct from new.id then
    delete from public.exam_scenario_catalog
    where module_code = source_module and scenario_id = old.id;
  end if;

  insert into public.exam_scenario_catalog (module_code, scenario_id, title)
  values (source_module, new.id, new.title)
  on conflict (module_code, scenario_id) do update
    set title = excluded.title, updated_at = now();
  return new;
end;
$$;

create trigger sync_vor_exam_scenario_catalog
  after insert or update or delete on public.vor_scenarios
  for each row execute function public.sync_exam_scenario_catalog('vor');
create trigger sync_dme_exam_scenario_catalog
  after insert or update or delete on public.dme_scenarios
  for each row execute function public.sync_exam_scenario_catalog('dme');
create trigger sync_adsb_exam_scenario_catalog
  after insert or update or delete on public.scenarios
  for each row execute function public.sync_exam_scenario_catalog('ads-b');

-- The simulator reads the existing module tables by scenario_id. Once any
-- official exam references a set, freeze that source row so prompts, expected
-- actions, overrides, and hardware grading data cannot drift mid-exam.
create or replace function public.guard_used_exam_source_scenario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_module text := tg_argv[0];
begin
  if exists (
    select 1
    from public.exam_paper_scenarios paper_scenario
    join public.exams exam on exam.exam_set_id = paper_scenario.exam_set_id
    where paper_scenario.module_code = source_module
      and paper_scenario.scenario_id = old.id
  ) then
    raise exception 'Kịch bản đang thuộc bộ đề đã áp dụng và không thể sửa hoặc xóa.' using errcode = '23503';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger guard_used_vor_exam_source
  before update or delete on public.vor_scenarios
  for each row execute function public.guard_used_exam_source_scenario('vor');
create trigger guard_used_dme_exam_source
  before update or delete on public.dme_scenarios
  for each row execute function public.guard_used_exam_source_scenario('dme');
create trigger guard_used_adsb_exam_source
  before update or delete on public.scenarios
  for each row execute function public.guard_used_exam_source_scenario('ads-b');

-- Once a set is referenced, its subject/paper/scenario composition is immutable.
create or replace function public.guard_used_exam_set_content()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_set_id uuid;
  previous_set_id uuid;
begin
  target_set_id := case
    when tg_op = 'DELETE' then old.exam_set_id
    else new.exam_set_id
  end;
  previous_set_id := case when tg_op = 'UPDATE' then old.exam_set_id else target_set_id end;

  perform 1
  from public.exam_sets
  where id in (target_set_id, previous_set_id)
  order by id
  for update;
  if exists (
    select 1 from public.exams
    where exam_set_id in (target_set_id, previous_set_id)
  ) then
    raise exception 'Bộ đề đã được áp dụng nên không thể thay đổi nội dung.' using errcode = '23503';
  end if;
  if exists (
    select 1 from public.exam_sets
    where id in (target_set_id, previous_set_id) and status <> 'draft'
  ) then
    raise exception 'Chỉ có thể thay đổi nội dung khi bộ đề ở trạng thái bản nháp.' using errcode = '23503';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger guard_used_exam_set_subjects
  before insert or update or delete on public.exam_set_subjects
  for each row execute function public.guard_used_exam_set_content();
create trigger guard_used_exam_papers
  before insert or update or delete on public.exam_papers
  for each row execute function public.guard_used_exam_set_content();
create trigger guard_used_exam_paper_scenarios
  before insert or update or delete on public.exam_paper_scenarios
  for each row execute function public.guard_used_exam_set_content();

-- A physical delete remains possible only before any candidate has started.
create or replace function public.guard_exam_with_attempts_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.exam_attempts a
    join public.exam_candidate_subjects cs on cs.id = a.candidate_subject_id
    where cs.exam_id = old.id
  ) then
    raise exception 'Kỳ thi đã phát sinh lượt thi và chỉ có thể lưu trữ.' using errcode = '23503';
  end if;
  return old;
end;
$$;

create trigger guard_exam_delete
  before delete on public.exams
  for each row execute function public.guard_exam_with_attempts_delete();

-- Student-facing attempt tables are mutable only through the validated RPCs
-- below. Admin direct mutations remain available for incident recovery.
create or replace function public.guard_exam_attempt_direct_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Dữ liệu lượt thi là hồ sơ kiểm tra và không thể xóa.' using errcode = '42501';
  end if;
  if public.current_app_role() is distinct from 'admin'
     and coalesce(current_setting('app.exam_attempt_rpc', true), '') <> 'on' then
    raise exception 'Lượt thi chỉ được cập nhật qua quy trình thi chính thức.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_exam_attempt_direct_write
  before insert or update or delete on public.exam_attempts
  for each row execute function public.guard_exam_attempt_direct_write();
create trigger guard_exam_attempt_item_direct_write
  before insert or update or delete on public.exam_attempt_items
  for each row execute function public.guard_exam_attempt_direct_write();

-- Even security-definer attempt RPCs may never alter an official score or
-- examiner comment. Those fields are reserved for an authenticated admin.
create or replace function public.protect_official_exam_result()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.official_score is distinct from old.official_score
     or new.examiner_comment is distinct from old.examiner_comment then
    if public.current_app_role() is distinct from 'admin' then
      raise exception 'Chỉ quản trị viên được nhập điểm và nhận xét chính thức.' using errcode = '42501';
    end if;
    if new.official_score is null
       or new.status <> 'reviewed'
       or not exists (
         select 1 from public.exam_attempts attempt
         where attempt.candidate_subject_id = old.id and attempt.status = 'submitted'
       ) then
      raise exception 'Chỉ có thể lưu điểm chính thức sau khi thí sinh đã nộp môn thi.' using errcode = '23503';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_official_exam_result
  before update on public.exam_candidate_subjects
  for each row execute function public.protect_official_exam_result();

create or replace function public.enforce_candidate_subject_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status and not (
    (old.status = 'assigned' and new.status = 'in_progress')
    or (old.status = 'in_progress' and new.status = 'submitted')
    or (old.status = 'submitted' and new.status = 'reviewed')
  ) then
    raise exception 'Trạng thái môn thi phải đi theo thứ tự phân công, đang thi, đã nộp và đã chấm.' using errcode = '23514';
  end if;
  if new.status is distinct from old.status
     and new.status = 'in_progress'
     and not exists (
       select 1 from public.exam_attempts attempt
       where attempt.candidate_subject_id = old.id and attempt.status = 'in_progress'
     ) then
    raise exception 'Môn thi chỉ chuyển sang đang thi khi đã tạo lượt thi.' using errcode = '23503';
  end if;
  if new.status is distinct from old.status
     and new.status = 'submitted'
     and not exists (
       select 1 from public.exam_attempts attempt
       where attempt.candidate_subject_id = old.id and attempt.status = 'submitted'
     ) then
    raise exception 'Môn thi chỉ chuyển sang đã nộp khi lượt thi đã hoàn tất.' using errcode = '23503';
  end if;
  if new.status is distinct from old.status
     and new.status = 'reviewed'
     and (
       new.official_score is null
       or not exists (
         select 1 from public.exam_attempts attempt
         where attempt.candidate_subject_id = old.id and attempt.status = 'submitted'
       )
     ) then
    raise exception 'Môn thi chỉ chuyển sang đã chấm khi có lượt nộp và điểm chính thức.' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger enforce_candidate_subject_status_transition
  before update on public.exam_candidate_subjects
  for each row execute function public.enforce_candidate_subject_status_transition();

create or replace function public.protect_started_candidate_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.exam_id is distinct from old.exam_id
     or new.exam_set_id is distinct from old.exam_set_id then
    raise exception 'Không thể chuyển thí sinh sang kỳ thi hoặc bộ đề khác.' using errcode = '23503';
  end if;
  if new.email is distinct from old.email and exists (
    select 1
    from public.exam_candidate_subjects cs
    join public.exam_attempts a on a.candidate_subject_id = cs.id
    where cs.candidate_id = old.id
  ) then
    raise exception 'Không thể đổi email sau khi thí sinh đã bắt đầu thi.' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger protect_started_candidate_identity
  before update on public.exam_candidates
  for each row execute function public.protect_started_candidate_identity();

create or replace function public.protect_started_candidate_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from public.exam_attempts a where a.candidate_subject_id = old.id)
     and (
       new.candidate_id is distinct from old.candidate_id
       or new.exam_id is distinct from old.exam_id
       or new.exam_set_id is distinct from old.exam_set_id
       or new.subject_id is distinct from old.subject_id
       or new.exam_paper_id is distinct from old.exam_paper_id
     ) then
    raise exception 'Không thể đổi phân môn hoặc đề sau khi thí sinh đã bắt đầu thi.' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger protect_started_candidate_assignment
  before update on public.exam_candidate_subjects
  for each row execute function public.protect_started_candidate_assignment();

create or replace function public.current_auth_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(
    nullif(auth.jwt()->>'email', ''),
    (select email from public.profiles where id = auth.uid())
  ));
$$;

create or replace function public.current_user_owns_exam_candidate(p_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exam_candidates c
    where c.id = p_candidate_id
      and lower(c.email) = public.current_auth_email()
  );
$$;

create or replace function public.current_user_owns_candidate_subject(p_candidate_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exam_candidate_subjects cs
    join public.exam_candidates c on c.id = cs.candidate_id
    where cs.id = p_candidate_subject_id
      and lower(c.email) = public.current_auth_email()
  );
$$;

create or replace function public.current_user_owns_exam_attempt(p_attempt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exam_attempts a
    join public.exam_candidate_subjects cs on cs.id = a.candidate_subject_id
    join public.exam_candidates c on c.id = cs.candidate_id
    where a.id = p_attempt_id
      and a.user_id = auth.uid()
      and lower(c.email) = public.current_auth_email()
  );
$$;

create or replace function public.current_user_can_access_exam(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin'
    or exists (select 1 from public.exams e where e.id = p_exam_id and e.status = 'open')
    or exists (
      select 1
      from public.exam_candidates c
      join public.exam_candidate_subjects cs on cs.candidate_id = c.id
      join public.exam_attempts a on a.candidate_subject_id = cs.id
      where c.exam_id = p_exam_id
        and lower(c.email) = public.current_auth_email()
        and a.user_id = auth.uid()
        and a.status in ('in_progress', 'submitted')
    );
$$;

create or replace function public.current_user_can_access_exam_set(p_exam_set_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin' or exists (
    select 1
    from public.exam_candidate_subjects cs
    join public.exam_candidates c on c.id = cs.candidate_id
    join public.exams e on e.id = cs.exam_id
    left join public.exam_attempts a on a.candidate_subject_id = cs.id
    where cs.exam_set_id = p_exam_set_id
      and lower(c.email) = public.current_auth_email()
      and (e.status = 'open' or (a.user_id = auth.uid() and a.status in ('in_progress', 'submitted')))
  );
$$;

create or replace function public.current_user_can_access_exam_paper(p_exam_paper_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin' or exists (
    select 1
    from public.exam_candidate_subjects cs
    join public.exam_candidates c on c.id = cs.candidate_id
    join public.exams e on e.id = cs.exam_id
    left join public.exam_attempts a on a.candidate_subject_id = cs.id
    where cs.exam_paper_id = p_exam_paper_id
      and lower(c.email) = public.current_auth_email()
      and (e.status = 'open' or (a.user_id = auth.uid() and a.status in ('in_progress', 'submitted')))
  );
$$;

create or replace function public.current_user_can_start_candidate_subject(p_candidate_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exam_candidate_subjects cs
    join public.exam_candidates c on c.id = cs.candidate_id
    join public.exams e on e.id = cs.exam_id
    where cs.id = p_candidate_subject_id
      and e.status = 'open'
      and lower(c.email) = public.current_auth_email()
  );
$$;

revoke all on function public.current_auth_email() from public;
revoke all on function public.current_user_owns_exam_candidate(uuid) from public;
revoke all on function public.current_user_owns_candidate_subject(uuid) from public;
revoke all on function public.current_user_owns_exam_attempt(uuid) from public;
revoke all on function public.current_user_can_access_exam(uuid) from public;
revoke all on function public.current_user_can_access_exam_set(uuid) from public;
revoke all on function public.current_user_can_access_exam_paper(uuid) from public;
revoke all on function public.current_user_can_start_candidate_subject(uuid) from public;
grant execute on function public.current_auth_email() to authenticated;
grant execute on function public.current_user_owns_exam_candidate(uuid) to authenticated;
grant execute on function public.current_user_owns_candidate_subject(uuid) to authenticated;
grant execute on function public.current_user_owns_exam_attempt(uuid) to authenticated;
grant execute on function public.current_user_can_access_exam(uuid) to authenticated;
grant execute on function public.current_user_can_access_exam_set(uuid) to authenticated;
grant execute on function public.current_user_can_access_exam_paper(uuid) to authenticated;
grant execute on function public.current_user_can_start_candidate_subject(uuid) to authenticated;

create or replace function public.exam_attempt_payload(p_attempt_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id,
    'candidateSubjectId', a.candidate_subject_id,
    'status', a.status,
    'startedAt', a.started_at,
    'submittedAt', a.submitted_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'attemptId', i.attempt_id,
          'paperScenarioId', i.paper_scenario_id,
          'moduleCode', i.module_code,
          'scenarioId', i.scenario_id,
          'scenarioTitle', catalog.title,
          'position', i.position,
          'status', i.status,
          'startedAt', i.started_at,
          'submittedAt', i.submitted_at,
          'submissionRef', i.submission_ref,
          'result', i.result_json
        ) order by i.position
      )
      from public.exam_attempt_items i
      join public.exam_scenario_catalog catalog
        on catalog.module_code = i.module_code and catalog.scenario_id = i.scenario_id
      where i.attempt_id = a.id
    ), '[]'::jsonb)
  )
  from public.exam_attempts a
  where a.id = p_attempt_id;
$$;

revoke all on function public.exam_attempt_payload(uuid) from public, anon, authenticated;

create or replace function public.start_exam_attempt(p_candidate_subject_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_subject public.exam_candidate_subjects%rowtype;
  target_exam_id uuid;
  candidate_email text;
  exam_status text;
  candidate_status text;
  exam_set_status text;
  paper_is_saved boolean;
  existing_attempt public.exam_attempts%rowtype;
  new_attempt_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Bạn chưa đăng nhập.' using errcode = '42501';
  end if;
  if public.current_app_role() is distinct from 'student' then
    raise exception 'Chỉ tài khoản thí sinh được bắt đầu lượt thi.' using errcode = '42501';
  end if;

  select exam_id into target_exam_id
  from public.exam_candidate_subjects
  where id = p_candidate_subject_id;
  if not found then
    raise exception 'Bạn không có môn thi được phân công này.' using errcode = '42501';
  end if;

  select status into exam_status
  from public.exams
  where id = target_exam_id
  for update;
  if not found then
    raise exception 'Kỳ thi không còn tồn tại.' using errcode = 'P0002';
  end if;

  select cs.* into candidate_subject
  from public.exam_candidate_subjects cs
  where cs.id = p_candidate_subject_id and cs.exam_id = target_exam_id
  for update;

  if not found then
    raise exception 'Bạn không có môn thi được phân công này.' using errcode = '42501';
  end if;

  select c.email, candidate_subject.status, exam_set.status, paper.is_saved
  into candidate_email, candidate_status, exam_set_status, paper_is_saved
  from public.exam_candidates c
  join public.exam_sets exam_set on exam_set.id = candidate_subject.exam_set_id
  join public.exam_papers paper on paper.id = candidate_subject.exam_paper_id
  where c.id = candidate_subject.candidate_id;

  if not found or lower(candidate_email) is distinct from public.current_auth_email() then
    raise exception 'Bạn không có môn thi được phân công này.' using errcode = '42501';
  end if;

  select * into existing_attempt
  from public.exam_attempts
  where candidate_subject_id = p_candidate_subject_id;

  if found then
    if existing_attempt.user_id <> auth.uid() then
      raise exception 'Lượt thi thuộc tài khoản khác.' using errcode = '42501';
    end if;
    return public.exam_attempt_payload(existing_attempt.id);
  end if;

  if exam_status <> 'open' then
    raise exception 'Kỳ thi hiện không mở lượt thi mới.' using errcode = 'P0001';
  end if;
  if candidate_status not in ('assigned', 'in_progress') then
    raise exception 'Môn thi không ở trạng thái cho phép bắt đầu.' using errcode = 'P0001';
  end if;
  if exam_set_status <> 'ready' or not paper_is_saved then
    raise exception 'Bộ đề chưa sẵn sàng để tổ chức thi.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.exam_paper_scenarios
    where exam_paper_id = candidate_subject.exam_paper_id
  ) then
    raise exception 'Đề thi chưa có kịch bản.' using errcode = '23514';
  end if;

  perform set_config('app.exam_attempt_rpc', 'on', true);
  insert into public.exam_attempts (candidate_subject_id, exam_paper_id, user_id)
  values (candidate_subject.id, candidate_subject.exam_paper_id, auth.uid())
  returning id into new_attempt_id;

  insert into public.exam_attempt_items (
    attempt_id, exam_paper_id, paper_scenario_id, module_code, scenario_id,
    position, status, started_at
  )
  select
    new_attempt_id,
    scenario.exam_paper_id,
    scenario.id,
    scenario.module_code,
    scenario.scenario_id,
    scenario.position,
    case when scenario.position = first_value(scenario.position) over (order by scenario.position)
      then 'in_progress' else 'pending' end,
    case when scenario.position = first_value(scenario.position) over (order by scenario.position)
      then now() else null end
  from public.exam_paper_scenarios scenario
  where scenario.exam_paper_id = candidate_subject.exam_paper_id
  order by scenario.position;

  update public.exam_candidate_subjects
  set status = 'in_progress'
  where id = candidate_subject.id and status = 'assigned';

  return public.exam_attempt_payload(new_attempt_id);
end;
$$;

create or replace function public.complete_exam_attempt_item(
  p_attempt_item_id uuid,
  p_submission_ref text default null,
  p_result_json jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.exam_attempt_items%rowtype;
  attempt public.exam_attempts%rowtype;
  candidate_email text;
  exam_status text;
  next_item_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Bạn chưa đăng nhập.' using errcode = '42501';
  end if;
  if public.current_app_role() is distinct from 'student' then
    raise exception 'Chỉ tài khoản thí sinh được nộp kịch bản thi.' using errcode = '42501';
  end if;

  select i.* into item
  from public.exam_attempt_items i
  where i.id = p_attempt_item_id
  for update;

  if not found then
    raise exception 'Bạn không có quyền nộp kịch bản này.' using errcode = '42501';
  end if;

  select a.* into attempt
  from public.exam_attempts a
  where a.id = item.attempt_id
  for update;

  if not found then
    raise exception 'Lượt thi không còn tồn tại.' using errcode = 'P0002';
  end if;

  select c.email, e.status
  into candidate_email, exam_status
  from public.exam_candidate_subjects cs
  join public.exam_candidates c on c.id = cs.candidate_id
  join public.exams e on e.id = cs.exam_id
  where cs.id = attempt.candidate_subject_id;

  if not found or attempt.user_id <> auth.uid()
     or lower(candidate_email) is distinct from public.current_auth_email() then
    raise exception 'Bạn không có quyền nộp kịch bản này.' using errcode = '42501';
  end if;
  if item.status = 'submitted' then
    return public.exam_attempt_payload(attempt.id);
  end if;
  if attempt.status <> 'in_progress' then
    raise exception 'Môn thi đã được hoàn tất.' using errcode = 'P0001';
  end if;
  if exam_status not in ('open', 'locked') then
    raise exception 'Kỳ thi đã được lưu trữ.' using errcode = 'P0001';
  end if;
  if p_result_json is null then
    raise exception 'Kết quả kịch bản phải được lưu trước khi hoàn tất.' using errcode = '23514';
  end if;
  if p_result_json is not null and (
    jsonb_typeof(p_result_json) is distinct from 'object'
    or pg_column_size(p_result_json) > 750000
    or p_result_json->>'moduleCode' is distinct from item.module_code
  ) then
    raise exception 'Kết quả kịch bản không hợp lệ hoặc quá lớn.' using errcode = '23514';
  end if;
  if item.module_code in ('vor', 'dme') and (
    jsonb_typeof(p_result_json->'events') is distinct from 'array'
    or jsonb_typeof(p_result_json->'answer') is distinct from 'object'
    or nullif(p_result_json->>'startedAt', '') is null
    or nullif(p_result_json->>'submittedAt', '') is null
  ) then
    raise exception 'Bài thi VOR/DME thiếu nhật ký hoặc câu trả lời.' using errcode = '23514';
  end if;
  if item.module_code = 'ads-b' and (
    jsonb_typeof(p_result_json->'selectedActions') is distinct from 'array'
    or jsonb_typeof(p_result_json->'allActions') is distinct from 'array'
    or jsonb_typeof(p_result_json->'diagnosedComponentIds') is distinct from 'array'
    or jsonb_typeof(p_result_json->'inspectedComponentIds') is distinct from 'array'
  ) then
    raise exception 'Bài thi ADS-B thiếu dữ liệu thao tác hoặc chẩn đoán.' using errcode = '23514';
  end if;
  if item.status <> 'in_progress' then
    raise exception 'Kịch bản này chưa đến lượt thực hiện.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.exam_attempt_items prior
    where prior.attempt_id = attempt.id
      and prior.position < item.position
      and prior.status <> 'submitted'
  ) then
    raise exception 'Hãy hoàn tất các kịch bản trước theo đúng thứ tự.' using errcode = 'P0001';
  end if;

  perform set_config('app.exam_attempt_rpc', 'on', true);
  update public.exam_attempt_items
  set status = 'submitted',
      submitted_at = now(),
      submission_ref = nullif(btrim(p_submission_ref), ''),
      result_json = p_result_json || jsonb_build_object(
        '_examScenarioId', item.scenario_id,
        '_examModuleCode', item.module_code,
        '_recordedAt', now()
      )
  where id = item.id;

  select id into next_item_id
  from public.exam_attempt_items
  where attempt_id = attempt.id and status = 'pending'
  order by position
  limit 1
  for update;

  if next_item_id is not null then
    update public.exam_attempt_items
    set status = 'in_progress', started_at = now()
    where id = next_item_id;
  end if;

  return public.exam_attempt_payload(attempt.id);
end;
$$;

create or replace function public.complete_exam_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt public.exam_attempts%rowtype;
  candidate_email text;
  exam_status text;
begin
  if auth.uid() is null then
    raise exception 'Bạn chưa đăng nhập.' using errcode = '42501';
  end if;
  if public.current_app_role() is distinct from 'student' then
    raise exception 'Chỉ tài khoản thí sinh được hoàn tất môn thi.' using errcode = '42501';
  end if;

  select a.* into attempt
  from public.exam_attempts a
  where a.id = p_attempt_id
  for update;

  if not found then
    raise exception 'Bạn không có quyền hoàn tất môn thi này.' using errcode = '42501';
  end if;

  select c.email, e.status
  into candidate_email, exam_status
  from public.exam_candidate_subjects cs
  join public.exam_candidates c on c.id = cs.candidate_id
  join public.exams e on e.id = cs.exam_id
  where cs.id = attempt.candidate_subject_id;

  if not found or attempt.user_id <> auth.uid()
     or lower(candidate_email) is distinct from public.current_auth_email() then
    raise exception 'Bạn không có quyền hoàn tất môn thi này.' using errcode = '42501';
  end if;
  if attempt.status = 'submitted' then
    return public.exam_attempt_payload(attempt.id);
  end if;
  if exam_status not in ('open', 'locked') then
    raise exception 'Kỳ thi đã được lưu trữ.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.exam_attempt_items where attempt_id = attempt.id)
     or exists (
       select 1 from public.exam_attempt_items
       where attempt_id = attempt.id and status <> 'submitted'
     ) then
    raise exception 'Bạn chưa hoàn tất toàn bộ kịch bản trong đề.' using errcode = 'P0001';
  end if;

  perform set_config('app.exam_attempt_rpc', 'on', true);
  update public.exam_attempts
  set status = 'submitted', submitted_at = now()
  where id = attempt.id;

  update public.exam_candidate_subjects
  set status = 'submitted'
  where id = attempt.candidate_subject_id and status in ('assigned', 'in_progress');

  return public.exam_attempt_payload(attempt.id);
end;
$$;

revoke all on function public.start_exam_attempt(uuid) from public, anon;
revoke all on function public.complete_exam_attempt_item(uuid, text, jsonb) from public, anon;
revoke all on function public.complete_exam_attempt(uuid) from public, anon;
grant execute on function public.start_exam_attempt(uuid) to authenticated;
grant execute on function public.complete_exam_attempt_item(uuid, text, jsonb) to authenticated;
grant execute on function public.complete_exam_attempt(uuid) to authenticated;

alter table public.exam_modules enable row level security;
alter table public.exam_subjects enable row level security;
alter table public.exam_subject_modules enable row level security;
alter table public.exam_scenario_catalog enable row level security;
alter table public.exam_sets enable row level security;
alter table public.exam_set_subjects enable row level security;
alter table public.exam_papers enable row level security;
alter table public.exam_paper_scenarios enable row level security;
alter table public.exams enable row level security;
alter table public.exam_examiners enable row level security;
alter table public.exam_candidates enable row level security;
alter table public.exam_candidate_subjects enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_items enable row level security;

revoke all on table public.exam_modules from anon, authenticated;
revoke all on table public.exam_subjects from anon, authenticated;
revoke all on table public.exam_subject_modules from anon, authenticated;
revoke all on table public.exam_scenario_catalog from anon, authenticated;
revoke all on table public.exam_sets from anon, authenticated;
revoke all on table public.exam_set_subjects from anon, authenticated;
revoke all on table public.exam_papers from anon, authenticated;
revoke all on table public.exam_paper_scenarios from anon, authenticated;
revoke all on table public.exams from anon, authenticated;
revoke all on table public.exam_examiners from anon, authenticated;
revoke all on table public.exam_candidates from anon, authenticated;
revoke all on table public.exam_candidate_subjects from anon, authenticated;
revoke all on table public.exam_attempts from anon, authenticated;
revoke all on table public.exam_attempt_items from anon, authenticated;

grant select, insert, update, delete on table public.exam_modules to authenticated;
grant select, insert, update, delete on table public.exam_subjects to authenticated;
grant select, insert, update, delete on table public.exam_subject_modules to authenticated;
grant select on table public.exam_scenario_catalog to authenticated;
grant select, insert, update, delete on table public.exam_sets to authenticated;
grant select, insert, update, delete on table public.exam_set_subjects to authenticated;
grant select, insert, update, delete on table public.exam_papers to authenticated;
grant select, insert, update, delete on table public.exam_paper_scenarios to authenticated;
grant select, insert, update, delete on table public.exams to authenticated;
grant select, insert, update, delete on table public.exam_examiners to authenticated;
grant select, insert, update, delete on table public.exam_candidates to authenticated;
grant select, insert, update, delete on table public.exam_candidate_subjects to authenticated;
grant select, insert, update, delete on table public.exam_attempts to authenticated;
grant select, insert, update, delete on table public.exam_attempt_items to authenticated;

create policy "authenticated read exam modules"
  on public.exam_modules for select to authenticated using (true);
create policy "admin manage exam modules"
  on public.exam_modules for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "authenticated read exam subjects"
  on public.exam_subjects for select to authenticated
  using (is_active or public.current_app_role() = 'admin');
create policy "admin manage exam subjects"
  on public.exam_subjects for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "authenticated read exam subject modules"
  on public.exam_subject_modules for select to authenticated using (true);
create policy "admin manage exam subject modules"
  on public.exam_subject_modules for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "authenticated read exam scenario catalog"
  on public.exam_scenario_catalog for select to authenticated using (true);

create policy "assigned candidate read exam sets"
  on public.exam_sets for select to authenticated
  using (public.current_user_can_access_exam_set(id));
create policy "admin manage exam sets"
  on public.exam_sets for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "assigned candidate read exam set subjects"
  on public.exam_set_subjects for select to authenticated
  using (public.current_user_can_access_exam_set(exam_set_id));
create policy "admin manage exam set subjects"
  on public.exam_set_subjects for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "assigned candidate read exam papers"
  on public.exam_papers for select to authenticated
  using (public.current_user_can_access_exam_paper(id));
create policy "admin manage exam papers"
  on public.exam_papers for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "assigned candidate read exam paper scenarios"
  on public.exam_paper_scenarios for select to authenticated
  using (public.current_user_can_access_exam_paper(exam_paper_id));
create policy "admin manage exam paper scenarios"
  on public.exam_paper_scenarios for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "authenticated read visible exams"
  on public.exams for select to authenticated
  using (public.current_user_can_access_exam(id));
create policy "admin manage exams"
  on public.exams for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "authenticated read visible examiners"
  on public.exam_examiners for select to authenticated
  using (public.current_user_can_access_exam(exam_id));
create policy "admin manage examiners"
  on public.exam_examiners for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "candidate read own exam row"
  on public.exam_candidates for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or (lower(email) = public.current_auth_email() and public.current_user_can_access_exam(exam_id))
  );
create policy "admin manage candidates"
  on public.exam_candidates for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "candidate read own assigned subjects"
  on public.exam_candidate_subjects for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or (
      public.current_user_owns_candidate_subject(id)
      and (
        public.current_user_can_access_exam(exam_id)
        or exists (
          select 1 from public.exam_attempts a
          where a.candidate_subject_id = id and a.user_id = auth.uid()
        )
      )
    )
  );
create policy "admin manage candidate subjects"
  on public.exam_candidate_subjects for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "candidate read own attempts"
  on public.exam_attempts for select to authenticated
  using (public.current_app_role() = 'admin' or public.current_user_owns_exam_attempt(id));
create policy "candidate insert own open attempt"
  on public.exam_attempts for insert to authenticated
  with check (
    public.current_app_role() = 'admin'
    or (
      user_id = auth.uid()
      and public.current_user_can_start_candidate_subject(candidate_subject_id)
    )
  );
create policy "candidate update own active attempt"
  on public.exam_attempts for update to authenticated
  using (public.current_app_role() = 'admin' or public.current_user_owns_exam_attempt(id))
  with check (public.current_app_role() = 'admin' or public.current_user_owns_exam_attempt(id));
create policy "admin delete attempts"
  on public.exam_attempts for delete to authenticated
  using (public.current_app_role() = 'admin');

create policy "candidate read own attempt items"
  on public.exam_attempt_items for select to authenticated
  using (public.current_app_role() = 'admin' or public.current_user_owns_exam_attempt(attempt_id));
create policy "candidate insert own attempt items"
  on public.exam_attempt_items for insert to authenticated
  with check (public.current_app_role() = 'admin' or public.current_user_owns_exam_attempt(attempt_id));
create policy "candidate update own attempt items"
  on public.exam_attempt_items for update to authenticated
  using (public.current_app_role() = 'admin' or public.current_user_owns_exam_attempt(attempt_id))
  with check (public.current_app_role() = 'admin' or public.current_user_owns_exam_attempt(attempt_id));
create policy "admin delete attempt items"
  on public.exam_attempt_items for delete to authenticated
  using (public.current_app_role() = 'admin');

create or replace function public.save_exam_set(
  p_exam_set_id uuid,
  p_name text,
  p_description text,
  p_subjects jsonb,
  p_finalize boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_set_id uuid;
  saved_subject_id uuid;
  saved_paper_id uuid;
  subject_entry jsonb;
  paper_entry jsonb;
  scenario_entry jsonb;
  subject_position integer := 0;
  target_subject_id uuid;
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'Bạn không có quyền quản lý bộ đề.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) < 3 then
    raise exception 'Tên bộ đề phải có ít nhất 3 ký tự.' using errcode = '23514';
  end if;
  if jsonb_typeof(p_subjects) is distinct from 'array' or jsonb_array_length(p_subjects) = 0 then
    raise exception 'Bộ đề phải có ít nhất một môn thi.' using errcode = '23514';
  end if;

  if p_exam_set_id is null then
    insert into public.exam_sets (name, description, status, created_by)
    values (btrim(p_name), nullif(btrim(p_description), ''), 'draft', auth.uid())
    returning id into saved_set_id;
  else
    perform 1 from public.exam_sets where id = p_exam_set_id for update;
    if not found then
      raise exception 'Không tìm thấy bộ đề.' using errcode = 'P0002';
    end if;
    if exists (select 1 from public.exam_sets where id = p_exam_set_id and status = 'archived') then
      raise exception 'Bộ đề đã lưu trữ nên không thể chỉnh sửa.' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.exams where exam_set_id = p_exam_set_id) then
      raise exception 'Bộ đề đã được áp dụng nên không thể thay đổi nội dung.' using errcode = '23503';
    end if;
    saved_set_id := p_exam_set_id;
    update public.exam_sets
    set name = btrim(p_name), description = nullif(btrim(p_description), ''), status = 'draft'
    where id = saved_set_id;
    delete from public.exam_set_subjects where exam_set_id = saved_set_id;
  end if;

  for subject_entry in select value from jsonb_array_elements(p_subjects)
  loop
    subject_position := subject_position + 1;
    target_subject_id := (subject_entry->>'subjectId')::uuid;
    if not exists (select 1 from public.exam_subjects where id = target_subject_id and is_active) then
      raise exception 'Môn thi không tồn tại hoặc đã ngừng sử dụng.' using errcode = '23503';
    end if;
    if jsonb_typeof(subject_entry->'papers') is distinct from 'array'
       or jsonb_array_length(subject_entry->'papers') = 0 then
      raise exception 'Mỗi môn phải có ít nhất một đề thi.' using errcode = '23514';
    end if;

    insert into public.exam_set_subjects (exam_set_id, subject_id, position)
    values (saved_set_id, target_subject_id, subject_position)
    returning id into saved_subject_id;

    for paper_entry in select value from jsonb_array_elements(subject_entry->'papers')
    loop
      if jsonb_typeof(paper_entry->'scenarios') is distinct from 'array'
         or jsonb_array_length(paper_entry->'scenarios') = 0 then
        raise exception 'Mỗi đề phải có ít nhất một kịch bản.' using errcode = '23514';
      end if;

      saved_paper_id := coalesce(nullif(paper_entry->>'id', '')::uuid, gen_random_uuid());
      insert into public.exam_papers (
        id, exam_set_subject_id, exam_set_id, subject_id, paper_number, title, is_saved
      ) values (
        saved_paper_id,
        saved_subject_id,
        saved_set_id,
        target_subject_id,
        (paper_entry->>'paperNumber')::integer,
        btrim(paper_entry->>'title'),
        true
      );

      for scenario_entry in select value from jsonb_array_elements(paper_entry->'scenarios')
      loop
        insert into public.exam_paper_scenarios (
          exam_paper_id, exam_set_id, subject_id, module_code, scenario_id, position
        ) values (
          saved_paper_id,
          saved_set_id,
          target_subject_id,
          btrim(scenario_entry->>'moduleCode'),
          btrim(scenario_entry->>'scenarioId'),
          (scenario_entry->>'position')::integer
        );
      end loop;
    end loop;
  end loop;

  update public.exam_sets
  set status = case when coalesce(p_finalize, false) then 'ready' else 'draft' end
  where id = saved_set_id;
  return saved_set_id;
end;
$$;

revoke all on function public.save_exam_set(uuid, text, text, jsonb, boolean) from public, anon;
grant execute on function public.save_exam_set(uuid, text, text, jsonb, boolean) to authenticated;

create or replace function public.save_exam_examiners(
  p_exam_id uuid,
  p_examiners jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_exam_set_id uuid;
  examiner_entry jsonb;
  target_subject_id uuid;
  target_position integer;
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'Bạn không có quyền quản lý giám khảo.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_examiners) is distinct from 'array' or jsonb_array_length(p_examiners) > 100 then
    raise exception 'Danh sách giám khảo không hợp lệ.' using errcode = '23514';
  end if;

  select exam_set_id into target_exam_set_id
  from public.exams
  where id = p_exam_id and status <> 'archived'
  for update;
  if not found then
    raise exception 'Không tìm thấy kỳ thi đang hoạt động.' using errcode = 'P0002';
  end if;

  -- Validate the complete replacement before deleting any existing row.
  for examiner_entry in select value from jsonb_array_elements(p_examiners)
  loop
    target_subject_id := (examiner_entry->>'subjectId')::uuid;
    target_position := (examiner_entry->>'position')::integer;
    if char_length(btrim(coalesce(examiner_entry->>'fullName', ''))) < 2
       or target_position < 1
       or not exists (
         select 1 from public.exam_set_subjects s
         where s.exam_set_id = target_exam_set_id and s.subject_id = target_subject_id
       ) then
      raise exception 'Thông tin giám khảo hoặc môn chấm thi không hợp lệ.' using errcode = '23514';
    end if;
  end loop;

  delete from public.exam_examiners where exam_id = p_exam_id;
  insert into public.exam_examiners (
    exam_id, exam_set_id, subject_id, full_name, position
  )
  select
    p_exam_id,
    target_exam_set_id,
    (entry->>'subjectId')::uuid,
    btrim(entry->>'fullName'),
    (entry->>'position')::integer
  from jsonb_array_elements(p_examiners) entry;
end;
$$;

create or replace function public.save_exam_candidate(
  p_candidate_id uuid,
  p_exam_id uuid,
  p_full_name text,
  p_work_unit text,
  p_email text,
  p_subjects jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_candidate_id uuid;
  target_exam_set_id uuid;
  assignment_entry jsonb;
  target_assignment_id uuid;
  target_subject_id uuid;
  target_paper_id uuid;
  saved_assignment_ids uuid[] := array[]::uuid[];
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'Bạn không có quyền quản lý thí sinh.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_full_name, ''))) < 2
     or char_length(btrim(coalesce(p_work_unit, ''))) < 2
     or lower(btrim(coalesce(p_email, ''))) !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@attech[.]com[.]vn$' then
    raise exception 'Thông tin thí sinh không hợp lệ.' using errcode = '23514';
  end if;
  if jsonb_typeof(p_subjects) is distinct from 'array' or jsonb_array_length(p_subjects) = 0 then
    raise exception 'Thí sinh phải được phân ít nhất một môn thi.' using errcode = '23514';
  end if;

  select exam_set_id into target_exam_set_id
  from public.exams
  where id = p_exam_id and status <> 'archived'
  for update;
  if not found then
    raise exception 'Không tìm thấy kỳ thi đang hoạt động.' using errcode = 'P0002';
  end if;

  -- Validate every assignment before changing candidate identity or children.
  for assignment_entry in select value from jsonb_array_elements(p_subjects)
  loop
    target_subject_id := (assignment_entry->>'subjectId')::uuid;
    target_paper_id := (assignment_entry->>'examPaperId')::uuid;
    if not exists (
      select 1 from public.exam_papers paper
      where paper.id = target_paper_id
        and paper.exam_set_id = target_exam_set_id
        and paper.subject_id = target_subject_id
        and paper.is_saved
    ) then
      raise exception 'Đề thi không thuộc môn hoặc bộ đề đã chọn.' using errcode = '23503';
    end if;
  end loop;

  if p_candidate_id is null then
    insert into public.exam_candidates (
      exam_id, exam_set_id, full_name, work_unit, email
    ) values (
      p_exam_id,
      target_exam_set_id,
      btrim(p_full_name),
      btrim(p_work_unit),
      lower(btrim(p_email))
    ) returning id into saved_candidate_id;
  else
    select id into saved_candidate_id
    from public.exam_candidates
    where id = p_candidate_id and exam_id = p_exam_id
    for update;
    if not found then
      raise exception 'Không tìm thấy thí sinh trong kỳ thi.' using errcode = 'P0002';
    end if;
    update public.exam_candidates
    set full_name = btrim(p_full_name),
        work_unit = btrim(p_work_unit),
        email = lower(btrim(p_email))
    where id = saved_candidate_id;
  end if;

  for assignment_entry in select value from jsonb_array_elements(p_subjects)
  loop
    target_assignment_id := nullif(assignment_entry->>'id', '')::uuid;
    target_subject_id := (assignment_entry->>'subjectId')::uuid;
    target_paper_id := (assignment_entry->>'examPaperId')::uuid;
    if target_assignment_id is null then
      insert into public.exam_candidate_subjects (
        candidate_id, exam_id, exam_set_id, subject_id, exam_paper_id
      ) values (
        saved_candidate_id, p_exam_id, target_exam_set_id, target_subject_id, target_paper_id
      ) returning id into target_assignment_id;
    else
      update public.exam_candidate_subjects
      set subject_id = target_subject_id, exam_paper_id = target_paper_id
      where id = target_assignment_id and candidate_id = saved_candidate_id;
      if not found then
        raise exception 'Phân môn không thuộc thí sinh này.' using errcode = '23503';
      end if;
    end if;
    saved_assignment_ids := array_append(saved_assignment_ids, target_assignment_id);
  end loop;

  if exists (
    select 1
    from public.exam_candidate_subjects cs
    join public.exam_attempts attempt on attempt.candidate_subject_id = cs.id
    where cs.candidate_id = saved_candidate_id
      and not (cs.id = any(saved_assignment_ids))
  ) then
    raise exception 'Không thể xóa phân môn đã phát sinh lượt thi.' using errcode = '23503';
  end if;
  delete from public.exam_candidate_subjects
  where candidate_id = saved_candidate_id and not (id = any(saved_assignment_ids));

  return saved_candidate_id;
end;
$$;

create or replace function public.save_candidate_result(
  p_candidate_subject_id uuid,
  p_official_score numeric,
  p_examiner_comment text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_exam_id uuid;
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'Chỉ quản trị viên được nhập kết quả chính thức.' using errcode = '42501';
  end if;
  if p_official_score is null or p_official_score < 0 or p_official_score > 100 then
    raise exception 'Điểm chính thức phải nằm trong khoảng 0-100.' using errcode = '23514';
  end if;

  select cs.exam_id into target_exam_id
  from public.exam_candidate_subjects cs
  join public.exam_attempts attempt on attempt.candidate_subject_id = cs.id
  where cs.id = p_candidate_subject_id
    and attempt.status = 'submitted'
    and cs.status in ('submitted', 'reviewed')
  for update of cs;
  if not found then
    raise exception 'Chỉ có thể nhập điểm sau khi thí sinh đã nộp môn thi.' using errcode = '23503';
  end if;

  update public.exam_candidate_subjects
  set official_score = p_official_score,
      examiner_comment = nullif(btrim(p_examiner_comment), ''),
      status = 'reviewed'
  where id = p_candidate_subject_id;
  return target_exam_id;
end;
$$;

revoke all on function public.save_exam_examiners(uuid, jsonb) from public, anon;
revoke all on function public.save_exam_candidate(uuid, uuid, text, text, text, jsonb) from public, anon;
revoke all on function public.save_candidate_result(uuid, numeric, text) from public, anon;
grant execute on function public.save_exam_examiners(uuid, jsonb) to authenticated;
grant execute on function public.save_exam_candidate(uuid, uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.save_candidate_result(uuid, numeric, text) to authenticated;
