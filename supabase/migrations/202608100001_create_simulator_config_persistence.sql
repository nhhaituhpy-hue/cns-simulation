-- Per-user simulator configuration persistence.
-- The simulator's internal PMDT operator ID is deliberately kept separate
-- from the authenticated application user ID stored in auth.uid().

create table if not exists public.user_simulator_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  simulator_id text not null,
  schema_version integer not null default 1 check (schema_version > 0),
  initial_config jsonb not null,
  applied_config jsonb not null,
  preferences jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, simulator_id)
);

create index if not exists user_simulator_configs_user_idx
  on public.user_simulator_configs (user_id, simulator_id);

create table if not exists public.user_simulator_config_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  simulator_id text not null,
  action text not null check (action in ('initialize', 'apply', 'restore', 'backup', 'flash-save')),
  previous_config jsonb,
  next_config jsonb not null,
  changed_fields jsonb not null default '[]'::jsonb,
  operator_user_id text,
  session_id uuid,
  revision bigint not null check (revision > 0),
  created_at timestamptz not null default now()
);

create index if not exists user_simulator_config_history_user_idx
  on public.user_simulator_config_history (user_id, simulator_id, created_at desc);

alter table public.user_simulator_configs enable row level security;
alter table public.user_simulator_config_history enable row level security;

revoke all on table public.user_simulator_configs from anon, authenticated;
revoke all on table public.user_simulator_config_history from anon, authenticated;
grant select on table public.user_simulator_configs to authenticated;
grant select on table public.user_simulator_config_history to authenticated;

drop policy if exists "users read own simulator configs" on public.user_simulator_configs;
create policy "users read own simulator configs"
  on public.user_simulator_configs for select
  to authenticated
  using (user_id = auth.uid() or public.current_app_role() = 'admin');

drop policy if exists "users read own simulator config history" on public.user_simulator_config_history;
create policy "users read own simulator config history"
  on public.user_simulator_config_history for select
  to authenticated
  using (user_id = auth.uid() or public.current_app_role() = 'admin');

create or replace function public.initialize_user_simulator_config(
  p_simulator_id text,
  p_schema_version integer,
  p_default_config jsonb
)
returns public.user_simulator_configs
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
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
    applied_config
  )
  values (
    current_user_id,
    btrim(p_simulator_id),
    p_schema_version,
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

create or replace function public.save_user_simulator_config(
  p_simulator_id text,
  p_schema_version integer,
  p_applied_config jsonb,
  p_expected_revision bigint,
  p_action text default 'apply',
  p_changed_fields jsonb default '[]'::jsonb,
  p_operator_user_id text default null,
  p_session_id uuid default null
)
returns public.user_simulator_configs
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_config public.user_simulator_configs;
  saved_config public.user_simulator_configs;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
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

revoke all on function public.initialize_user_simulator_config(text, integer, jsonb) from public, anon;
revoke all on function public.save_user_simulator_config(text, integer, jsonb, bigint, text, jsonb, text, uuid) from public, anon;
grant execute on function public.initialize_user_simulator_config(text, integer, jsonb) to authenticated;
grant execute on function public.save_user_simulator_config(text, integer, jsonb, bigint, text, jsonb, text, uuid) to authenticated;
