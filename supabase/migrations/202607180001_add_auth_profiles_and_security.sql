-- Authentication, application roles, profile identity, and protected training data.
-- Dashboard setup still required after applying this migration:
-- Authentication > Hooks > Before User Created > public.hook_restrict_attech_signup

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  work_unit text not null check (char_length(btrim(work_unit)) between 2 and 160),
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, work_unit, role)
  values (
    new.id,
    lower(new.email),
    btrim(coalesce(new.raw_user_meta_data->>'full_name', '')),
    btrim(coalesce(new.raw_user_meta_data->>'work_unit', '')),
    'student'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create or replace function public.hook_restrict_attech_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_email text := lower(btrim(event->'user'->>'email'));
  signup_name text := btrim(coalesce(event->'user'->'user_metadata'->>'full_name', ''));
  signup_unit text := btrim(coalesce(event->'user'->'user_metadata'->>'work_unit', ''));
begin
  if signup_email is null or split_part(signup_email, '@', 2) <> 'attech.com.vn' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Chỉ email công vụ @attech.com.vn được phép đăng ký.'
      )
    );
  end if;

  if char_length(signup_name) < 2 or char_length(signup_unit) < 2 then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 400,
        'message', 'Họ tên và đơn vị công tác là bắt buộc.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_restrict_attech_signup(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_attech_signup(jsonb) from authenticated, anon, public;

drop policy if exists "profiles select own or admin" on public.profiles;
create policy "profiles select own or admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.current_app_role() = 'admin');

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
  on public.profiles for update
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

revoke all on table public.profiles from anon, authenticated;
grant select, update on table public.profiles to authenticated;

-- Test submissions were explicitly discarded before switching identity to Auth profiles.
delete from public.vor_submissions;
delete from public.dme_submissions;

alter table public.vor_submissions
  add column if not exists user_id uuid references auth.users(id) on delete restrict,
  add column if not exists work_unit text;

alter table public.dme_submissions
  add column if not exists user_id uuid references auth.users(id) on delete restrict,
  add column if not exists work_unit text;

alter table public.vor_submissions
  alter column user_id set not null,
  alter column work_unit set not null,
  drop column if exists student_code;

alter table public.dme_submissions
  alter column user_id set not null,
  alter column work_unit set not null,
  drop column if exists student_code;

create index if not exists vor_submissions_user_idx
  on public.vor_submissions (user_id, submitted_at desc);
create index if not exists dme_submissions_user_idx
  on public.dme_submissions (user_id, submitted_at desc);

-- Remove temporary anonymous policies and replace them with authenticated policies.
drop policy if exists "temporary public read scenarios" on public.scenarios;
drop policy if exists "temporary public create scenarios" on public.scenarios;
drop policy if exists "temporary public update scenarios" on public.scenarios;
drop policy if exists "temporary public delete scenarios" on public.scenarios;
drop policy if exists "temporary public manage vor scenarios" on public.vor_scenarios;
drop policy if exists "temporary public manage vor submissions" on public.vor_submissions;
drop policy if exists "temporary public manage dme scenarios" on public.dme_scenarios;
drop policy if exists "temporary public manage dme submissions" on public.dme_submissions;

revoke all on table public.scenarios from anon, authenticated;
revoke all on table public.vor_scenarios from anon, authenticated;
revoke all on table public.dme_scenarios from anon, authenticated;
revoke all on table public.vor_submissions from anon, authenticated;
revoke all on table public.dme_submissions from anon, authenticated;

grant select, insert, update, delete on table public.scenarios to authenticated;
grant select, insert, update, delete on table public.vor_scenarios to authenticated;
grant select, insert, update, delete on table public.dme_scenarios to authenticated;
grant select, insert, update, delete on table public.vor_submissions to authenticated;
grant select, insert, update, delete on table public.dme_submissions to authenticated;

drop policy if exists "authenticated read adsb scenarios" on public.scenarios;
create policy "authenticated read adsb scenarios"
  on public.scenarios for select to authenticated using (true);
