-- Auth-independent replacements for Supabase RPCs.
-- The Next.js server must pass p_user_id/p_actor_user_id from a verified database session; browser input is never trusted.
SET check_function_bodies = false;
CREATE OR REPLACE FUNCTION "public"."complete_exam_attempt"("p_user_id" "uuid", "p_attempt_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  attempt public.exam_attempts%rowtype;
  candidate_email text;
  exam_status text;
begin
  if p_user_id is null then
    raise exception 'Bạn chưa đăng nhập.' using errcode = '42501';
  end if;
  if (select u.role from public.users u where u.id = p_user_id) is distinct from 'student' then
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

  if not found or attempt.user_id <> p_user_id
     or lower(candidate_email) is distinct from (select lower(u.email) from public.users u where u.id = p_user_id) then
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

CREATE OR REPLACE FUNCTION "public"."complete_exam_attempt_item"("p_user_id" "uuid", "p_attempt_item_id" "uuid", "p_submission_ref" "text" DEFAULT NULL::"text", "p_result_json" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  item public.exam_attempt_items%rowtype;
  attempt public.exam_attempts%rowtype;
  candidate_email text;
  exam_status text;
  next_item_id uuid;
begin
  if p_user_id is null then
    raise exception 'Bạn chưa đăng nhập.' using errcode = '42501';
  end if;
  if (select u.role from public.users u where u.id = p_user_id) is distinct from 'student' then
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

  if not found or attempt.user_id <> p_user_id
     or lower(candidate_email) is distinct from (select lower(u.email) from public.users u where u.id = p_user_id) then
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

CREATE OR REPLACE FUNCTION "public"."initialize_user_simulator_config"("p_user_id" "uuid", "p_simulator_id" "text", "p_schema_version" integer, "p_default_config" "jsonb") RETURNS "public"."user_simulator_configs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := p_user_id;
  saved_config public.user_simulator_configs;
  inserted_count integer;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if nullif(btrim(p_simulator_id), '') is null then
    raise exception 'SIMULATOR_ID_REQUIRED';
  end if;

  insert into public.user_simulator_configs (
    user_id,
    simulator_id,
    schema_version,
    initial_config,
    applied_config,
    backup_config
  )
  values (
    current_user_id,
    btrim(p_simulator_id),
    p_schema_version,
    p_default_config,
    p_default_config,
    p_default_config
  )
  on conflict (user_id, simulator_id) do nothing;

  get diagnostics inserted_count = row_count;

  select *
  into saved_config
  from public.user_simulator_configs
  where user_id = current_user_id
    and simulator_id = btrim(p_simulator_id);

  if inserted_count = 1 then
    insert into public.user_simulator_config_history (
      user_id,
      simulator_id,
      action,
      previous_config,
      next_config,
      revision
    )
    values (
      saved_config.user_id,
      saved_config.simulator_id,
      'initialize',
      null,
      saved_config.initial_config,
      saved_config.revision
    );
  end if;

  return saved_config;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."save_exam_set"("p_actor_user_id" "uuid", "p_exam_set_id" "uuid", "p_name" "text", "p_description" "text", "p_subjects" "jsonb", "p_finalize" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
  if (select u.role from public.users u where u.id = p_actor_user_id) is distinct from 'admin' then
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
    values (btrim(p_name), nullif(btrim(p_description), ''), 'draft', p_actor_user_id)
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

CREATE OR REPLACE FUNCTION "public"."save_user_simulator_config"("p_user_id" "uuid", "p_simulator_id" "text", "p_schema_version" integer, "p_applied_config" "jsonb", "p_expected_revision" bigint, "p_action" "text", "p_changed_fields" "jsonb", "p_operator_user_id" "text", "p_session_id" "uuid", "p_backup_config" "jsonb") RETURNS "public"."user_simulator_configs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := p_user_id;
  current_config public.user_simulator_configs;
  saved_config public.user_simulator_configs;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_action not in ('apply', 'restore', 'backup', 'flash-save') then
    raise exception 'INVALID_SIMULATOR_CONFIG_ACTION';
  end if;

  select *
  into current_config
  from public.user_simulator_configs
  where user_id = current_user_id
    and simulator_id = btrim(p_simulator_id)
  for update;

  if not found then
    raise exception 'SIMULATOR_CONFIG_NOT_INITIALIZED';
  end if;

  if current_config.revision <> p_expected_revision then
    raise exception 'CONFIG_REVISION_CONFLICT'
      using detail = current_config.revision::text;
  end if;

  update public.user_simulator_configs
  set schema_version = p_schema_version,
      applied_config = p_applied_config,
      backup_config = coalesce(p_backup_config, current_config.backup_config),
      revision = current_config.revision + 1,
      updated_at = now()
  where id = current_config.id
  returning * into saved_config;

  insert into public.user_simulator_config_history (
    user_id,
    simulator_id,
    action,
    previous_config,
    next_config,
    changed_fields,
    operator_user_id,
    session_id,
    revision
  )
  values (
    current_user_id,
    saved_config.simulator_id,
    p_action,
    current_config.applied_config,
    saved_config.applied_config,
    coalesce(p_changed_fields, '[]'::jsonb),
    nullif(btrim(p_operator_user_id), ''),
    p_session_id,
    saved_config.revision
  );

  return saved_config;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."start_exam_attempt"("p_user_id" "uuid", "p_candidate_subject_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
  if p_user_id is null then
    raise exception 'Bạn chưa đăng nhập.' using errcode = '42501';
  end if;
  if (select u.role from public.users u where u.id = p_user_id) is distinct from 'student' then
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

  if not found or lower(candidate_email) is distinct from (select lower(u.email) from public.users u where u.id = p_user_id) then
    raise exception 'Bạn không có môn thi được phân công này.' using errcode = '42501';
  end if;

  select * into existing_attempt
  from public.exam_attempts
  where candidate_subject_id = p_candidate_subject_id;

  if found then
    if existing_attempt.user_id <> p_user_id then
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
  values (candidate_subject.id, candidate_subject.exam_paper_id, p_user_id)
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
