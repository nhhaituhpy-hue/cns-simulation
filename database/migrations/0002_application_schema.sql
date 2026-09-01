-- Portable CNS Simulator application schema generated from the production Supabase PostgreSQL 17 schema.
-- Supabase Auth tables, RLS policies, storage schema, grants and auth-dependent RPCs are intentionally excluded.
-- User foreign keys target public.users; authorization is enforced by the Next.js server data-access layer.
--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enforce_candidate_subject_status_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."enforce_candidate_subject_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: exam_attempt_payload("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."exam_attempt_payload"("p_attempt_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: guard_archived_candidate_subject(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."guard_archived_candidate_subject"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: guard_archived_exam_roster(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."guard_archived_exam_roster"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: guard_exam_attempt_direct_write(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."guard_exam_attempt_direct_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: guard_exam_state(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."guard_exam_state"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: guard_exam_with_attempts_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."guard_exam_with_attempts_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: guard_used_exam_set_content(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."guard_used_exam_set_content"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: guard_used_exam_source_scenario(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."guard_used_exam_source_scenario"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: user_simulator_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_simulator_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "simulator_id" "text" NOT NULL,
    "schema_version" integer DEFAULT 1 NOT NULL,
    "initial_config" "jsonb" NOT NULL,
    "applied_config" "jsonb" NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "revision" bigint DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "backup_config" "jsonb" NOT NULL,
    CONSTRAINT "user_simulator_configs_revision_check" CHECK (("revision" > 0)),
    CONSTRAINT "user_simulator_configs_schema_version_check" CHECK (("schema_version" > 0))
);


--
-- Name: protect_official_exam_result(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."protect_official_exam_result"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: protect_started_candidate_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."protect_started_candidate_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: protect_started_candidate_identity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."protect_started_candidate_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: save_candidate_result("uuid", numeric, "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."save_candidate_result"("p_candidate_subject_id" "uuid", "p_official_score" numeric, "p_examiner_comment" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: save_exam_candidate("uuid", "uuid", "text", "text", "text", "jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."save_exam_candidate"("p_candidate_id" "uuid", "p_exam_id" "uuid", "p_full_name" "text", "p_work_unit" "text", "p_email" "text", "p_subjects" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
$_$;


--
-- Name: save_exam_examiners("uuid", "jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."save_exam_examiners"("p_exam_id" "uuid", "p_examiners" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: set_exam_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."set_exam_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


--
-- Name: sync_exam_scenario_catalog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."sync_exam_scenario_catalog"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: validate_ready_exam_set(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."validate_ready_exam_set"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


--
-- Name: dme_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."dme_scenarios" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "difficulty" "text" NOT NULL,
    "prompt" "text" NOT NULL,
    "overrides" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "expected_checkpoints" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "hardware_task" "jsonb",
    CONSTRAINT "dme_scenarios_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"])))
);


--
-- Name: dme_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."dme_submissions" (
    "id" "text" NOT NULL,
    "scenario_id" "text" NOT NULL,
    "student_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "submitted_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "events" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "answer" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "score" numeric,
    "examiner_comment" "text",
    "hardware_answer" "jsonb",
    "user_id" "uuid" NOT NULL,
    "work_unit" "text" NOT NULL,
    CONSTRAINT "dme_submissions_score_check" CHECK ((("score" IS NULL) OR (("score" >= (0)::numeric) AND ("score" <= (100)::numeric)))),
    CONSTRAINT "dme_submissions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'reviewed'::"text"])))
);


--
-- Name: exam_attempt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_attempt_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "exam_paper_id" "uuid" NOT NULL,
    "paper_scenario_id" "uuid" NOT NULL,
    "module_code" "text" NOT NULL,
    "scenario_id" "text" NOT NULL,
    "position" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "submission_ref" "text",
    "result_json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_attempt_items_check" CHECK (((("status" = 'pending'::"text") AND ("started_at" IS NULL) AND ("submitted_at" IS NULL)) OR (("status" = 'in_progress'::"text") AND ("started_at" IS NOT NULL) AND ("submitted_at" IS NULL)) OR (("status" = 'submitted'::"text") AND ("started_at" IS NOT NULL) AND ("submitted_at" IS NOT NULL)))),
    CONSTRAINT "exam_attempt_items_position_check" CHECK (("position" > 0)),
    CONSTRAINT "exam_attempt_items_result_json_check" CHECK ((("result_json" IS NULL) OR ("jsonb_typeof"("result_json") = 'object'::"text"))),
    CONSTRAINT "exam_attempt_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'submitted'::"text"]))),
    CONSTRAINT "exam_attempt_items_submission_ref_check" CHECK ((("submission_ref" IS NULL) OR (("char_length"("btrim"("submission_ref")) >= 1) AND ("char_length"("btrim"("submission_ref")) <= 500))))
);


--
-- Name: exam_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_subject_id" "uuid" NOT NULL,
    "exam_paper_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_attempts_check" CHECK (((("status" = 'in_progress'::"text") AND ("submitted_at" IS NULL)) OR (("status" = 'submitted'::"text") AND ("submitted_at" IS NOT NULL)))),
    CONSTRAINT "exam_attempts_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'submitted'::"text"])))
);