drop policy if exists "admin manage adsb scenarios" on public.scenarios;
create policy "admin manage adsb scenarios"
  on public.scenarios for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists "authenticated read vor scenarios" on public.vor_scenarios;
create policy "authenticated read vor scenarios"
  on public.vor_scenarios for select to authenticated using (true);
drop policy if exists "admin manage vor scenarios" on public.vor_scenarios;
create policy "admin manage vor scenarios"
  on public.vor_scenarios for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists "authenticated read dme scenarios" on public.dme_scenarios;
create policy "authenticated read dme scenarios"
  on public.dme_scenarios for select to authenticated using (true);
drop policy if exists "admin manage dme scenarios" on public.dme_scenarios;
create policy "admin manage dme scenarios"
  on public.dme_scenarios for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists "student read own vor submissions" on public.vor_submissions;
create policy "student read own vor submissions"
  on public.vor_submissions for select to authenticated
  using (user_id = auth.uid() or public.current_app_role() = 'admin');
drop policy if exists "student create own vor submission" on public.vor_submissions;
create policy "student create own vor submission"
  on public.vor_submissions for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "admin update vor submissions" on public.vor_submissions;
create policy "admin update vor submissions"
  on public.vor_submissions for update to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');
drop policy if exists "admin delete vor submissions" on public.vor_submissions;
create policy "admin delete vor submissions"
  on public.vor_submissions for delete to authenticated
  using (public.current_app_role() = 'admin');

drop policy if exists "student read own dme submissions" on public.dme_submissions;
create policy "student read own dme submissions"
  on public.dme_submissions for select to authenticated
  using (user_id = auth.uid() or public.current_app_role() = 'admin');
drop policy if exists "student create own dme submission" on public.dme_submissions;
create policy "student create own dme submission"
  on public.dme_submissions for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "admin update dme submissions" on public.dme_submissions;
create policy "admin update dme submissions"
  on public.dme_submissions for update to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');
drop policy if exists "admin delete dme submissions" on public.dme_submissions;
create policy "admin delete dme submissions"
  on public.dme_submissions for delete to authenticated
  using (public.current_app_role() = 'admin');

-- Application-level lockout for Supabase Free. The table is only reachable with
-- the server-side secret key and stores a SHA-256 email digest, not the email.
create table if not exists public.auth_login_attempts (
  email_hash text primary key,
  failed_count integer not null default 0 check (failed_count between 0 and 5),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.auth_login_attempts enable row level security;
revoke all on table public.auth_login_attempts from anon, authenticated;
grant select, insert, update, delete on table public.auth_login_attempts to service_role;

create or replace function public.record_failed_login(p_email_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt public.auth_login_attempts%rowtype;
  next_count integer;
  next_locked_until timestamptz;
begin
  insert into public.auth_login_attempts (email_hash, failed_count)
  values (p_email_hash, 0)
  on conflict (email_hash) do nothing;

  select * into attempt
  from public.auth_login_attempts
  where email_hash = p_email_hash
  for update;

  if attempt.locked_until is not null and attempt.locked_until > now() then
    return jsonb_build_object(
      'failed_count', attempt.failed_count,
      'locked_until', attempt.locked_until
    );
  end if;

  if attempt.locked_until is not null then
    next_count := 1;
  else
    next_count := attempt.failed_count + 1;
  end if;

  if next_count >= 5 then
    next_count := 5;
    next_locked_until := now() + interval '5 minutes';
  else
    next_locked_until := null;
  end if;

  update public.auth_login_attempts
  set failed_count = next_count,
      locked_until = next_locked_until,
      updated_at = now()
  where email_hash = p_email_hash;

  return jsonb_build_object(
    'failed_count', next_count,
    'locked_until', next_locked_until
  );
end;
$$;

revoke execute on function public.record_failed_login(text) from public, anon, authenticated;
grant execute on function public.record_failed_login(text) to service_role;
