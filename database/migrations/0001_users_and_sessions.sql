create table public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  work_unit text not null,
  role text not null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  temporary_password_expires_at timestamptz,
  password_changed_at timestamptz,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_username_normalized check (username = lower(btrim(username))),
  constraint users_username_not_empty check (length(btrim(username)) between 2 and 100),
  constraint users_email_normalized check (email = lower(btrim(email))),
  constraint users_email_attech check (email like '%@attech.com.vn'),
  constraint users_password_hash_not_empty check (length(password_hash) > 0),
  constraint users_full_name_not_empty check (length(btrim(full_name)) >= 2),
  constraint users_work_unit_not_empty check (length(btrim(work_unit)) >= 2),
  constraint users_role_valid check (role in ('admin', 'student')),
  constraint users_failed_login_count_valid check (failed_login_count >= 0)
);

create table public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_sessions_token_hash_valid check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint user_sessions_expiry_valid check (expires_at > created_at)
);

create index users_active_role_idx
  on public.users (role, username)
  where is_active;

create index users_locked_until_idx
  on public.users (locked_until)
  where locked_until is not null;

create index user_sessions_user_id_idx
  on public.user_sessions (user_id);

create index user_sessions_active_expiry_idx
  on public.user_sessions (expires_at)
  where revoked_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

revoke all on table public.users from public;
revoke all on table public.user_sessions from public;
revoke all on function public.set_updated_at() from public;

comment on table public.users is
  'Application-owned user accounts replacing Supabase Auth users and profiles.';

comment on table public.user_sessions is
  'Opaque login sessions; only a SHA-256 token hash is stored in PostgreSQL.';