--
-- Name: exam_candidate_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_candidate_subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "exam_id" "uuid" NOT NULL,
    "exam_set_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "exam_paper_id" "uuid" NOT NULL,
    "official_score" numeric(5,2),
    "examiner_comment" "text",
    "status" "text" DEFAULT 'assigned'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_candidate_subjects_examiner_comment_check" CHECK ((("examiner_comment" IS NULL) OR ("char_length"("btrim"("examiner_comment")) <= 4000))),
    CONSTRAINT "exam_candidate_subjects_official_score_check" CHECK ((("official_score" IS NULL) OR (("official_score" >= (0)::numeric) AND ("official_score" <= (100)::numeric)))),
    CONSTRAINT "exam_candidate_subjects_status_check" CHECK (("status" = ANY (ARRAY['assigned'::"text", 'in_progress'::"text", 'submitted'::"text", 'reviewed'::"text"])))
);


--
-- Name: exam_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_id" "uuid" NOT NULL,
    "exam_set_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "work_unit" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_candidates_email_check" CHECK (("email" = "lower"("btrim"("email")))),
    CONSTRAINT "exam_candidates_email_check1" CHECK (("email" ~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@attech[.]com[.]vn$'::"text")),
    CONSTRAINT "exam_candidates_full_name_check" CHECK ((("char_length"("btrim"("full_name")) >= 2) AND ("char_length"("btrim"("full_name")) <= 160))),
    CONSTRAINT "exam_candidates_work_unit_check" CHECK ((("char_length"("btrim"("work_unit")) >= 2) AND ("char_length"("btrim"("work_unit")) <= 200)))
);


--
-- Name: exam_examiners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_examiners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_id" "uuid" NOT NULL,
    "exam_set_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_examiners_full_name_check" CHECK ((("char_length"("btrim"("full_name")) >= 2) AND ("char_length"("btrim"("full_name")) <= 160))),
    CONSTRAINT "exam_examiners_position_check" CHECK (("position" > 0))
);


--
-- Name: exam_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_modules" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_modules_code_check" CHECK ((("code" = "lower"("btrim"("code"))) AND ("code" ~ '^[a-z0-9][a-z0-9-]{1,31}$'::"text"))),
    CONSTRAINT "exam_modules_name_check" CHECK ((("char_length"("btrim"("name")) >= 2) AND ("char_length"("btrim"("name")) <= 80))),
    CONSTRAINT "exam_modules_sort_order_check" CHECK (("sort_order" >= 0))
);


--
-- Name: exam_paper_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_paper_scenarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_paper_id" "uuid" NOT NULL,
    "exam_set_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "module_code" "text" NOT NULL,
    "scenario_id" "text" NOT NULL,
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_paper_scenarios_position_check" CHECK (("position" > 0))
);


--
-- Name: exam_papers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_papers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_set_subject_id" "uuid" NOT NULL,
    "exam_set_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "paper_number" integer NOT NULL,
    "title" "text" NOT NULL,
    "is_saved" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_papers_paper_number_check" CHECK (("paper_number" > 0)),
    CONSTRAINT "exam_papers_title_check" CHECK ((("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 200)))
);


--
-- Name: exam_scenario_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_scenario_catalog" (
    "module_code" "text" NOT NULL,
    "scenario_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_scenario_catalog_scenario_id_check" CHECK ((("char_length"("btrim"("scenario_id")) >= 1) AND ("char_length"("btrim"("scenario_id")) <= 200))),
    CONSTRAINT "exam_scenario_catalog_title_check" CHECK ((("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 300)))
);


--
-- Name: exam_set_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_set_subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_set_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "position" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_set_subjects_position_check" CHECK (("position" > 0))
);


--
-- Name: exam_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_sets_description_check" CHECK ((("description" IS NULL) OR ("char_length"("btrim"("description")) <= 1000))),
    CONSTRAINT "exam_sets_name_check" CHECK ((("char_length"("btrim"("name")) >= 3) AND ("char_length"("btrim"("name")) <= 200))),
    CONSTRAINT "exam_sets_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'ready'::"text", 'archived'::"text"])))
);


--
-- Name: exam_subject_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_subject_modules" (
    "subject_id" "uuid" NOT NULL,
    "module_code" "text" NOT NULL,
    "module_name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_subject_modules_module_name_check" CHECK ((("char_length"("btrim"("module_name")) >= 2) AND ("char_length"("btrim"("module_name")) <= 80))),
    CONSTRAINT "exam_subject_modules_sort_order_check" CHECK (("sort_order" >= 0))
);


--
-- Name: exam_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exam_subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_subjects_code_check" CHECK ((("code" = "upper"("btrim"("code"))) AND (("char_length"("code") >= 2) AND ("char_length"("code") <= 32)))),
    CONSTRAINT "exam_subjects_description_check" CHECK ((("description" IS NULL) OR ("char_length"("btrim"("description")) <= 500))),
    CONSTRAINT "exam_subjects_name_check" CHECK ((("char_length"("btrim"("name")) >= 2) AND ("char_length"("btrim"("name")) <= 120))),
    CONSTRAINT "exam_subjects_sort_order_check" CHECK (("sort_order" >= 0))
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "exam_date" "date" NOT NULL,
    "location" "text" NOT NULL,
    "decision_basis" "text" NOT NULL,
    "exam_set_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exams_decision_basis_check" CHECK ((("char_length"("btrim"("decision_basis")) >= 3) AND ("char_length"("btrim"("decision_basis")) <= 500))),
    CONSTRAINT "exams_location_check" CHECK (("location" = ANY (ARRAY['ha_noi'::"text", 'da_nang'::"text", 'tp_hcm'::"text"]))),
    CONSTRAINT "exams_name_check" CHECK ((("char_length"("btrim"("name")) >= 3) AND ("char_length"("btrim"("name")) <= 200))),
    CONSTRAINT "exams_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'locked'::"text", 'archived'::"text"])))
);


