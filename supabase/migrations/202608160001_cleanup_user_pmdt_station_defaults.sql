-- Replace legacy Tuy Hoa station identity values in per-user PMDT snapshots.
-- Keep numeric channel/frequency assignments unchanged; only identity strings
-- that came from the old simulator defaults are normalized to TST.

create or replace function public.replace_legacy_pmdt_station_identity(value jsonb)
returns jsonb
language sql
immutable
as $$
  select case jsonb_typeof(value)
    when 'object' then coalesce(
      (
        select jsonb_object_agg(
          entry.key,
          public.replace_legacy_pmdt_station_identity(entry.value)
        )
        from jsonb_each(value) as entry(key, value)
      ),
      '{}'::jsonb
    )
    when 'array' then coalesce(
      (
        select jsonb_agg(public.replace_legacy_pmdt_station_identity(entry.value))
        from jsonb_array_elements(value) as entry(value)
      ),
      '[]'::jsonb
    )
    when 'string' then case value #>> '{}'
      when 'TUH' then to_jsonb('TST'::text)
      when 'TUY HOA 117.0 MHz' then to_jsonb('TST'::text)
      when 'TUY HÒA 117.0 MHz' then to_jsonb('TST'::text)
      when 'VIETNAM TUY HOA 117X' then to_jsonb('TST'::text)
      when 'VIỆT NAM TUY HÒA 117X' then to_jsonb('TST'::text)
      else value
    end
    else value
  end;
$$;

update public.user_simulator_configs
set initial_config = public.replace_legacy_pmdt_station_identity(initial_config),
    applied_config = public.replace_legacy_pmdt_station_identity(applied_config),
    backup_config = public.replace_legacy_pmdt_station_identity(backup_config),
    updated_at = now()
where simulator_id in ('dvor-1150', 'dvor-1150a', 'dme-1119a')
  and (
    initial_config::text like '%"TUH"%'
    or initial_config::text like '%TUY HOA 117.0 MHz%'
    or initial_config::text like '%TUY HÒA 117.0 MHz%'
    or initial_config::text like '%VIETNAM TUY HOA 117X%'
    or initial_config::text like '%VIỆT NAM TUY HÒA 117X%'
    or applied_config::text like '%"TUH"%'
    or applied_config::text like '%TUY HOA 117.0 MHz%'
    or applied_config::text like '%TUY HÒA 117.0 MHz%'
    or applied_config::text like '%VIETNAM TUY HOA 117X%'
    or applied_config::text like '%VIỆT NAM TUY HÒA 117X%'
    or backup_config::text like '%"TUH"%'
    or backup_config::text like '%TUY HOA 117.0 MHz%'
    or backup_config::text like '%TUY HÒA 117.0 MHz%'
    or backup_config::text like '%VIETNAM TUY HOA 117X%'
    or backup_config::text like '%VIỆT NAM TUY HÒA 117X%'
  );

update public.user_simulator_config_history
set previous_config = public.replace_legacy_pmdt_station_identity(previous_config),
    next_config = public.replace_legacy_pmdt_station_identity(next_config)
where simulator_id in ('dvor-1150', 'dvor-1150a', 'dme-1119a')
  and (
    previous_config::text like '%"TUH"%'
    or previous_config::text like '%TUY HOA 117.0 MHz%'
    or previous_config::text like '%TUY HÒA 117.0 MHz%'
    or previous_config::text like '%VIETNAM TUY HOA 117X%'
    or previous_config::text like '%VIỆT NAM TUY HÒA 117X%'
    or next_config::text like '%"TUH"%'
    or next_config::text like '%TUY HOA 117.0 MHz%'
    or next_config::text like '%TUY HÒA 117.0 MHz%'
    or next_config::text like '%VIETNAM TUY HOA 117X%'
    or next_config::text like '%VIỆT NAM TUY HÒA 117X%'
  );

drop function public.replace_legacy_pmdt_station_identity(jsonb);
