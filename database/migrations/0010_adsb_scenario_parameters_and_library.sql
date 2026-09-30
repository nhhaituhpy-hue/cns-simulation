-- Normalize legacy ADS-B scenarios into the Scenario Parameters source.
-- This migration is expand-only: it does not publish memberships automatically
-- and does not delete public.scenarios. A reviewer must publish the desired
-- rows into practice/exam libraries after the backfill is verified.

alter table public.simulator_scenario_library_memberships
  drop constraint if exists simulator_scenario_library_memberships_module_valid;

alter table public.simulator_scenario_library_memberships
  add constraint simulator_scenario_library_memberships_module_valid check (
    module_id in ('dvor-1150', 'dvor-1150a', 'dme-1119a', 'dvor-220', 'dme-320', 'ads-b')
  );

alter table public.simulator_scenario_library_revisions
  drop constraint if exists simulator_scenario_library_revisions_module_valid;

alter table public.simulator_scenario_library_revisions
  add constraint simulator_scenario_library_revisions_module_valid check (
    module_id in ('dvor-1150', 'dvor-1150a', 'dme-1119a', 'dvor-220', 'dme-320', 'ads-b')
  );

insert into public.simulator_scenario_library_revisions (module_id, library_kind, revision)
values
  ('ads-b', 'practice', 0),
  ('ads-b', 'exam', 0)
on conflict (module_id, library_kind) do nothing;

do $$
declare
  migration_actor uuid;
begin
  select id
    into migration_actor
    from public.users
   where role = 'admin'
   order by created_at, id
   limit 1;

  if migration_actor is null then
    raise exception 'Cannot backfill ADS-B scenarios without an admin owner.';
  end if;

  insert into public.simulator_scenario_parameters (
    module_id,
    scenario_id,
    name,
    description,
    difficulty,
    schema_version,
    definition_json,
    source_filename,
    created_by
  )
  select
    'ads-b',
    source.id,
    source.title,
    source.description,
    case source.difficulty
      when 'easy' then 'basic'
      when 'medium' then 'intermediate'
      when 'hard' then 'advanced'
    end,
    1,
    jsonb_strip_nulls(
      jsonb_build_object(
        'schemaVersion', 1,
        'id', source.id,
        'name', source.title,
        'description', source.description,
        'difficulty', case source.difficulty
          when 'easy' then 'basic'
          when 'medium' then 'intermediate'
          when 'hard' then 'advanced'
        end,
        'sites', source.sites_json::jsonb,
        'targetSensorId', source.target_sensor_id,
        'targetLoginUser', source.target_login_user,
        'expectedActions', source.expected_actions_json::jsonb,
        'hardwareFault', nullif(source.hardware_fault_json, '')::jsonb,
        'eventLog', nullif(source.event_log_json, '')::jsonb
      )
    ),
    'legacy-adsb',
    migration_actor
  from public.scenarios source
  where not exists (
    select 1
      from public.simulator_scenario_parameters existing
     where existing.module_id = 'ads-b'
       and existing.scenario_id = source.id
  );
end
$$;

comment on column public.simulator_scenario_parameters.source_filename is
  'Original import filename or migration source identifier, including legacy-adsb.';