--
-- Name: scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."scenarios" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "difficulty" "text" NOT NULL,
    "sites_json" "text" NOT NULL,
    "target_sensor_id" "text" NOT NULL,
    "target_login_user" "text" NOT NULL,
    "expected_actions_json" "text" NOT NULL,
    "created_at" "text" NOT NULL,
    "updated_at" "text",
    "hardware_fault_json" "text",
    "event_log_json" "text",
    CONSTRAINT "scenarios_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"]))),
    CONSTRAINT "scenarios_target_login_user_check" CHECK (("target_login_user" = ANY (ARRAY['sysadmin'::"text", 'maintenance'::"text"])))
);


--
-- Name: user_simulator_config_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_simulator_config_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "simulator_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "previous_config" "jsonb",
    "next_config" "jsonb" NOT NULL,
    "changed_fields" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "operator_user_id" "text",
    "session_id" "uuid",
    "revision" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_simulator_config_history_action_check" CHECK (("action" = ANY (ARRAY['initialize'::"text", 'apply'::"text", 'restore'::"text", 'backup'::"text", 'flash-save'::"text"]))),
    CONSTRAINT "user_simulator_config_history_revision_check" CHECK (("revision" > 0))
);


--
-- Name: vor_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."vor_scenarios" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "difficulty" "text" NOT NULL,
    "prompt" "text" NOT NULL,
    "overrides" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "expected_checkpoints" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "hardware_task" "jsonb",
    CONSTRAINT "vor_scenarios_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"])))
);


--
-- Name: vor_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."vor_submissions" (
    "id" "text" NOT NULL,
    "scenario_id" "text" NOT NULL,
    "student_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "submitted_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "events" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "answer" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "score" numeric,
    "examiner_comment" "text",
    "hardware_answer" "jsonb",
    "user_id" "uuid" NOT NULL,
    "work_unit" "text" NOT NULL,
    CONSTRAINT "vor_submissions_score_check" CHECK ((("score" IS NULL) OR (("score" >= (0)::numeric) AND ("score" <= (100)::numeric)))),
    CONSTRAINT "vor_submissions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'reviewed'::"text"])))
);


--
-- Name: dme_scenarios dme_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dme_scenarios"
    ADD CONSTRAINT "dme_scenarios_pkey" PRIMARY KEY ("id");


--
-- Name: dme_submissions dme_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dme_submissions"
    ADD CONSTRAINT "dme_submissions_pkey" PRIMARY KEY ("id");


--
-- Name: exam_attempt_items exam_attempt_items_attempt_id_paper_scenario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_attempt_items"
    ADD CONSTRAINT "exam_attempt_items_attempt_id_paper_scenario_id_key" UNIQUE ("attempt_id", "paper_scenario_id");


--
-- Name: exam_attempt_items exam_attempt_items_attempt_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_attempt_items"
    ADD CONSTRAINT "exam_attempt_items_attempt_id_position_key" UNIQUE ("attempt_id", "position");


--
-- Name: exam_attempt_items exam_attempt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_attempt_items"
    ADD CONSTRAINT "exam_attempt_items_pkey" PRIMARY KEY ("id");


--
-- Name: exam_attempts exam_attempts_candidate_subject_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_candidate_subject_id_key" UNIQUE ("candidate_subject_id");


--
-- Name: exam_attempts exam_attempts_id_exam_paper_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_id_exam_paper_id_key" UNIQUE ("id", "exam_paper_id");


--
-- Name: exam_attempts exam_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id");


--
-- Name: exam_candidate_subjects exam_candidate_subjects_candidate_id_subject_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_candidate_subjects"
    ADD CONSTRAINT "exam_candidate_subjects_candidate_id_subject_id_key" UNIQUE ("candidate_id", "subject_id");


--
-- Name: exam_candidate_subjects exam_candidate_subjects_id_exam_paper_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_candidate_subjects"
    ADD CONSTRAINT "exam_candidate_subjects_id_exam_paper_id_key" UNIQUE ("id", "exam_paper_id");


--
-- Name: exam_candidate_subjects exam_candidate_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_candidate_subjects"
    ADD CONSTRAINT "exam_candidate_subjects_pkey" PRIMARY KEY ("id");


--
-- Name: exam_candidates exam_candidates_exam_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_candidates"
    ADD CONSTRAINT "exam_candidates_exam_id_email_key" UNIQUE ("exam_id", "email");


--
-- Name: exam_candidates exam_candidates_id_exam_id_exam_set_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_candidates"
    ADD CONSTRAINT "exam_candidates_id_exam_id_exam_set_id_key" UNIQUE ("id", "exam_id", "exam_set_id");


--
-- Name: exam_candidates exam_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_candidates"
    ADD CONSTRAINT "exam_candidates_pkey" PRIMARY KEY ("id");


