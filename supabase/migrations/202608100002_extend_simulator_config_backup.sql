-- Keep the factory, running and non-volatile backup/profile snapshots
-- separate for every authenticated simulator user.

alter table public.user_simulator_configs
  add column if not exists backup_config jsonb;

update public.user_simulator_configs
set backup_config = applied_config
where backup_config is null;

alter table public.user_simulator_configs
  alter column backup_config set not null;

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

-- Preserve the original RPC signature for older clients. It updates the
-- running snapshot and deliberately leaves the backup/profile unchanged.
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
begin
  return public.save_user_simulator_config(
    p_simulator_id,
    p_schema_version,
    p_applied_config,
    p_expected_revision,
    p_action,
    p_changed_fields,
    p_operator_user_id,
    p_session_id,
    null
  );
end;
$$;

create or replace function public.save_user_simulator_config(
  p_simulator_id text,
  p_schema_version integer,
  p_applied_config jsonb,
  p_expected_revision bigint,
  p_action text,
  p_changed_fields jsonb,
  p_operator_user_id text,
  p_session_id uuid,
  p_backup_config jsonb
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

revoke all on function public.initialize_user_simulator_config(text, integer, jsonb) from public, anon;
revoke all on function public.save_user_simulator_config(text, integer, jsonb, bigint, text, jsonb, text, uuid) from public, anon;
revoke all on function public.save_user_simulator_config(text, integer, jsonb, bigint, text, jsonb, text, uuid, jsonb) from public, anon;
grant execute on function public.initialize_user_simulator_config(text, integer, jsonb) to authenticated;
grant execute on function public.save_user_simulator_config(text, integer, jsonb, bigint, text, jsonb, text, uuid) to authenticated;
grant execute on function public.save_user_simulator_config(text, integer, jsonb, bigint, text, jsonb, text, uuid, jsonb) to authenticated;