--
-- Name: exam_examiners exam_examiners_exam_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_examiners"
    ADD CONSTRAINT "exam_examiners_exam_id_position_key" UNIQUE ("exam_id", "position");


--
-- Name: exam_examiners exam_examiners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_examiners"
    ADD CONSTRAINT "exam_examiners_pkey" PRIMARY KEY ("id");


--
-- Name: exam_modules exam_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_modules"
    ADD CONSTRAINT "exam_modules_pkey" PRIMARY KEY ("code");


--
-- Name: exam_paper_scenarios exam_paper_scenarios_exam_paper_id_module_code_scenario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_paper_scenarios"
    ADD CONSTRAINT "exam_paper_scenarios_exam_paper_id_module_code_scenario_id_key" UNIQUE ("exam_paper_id", "module_code", "scenario_id");


--
-- Name: exam_paper_scenarios exam_paper_scenarios_exam_paper_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_paper_scenarios"
    ADD CONSTRAINT "exam_paper_scenarios_exam_paper_id_position_key" UNIQUE ("exam_paper_id", "position");


--
-- Name: exam_paper_scenarios exam_paper_scenarios_id_exam_paper_id_module_code_scenario__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_paper_scenarios"
    ADD CONSTRAINT "exam_paper_scenarios_id_exam_paper_id_module_code_scenario__key" UNIQUE ("id", "exam_paper_id", "module_code", "scenario_id");


--
-- Name: exam_paper_scenarios exam_paper_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_paper_scenarios"
    ADD CONSTRAINT "exam_paper_scenarios_pkey" PRIMARY KEY ("id");


--
-- Name: exam_papers exam_papers_exam_set_subject_id_paper_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_papers"
    ADD CONSTRAINT "exam_papers_exam_set_subject_id_paper_number_key" UNIQUE ("exam_set_subject_id", "paper_number");


--
-- Name: exam_papers exam_papers_id_exam_set_id_subject_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_papers"
    ADD CONSTRAINT "exam_papers_id_exam_set_id_subject_id_key" UNIQUE ("id", "exam_set_id", "subject_id");


--
-- Name: exam_papers exam_papers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_papers"
    ADD CONSTRAINT "exam_papers_pkey" PRIMARY KEY ("id");


--
-- Name: exam_scenario_catalog exam_scenario_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_scenario_catalog"
    ADD CONSTRAINT "exam_scenario_catalog_pkey" PRIMARY KEY ("module_code", "scenario_id");


--
-- Name: exam_set_subjects exam_set_subjects_exam_set_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_set_subjects"
    ADD CONSTRAINT "exam_set_subjects_exam_set_id_position_key" UNIQUE ("exam_set_id", "position");


--
-- Name: exam_set_subjects exam_set_subjects_exam_set_id_subject_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_set_subjects"
    ADD CONSTRAINT "exam_set_subjects_exam_set_id_subject_id_key" UNIQUE ("exam_set_id", "subject_id");


--
-- Name: exam_set_subjects exam_set_subjects_id_exam_set_id_subject_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_set_subjects"
    ADD CONSTRAINT "exam_set_subjects_id_exam_set_id_subject_id_key" UNIQUE ("id", "exam_set_id", "subject_id");


--
-- Name: exam_set_subjects exam_set_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_set_subjects"
    ADD CONSTRAINT "exam_set_subjects_pkey" PRIMARY KEY ("id");


--
-- Name: exam_sets exam_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_sets"
    ADD CONSTRAINT "exam_sets_pkey" PRIMARY KEY ("id");


--
-- Name: exam_subject_modules exam_subject_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_subject_modules"
    ADD CONSTRAINT "exam_subject_modules_pkey" PRIMARY KEY ("subject_id", "module_code");


--
-- Name: exam_subjects exam_subjects_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_subjects"
    ADD CONSTRAINT "exam_subjects_code_key" UNIQUE ("code");


--
-- Name: exam_subjects exam_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_subjects"
    ADD CONSTRAINT "exam_subjects_pkey" PRIMARY KEY ("id");


--
-- Name: exams exams_id_exam_set_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_id_exam_set_id_key" UNIQUE ("id", "exam_set_id");


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_pkey" PRIMARY KEY ("id");


--
-- Name: scenarios scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."scenarios"
    ADD CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id");


--
-- Name: user_simulator_config_history user_simulator_config_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_simulator_config_history"
    ADD CONSTRAINT "user_simulator_config_history_pkey" PRIMARY KEY ("id");


--
-- Name: user_simulator_configs user_simulator_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_simulator_configs"
    ADD CONSTRAINT "user_simulator_configs_pkey" PRIMARY KEY ("id");


--
-- Name: user_simulator_configs user_simulator_configs_user_id_simulator_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_simulator_configs"
    ADD CONSTRAINT "user_simulator_configs_user_id_simulator_id_key" UNIQUE ("user_id", "simulator_id");


--
-- Name: vor_scenarios vor_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."vor_scenarios"
    ADD CONSTRAINT "vor_scenarios_pkey" PRIMARY KEY ("id");


--
-- Name: vor_submissions vor_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."vor_submissions"
    ADD CONSTRAINT "vor_submissions_pkey" PRIMARY KEY ("id");


--
-- Name: dme_scenarios_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "dme_scenarios_created_at_idx" ON "public"."dme_scenarios" USING "btree" ("created_at" DESC);


--
-- Name: dme_submissions_scenario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "dme_submissions_scenario_idx" ON "public"."dme_submissions" USING "btree" ("scenario_id", "submitted_at" DESC);


--
-- Name: dme_submissions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "dme_submissions_status_idx" ON "public"."dme_submissions" USING "btree" ("status", "submitted_at" DESC);


--
-- Name: dme_submissions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "dme_submissions_user_idx" ON "public"."dme_submissions" USING "btree" ("user_id", "submitted_at" DESC);


--
-- Name: exam_attempt_items_attempt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_attempt_items_attempt_idx" ON "public"."exam_attempt_items" USING "btree" ("attempt_id", "position");


--
-- Name: exam_attempt_items_one_in_progress_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "exam_attempt_items_one_in_progress_idx" ON "public"."exam_attempt_items" USING "btree" ("attempt_id") WHERE ("status" = 'in_progress'::"text");


--
-- Name: exam_attempts_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_attempts_user_idx" ON "public"."exam_attempts" USING "btree" ("user_id", "started_at" DESC);


--
-- Name: exam_candidate_subjects_exam_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_candidate_subjects_exam_idx" ON "public"."exam_candidate_subjects" USING "btree" ("exam_id", "candidate_id");


--
-- Name: exam_candidate_subjects_paper_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_candidate_subjects_paper_idx" ON "public"."exam_candidate_subjects" USING "btree" ("exam_paper_id");


--
-- Name: exam_candidates_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_candidates_email_idx" ON "public"."exam_candidates" USING "btree" ("lower"("email"), "exam_id");


--
-- Name: exam_candidates_exam_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_candidates_exam_name_idx" ON "public"."exam_candidates" USING "btree" ("exam_id", "full_name");


--
-- Name: exam_examiners_exam_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_examiners_exam_idx" ON "public"."exam_examiners" USING "btree" ("exam_id", "position");


--
-- Name: exam_paper_scenarios_paper_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_paper_scenarios_paper_idx" ON "public"."exam_paper_scenarios" USING "btree" ("exam_paper_id", "position");


--
-- Name: exam_papers_set_subject_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_papers_set_subject_idx" ON "public"."exam_papers" USING "btree" ("exam_set_id", "subject_id", "paper_number");


--
-- Name: exam_scenario_catalog_title_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_scenario_catalog_title_idx" ON "public"."exam_scenario_catalog" USING "btree" ("module_code", "title");


--
-- Name: exam_set_subjects_set_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_set_subjects_set_idx" ON "public"."exam_set_subjects" USING "btree" ("exam_set_id", "position");


--
-- Name: exam_sets_status_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_sets_status_updated_idx" ON "public"."exam_sets" USING "btree" ("status", "updated_at" DESC);


--
-- Name: exam_subject_modules_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_subject_modules_order_idx" ON "public"."exam_subject_modules" USING "btree" ("subject_id", "sort_order");


--
-- Name: exam_subjects_active_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exam_subjects_active_order_idx" ON "public"."exam_subjects" USING "btree" ("is_active", "sort_order", "name");


--
-- Name: exams_set_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exams_set_idx" ON "public"."exams" USING "btree" ("exam_set_id");


--
-- Name: exams_status_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exams_status_date_idx" ON "public"."exams" USING "btree" ("status", "exam_date" DESC);


--
-- Name: scenarios_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "scenarios_created_at_idx" ON "public"."scenarios" USING "btree" ("created_at" DESC);


--
-- Name: user_simulator_config_history_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_simulator_config_history_user_idx" ON "public"."user_simulator_config_history" USING "btree" ("user_id", "simulator_id", "created_at" DESC);


--
-- Name: user_simulator_configs_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_simulator_configs_user_idx" ON "public"."user_simulator_configs" USING "btree" ("user_id", "simulator_id");


--
-- Name: vor_scenarios_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vor_scenarios_created_at_idx" ON "public"."vor_scenarios" USING "btree" ("created_at" DESC);


--
-- Name: vor_submissions_scenario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vor_submissions_scenario_idx" ON "public"."vor_submissions" USING "btree" ("scenario_id", "submitted_at" DESC);


--
-- Name: vor_submissions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vor_submissions_status_idx" ON "public"."vor_submissions" USING "btree" ("status", "submitted_at" DESC);


--
-- Name: vor_submissions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vor_submissions_user_idx" ON "public"."vor_submissions" USING "btree" ("user_id", "submitted_at" DESC);


--
-- Name: exam_candidate_subjects enforce_candidate_subject_status_transition; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "enforce_candidate_subject_status_transition" BEFORE UPDATE ON "public"."exam_candidate_subjects" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_candidate_subject_status_transition"();


--
-- Name: exam_attempt_items exam_attempt_items_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "exam_attempt_items_set_updated_at" BEFORE UPDATE ON "public"."exam_attempt_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_exam_updated_at"();


--
-- Name: exam_attempts exam_attempts_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "exam_attempts_set_updated_at" BEFORE UPDATE ON "public"."exam_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."set_exam_updated_at"();


--
-- Name: exam_candidate_subjects exam_candidate_subjects_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "exam_candidate_subjects_set_updated_at" BEFORE UPDATE ON "public"."exam_candidate_subjects" FOR EACH ROW EXECUTE FUNCTION "public"."set_exam_updated_at"();


--
-- Name: exam_candidates exam_candidates_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "exam_candidates_set_updated_at" BEFORE UPDATE ON "public"."exam_candidates" FOR EACH ROW EXECUTE FUNCTION "public"."set_exam_updated_at"();


--
-- Name: exam_examiners exam_examiners_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "exam_examiners_set_updated_at" BEFORE UPDATE ON "public"."exam_examiners" FOR EACH ROW EXECUTE FUNCTION "public"."set_exam_updated_at"();


--
-- Name: exam_papers exam_papers_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "exam_papers_set_updated_at" BEFORE UPDATE ON "public"."exam_papers" FOR EACH ROW EXECUTE FUNCTION "public"."set_exam_updated_at"();


--
-- Name: exam_scenario_catalog exam_scenario_catalog_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "exam_scenario_catalog_set_updated_at" BEFORE UPDATE ON "public"."exam_scenario_catalog" FOR EACH ROW EXECUTE FUNCTION "public"."set_exam_updated_at"();


--
-- Name: exam_sets exam_sets_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "exam_sets_set_updated_at" BEFORE UPDATE ON "public"."exam_sets" FOR EACH ROW EXECUTE FUNCTION "public"."set_exam_updated_at"();


--
-- Name: exam_subjects exam_subjects_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "exam_subjects_set_updated_at" BEFORE UPDATE ON "public"."exam_subjects" FOR EACH ROW EXECUTE FUNCTION "public"."set_exam_updated_at"();


--
-- Name: exams exams_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "exams_set_updated_at" BEFORE UPDATE ON "public"."exams" FOR EACH ROW EXECUTE FUNCTION "public"."set_exam_updated_at"();


--
-- Name: exam_candidate_subjects guard_archived_candidate_subject; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_archived_candidate_subject" BEFORE INSERT OR DELETE OR UPDATE ON "public"."exam_candidate_subjects" FOR EACH ROW EXECUTE FUNCTION "public"."guard_archived_candidate_subject"();


--
-- Name: exam_candidates guard_archived_exam_candidates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_archived_exam_candidates" BEFORE INSERT OR DELETE OR UPDATE ON "public"."exam_candidates" FOR EACH ROW EXECUTE FUNCTION "public"."guard_archived_exam_roster"();


--
-- Name: exam_examiners guard_archived_exam_examiners; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_archived_exam_examiners" BEFORE INSERT OR DELETE OR UPDATE ON "public"."exam_examiners" FOR EACH ROW EXECUTE FUNCTION "public"."guard_archived_exam_roster"();


--
-- Name: exam_attempts guard_exam_attempt_direct_write; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_exam_attempt_direct_write" BEFORE INSERT OR DELETE OR UPDATE ON "public"."exam_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."guard_exam_attempt_direct_write"();


--
-- Name: exam_attempt_items guard_exam_attempt_item_direct_write; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_exam_attempt_item_direct_write" BEFORE INSERT OR DELETE OR UPDATE ON "public"."exam_attempt_items" FOR EACH ROW EXECUTE FUNCTION "public"."guard_exam_attempt_direct_write"();


--
-- Name: exams guard_exam_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_exam_delete" BEFORE DELETE ON "public"."exams" FOR EACH ROW EXECUTE FUNCTION "public"."guard_exam_with_attempts_delete"();


--
-- Name: exams guard_exam_state; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_exam_state" BEFORE INSERT OR UPDATE ON "public"."exams" FOR EACH ROW EXECUTE FUNCTION "public"."guard_exam_state"();


--
-- Name: scenarios guard_used_adsb_exam_source; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_used_adsb_exam_source" BEFORE DELETE OR UPDATE ON "public"."scenarios" FOR EACH ROW EXECUTE FUNCTION "public"."guard_used_exam_source_scenario"('ads-b');


--
-- Name: dme_scenarios guard_used_dme_exam_source; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_used_dme_exam_source" BEFORE DELETE OR UPDATE ON "public"."dme_scenarios" FOR EACH ROW EXECUTE FUNCTION "public"."guard_used_exam_source_scenario"('dme');


--
-- Name: exam_paper_scenarios guard_used_exam_paper_scenarios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_used_exam_paper_scenarios" BEFORE INSERT OR DELETE OR UPDATE ON "public"."exam_paper_scenarios" FOR EACH ROW EXECUTE FUNCTION "public"."guard_used_exam_set_content"();


--
-- Name: exam_papers guard_used_exam_papers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_used_exam_papers" BEFORE INSERT OR DELETE OR UPDATE ON "public"."exam_papers" FOR EACH ROW EXECUTE FUNCTION "public"."guard_used_exam_set_content"();


--
-- Name: exam_set_subjects guard_used_exam_set_subjects; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_used_exam_set_subjects" BEFORE INSERT OR DELETE OR UPDATE ON "public"."exam_set_subjects" FOR EACH ROW EXECUTE FUNCTION "public"."guard_used_exam_set_content"();


--
-- Name: vor_scenarios guard_used_vor_exam_source; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "guard_used_vor_exam_source" BEFORE DELETE OR UPDATE ON "public"."vor_scenarios" FOR EACH ROW EXECUTE FUNCTION "public"."guard_used_exam_source_scenario"('vor');


--
-- Name: exam_candidate_subjects protect_official_exam_result; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "protect_official_exam_result" BEFORE UPDATE ON "public"."exam_candidate_subjects" FOR EACH ROW EXECUTE FUNCTION "public"."protect_official_exam_result"();


--
-- Name: exam_candidate_subjects protect_started_candidate_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "protect_started_candidate_assignment" BEFORE UPDATE ON "public"."exam_candidate_subjects" FOR EACH ROW EXECUTE FUNCTION "public"."protect_started_candidate_assignment"();


--
-- Name: exam_candidates protect_started_candidate_identity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "protect_started_candidate_identity" BEFORE UPDATE ON "public"."exam_candidates" FOR EACH ROW EXECUTE FUNCTION "public"."protect_started_candidate_identity"();


--
-- Name: scenarios sync_adsb_exam_scenario_catalog; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "sync_adsb_exam_scenario_catalog" AFTER INSERT OR DELETE OR UPDATE ON "public"."scenarios" FOR EACH ROW EXECUTE FUNCTION "public"."sync_exam_scenario_catalog"('ads-b');


--
-- Name: dme_scenarios sync_dme_exam_scenario_catalog; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "sync_dme_exam_scenario_catalog" AFTER INSERT OR DELETE OR UPDATE ON "public"."dme_scenarios" FOR EACH ROW EXECUTE FUNCTION "public"."sync_exam_scenario_catalog"('dme');


--
-- Name: vor_scenarios sync_vor_exam_scenario_catalog; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "sync_vor_exam_scenario_catalog" AFTER INSERT OR DELETE OR UPDATE ON "public"."vor_scenarios" FOR EACH ROW EXECUTE FUNCTION "public"."sync_exam_scenario_catalog"('vor');


--
-- Name: exam_sets validate_ready_exam_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "validate_ready_exam_set" BEFORE INSERT OR UPDATE ON "public"."exam_sets" FOR EACH ROW EXECUTE FUNCTION "public"."validate_ready_exam_set"();


--
-- Name: dme_submissions dme_submissions_scenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dme_submissions"
    ADD CONSTRAINT "dme_submissions_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "public"."dme_scenarios"("id") ON DELETE CASCADE;


--
-- Name: dme_submissions dme_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dme_submissions"
    ADD CONSTRAINT "dme_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;


--
-- Name: exam_attempt_items exam_attempt_items_attempt_id_exam_paper_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_attempt_items"
    ADD CONSTRAINT "exam_attempt_items_attempt_id_exam_paper_id_fkey" FOREIGN KEY ("attempt_id", "exam_paper_id") REFERENCES "public"."exam_attempts"("id", "exam_paper_id") ON DELETE RESTRICT;


--
-- Name: exam_attempt_items exam_attempt_items_module_code_scenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_attempt_items"
    ADD CONSTRAINT "exam_attempt_items_module_code_scenario_id_fkey" FOREIGN KEY ("module_code", "scenario_id") REFERENCES "public"."exam_scenario_catalog"("module_code", "scenario_id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: exam_attempt_items exam_attempt_items_paper_scenario_id_exam_paper_id_module__fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_attempt_items"
    ADD CONSTRAINT "exam_attempt_items_paper_scenario_id_exam_paper_id_module__fkey" FOREIGN KEY ("paper_scenario_id", "exam_paper_id", "module_code", "scenario_id") REFERENCES "public"."exam_paper_scenarios"("id", "exam_paper_id", "module_code", "scenario_id") ON DELETE RESTRICT;


--
-- Name: exam_attempts exam_attempts_candidate_subject_id_exam_paper_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_candidate_subject_id_exam_paper_id_fkey" FOREIGN KEY ("candidate_subject_id", "exam_paper_id") REFERENCES "public"."exam_candidate_subjects"("id", "exam_paper_id") ON DELETE RESTRICT;


--
-- Name: exam_attempts exam_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;


--
-- Name: exam_candidate_subjects exam_candidate_subjects_candidate_id_exam_id_exam_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_candidate_subjects"
    ADD CONSTRAINT "exam_candidate_subjects_candidate_id_exam_id_exam_set_id_fkey" FOREIGN KEY ("candidate_id", "exam_id", "exam_set_id") REFERENCES "public"."exam_candidates"("id", "exam_id", "exam_set_id") ON DELETE CASCADE;


--
-- Name: exam_candidate_subjects exam_candidate_subjects_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_candidate_subjects"
    ADD CONSTRAINT "exam_candidate_subjects_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE CASCADE;


--
-- Name: exam_candidate_subjects exam_candidate_subjects_exam_paper_id_exam_set_id_subject__fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_candidate_subjects"
    ADD CONSTRAINT "exam_candidate_subjects_exam_paper_id_exam_set_id_subject__fkey" FOREIGN KEY ("exam_paper_id", "exam_set_id", "subject_id") REFERENCES "public"."exam_papers"("id", "exam_set_id", "subject_id") ON DELETE RESTRICT;


--
-- Name: exam_candidate_subjects exam_candidate_subjects_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_candidate_subjects"
    ADD CONSTRAINT "exam_candidate_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."exam_subjects"("id") ON DELETE RESTRICT;


--
-- Name: exam_candidates exam_candidates_exam_id_exam_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_candidates"
    ADD CONSTRAINT "exam_candidates_exam_id_exam_set_id_fkey" FOREIGN KEY ("exam_id", "exam_set_id") REFERENCES "public"."exams"("id", "exam_set_id") ON DELETE CASCADE;


--
-- Name: exam_examiners exam_examiners_exam_id_exam_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_examiners"
    ADD CONSTRAINT "exam_examiners_exam_id_exam_set_id_fkey" FOREIGN KEY ("exam_id", "exam_set_id") REFERENCES "public"."exams"("id", "exam_set_id") ON DELETE CASCADE;


--
-- Name: exam_examiners exam_examiners_exam_set_id_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_examiners"
    ADD CONSTRAINT "exam_examiners_exam_set_id_subject_id_fkey" FOREIGN KEY ("exam_set_id", "subject_id") REFERENCES "public"."exam_set_subjects"("exam_set_id", "subject_id") ON DELETE RESTRICT;


--
-- Name: exam_examiners exam_examiners_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_examiners"
    ADD CONSTRAINT "exam_examiners_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."exam_subjects"("id") ON DELETE RESTRICT;


--
-- Name: exam_paper_scenarios exam_paper_scenarios_exam_paper_id_exam_set_id_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_paper_scenarios"
    ADD CONSTRAINT "exam_paper_scenarios_exam_paper_id_exam_set_id_subject_id_fkey" FOREIGN KEY ("exam_paper_id", "exam_set_id", "subject_id") REFERENCES "public"."exam_papers"("id", "exam_set_id", "subject_id") ON DELETE CASCADE;


--
-- Name: exam_paper_scenarios exam_paper_scenarios_module_code_scenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_paper_scenarios"
    ADD CONSTRAINT "exam_paper_scenarios_module_code_scenario_id_fkey" FOREIGN KEY ("module_code", "scenario_id") REFERENCES "public"."exam_scenario_catalog"("module_code", "scenario_id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: exam_paper_scenarios exam_paper_scenarios_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_paper_scenarios"
    ADD CONSTRAINT "exam_paper_scenarios_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."exam_subjects"("id") ON DELETE RESTRICT;


--
-- Name: exam_paper_scenarios exam_paper_scenarios_subject_id_module_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_paper_scenarios"
    ADD CONSTRAINT "exam_paper_scenarios_subject_id_module_code_fkey" FOREIGN KEY ("subject_id", "module_code") REFERENCES "public"."exam_subject_modules"("subject_id", "module_code") ON DELETE RESTRICT;


--
-- Name: exam_papers exam_papers_exam_set_subject_id_exam_set_id_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_papers"
    ADD CONSTRAINT "exam_papers_exam_set_subject_id_exam_set_id_subject_id_fkey" FOREIGN KEY ("exam_set_subject_id", "exam_set_id", "subject_id") REFERENCES "public"."exam_set_subjects"("id", "exam_set_id", "subject_id") ON DELETE CASCADE;


--
-- Name: exam_papers exam_papers_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_papers"
    ADD CONSTRAINT "exam_papers_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."exam_subjects"("id") ON DELETE RESTRICT;


--
-- Name: exam_scenario_catalog exam_scenario_catalog_module_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_scenario_catalog"
    ADD CONSTRAINT "exam_scenario_catalog_module_code_fkey" FOREIGN KEY ("module_code") REFERENCES "public"."exam_modules"("code") ON DELETE RESTRICT;


--
-- Name: exam_set_subjects exam_set_subjects_exam_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_set_subjects"
    ADD CONSTRAINT "exam_set_subjects_exam_set_id_fkey" FOREIGN KEY ("exam_set_id") REFERENCES "public"."exam_sets"("id") ON DELETE CASCADE;


--
-- Name: exam_set_subjects exam_set_subjects_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_set_subjects"
    ADD CONSTRAINT "exam_set_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."exam_subjects"("id") ON DELETE RESTRICT;


--
-- Name: exam_sets exam_sets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_sets"
    ADD CONSTRAINT "exam_sets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;


--
-- Name: exam_subject_modules exam_subject_modules_module_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_subject_modules"
    ADD CONSTRAINT "exam_subject_modules_module_code_fkey" FOREIGN KEY ("module_code") REFERENCES "public"."exam_modules"("code") ON DELETE RESTRICT;


--
-- Name: exam_subject_modules exam_subject_modules_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exam_subject_modules"
    ADD CONSTRAINT "exam_subject_modules_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."exam_subjects"("id") ON DELETE CASCADE;


--
-- Name: exams exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;


--
-- Name: exams exams_exam_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_exam_set_id_fkey" FOREIGN KEY ("exam_set_id") REFERENCES "public"."exam_sets"("id") ON DELETE RESTRICT;


--
-- Name: user_simulator_config_history user_simulator_config_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_simulator_config_history"
    ADD CONSTRAINT "user_simulator_config_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: user_simulator_configs user_simulator_configs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_simulator_configs"
    ADD CONSTRAINT "user_simulator_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: vor_submissions vor_submissions_scenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."vor_submissions"
    ADD CONSTRAINT "vor_submissions_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "public"."vor_scenarios"("id") ON DELETE CASCADE;


--
-- Name: vor_submissions vor_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."vor_submissions"
    ADD CONSTRAINT "vor_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--
