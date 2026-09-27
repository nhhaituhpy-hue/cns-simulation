-- Published library memberships are snapshots of one Scenario Parameters
-- source record. They are not a second scenario identity: editing the source
-- later cannot change a revision already published or assigned.
create table public.simulator_scenario_library_memberships (
  id uuid primary key default gen_random_uuid(),
  module_id text not null,
  scenario_parameters_id uuid not null,
  library_kind text not null,
  revision_number integer not null,
  scenario_id text not null,
  name text not null,
  description text not null,
  difficulty text not null,
  schema_version integer not null,
  definition_json jsonb not null,
  source_filename text not null default '',
  published_by uuid not null references public.users(id) on delete restrict,
  published_at timestamptz not null default now(),
  archived_at timestamptz,
  sort_order integer not null,
  constraint simulator_scenario_library_memberships_module_valid check (
    module_id in ('dvor-1150', 'dvor-1150a', 'dme-1119a', 'dvor-220', 'dme-320')
  ),
  constraint simulator_scenario_library_memberships_kind_valid check (
    library_kind in ('practice', 'exam')
  ),
  constraint simulator_scenario_library_memberships_revision_valid check (revision_number > 0),
  constraint simulator_scenario_library_memberships_sort_valid check (sort_order > 0),
  constraint simulator_scenario_library_memberships_scenario_id_valid check (length(btrim(scenario_id)) > 0),
  constraint simulator_scenario_library_memberships_name_valid check (length(btrim(name)) > 0),
  constraint simulator_scenario_library_memberships_definition_object check (jsonb_typeof(definition_json) = 'object'),
  constraint simulator_scenario_library_memberships_source_fk
    foreign key (scenario_parameters_id, module_id)
    references public.simulator_scenario_parameters (id, module_id)
    on delete restrict
);

create unique index simulator_scenario_library_memberships_active_source_idx
  on public.simulator_scenario_library_memberships (module_id, library_kind, scenario_parameters_id)
  where archived_at is null;

create unique index simulator_scenario_library_memberships_active_order_idx
  on public.simulator_scenario_library_memberships (module_id, library_kind, sort_order)
  where archived_at is null;

create unique index simulator_scenario_library_memberships_revision_idx
  on public.simulator_scenario_library_memberships (scenario_parameters_id, library_kind, revision_number);

create index simulator_scenario_library_memberships_listing_idx
  on public.simulator_scenario_library_memberships (module_id, library_kind, archived_at, sort_order);

-- Preserve the already-published Ôn tập list as revision 1 snapshots. The
-- legacy assignment table remains available for compatibility during cutover.
insert into public.simulator_scenario_library_memberships (
  module_id,
  scenario_parameters_id,
  library_kind,
  revision_number,
  scenario_id,
  name,
  description,
  difficulty,
  schema_version,
  definition_json,
  source_filename,
  published_by,
  published_at,
  sort_order
)
select
  a.module_id,
  a.scenario_parameters_id,
  'practice',
  1,
  sp.scenario_id,
  sp.name,
  sp.description,
  sp.difficulty,
  sp.schema_version,
  sp.definition_json,
  sp.source_filename,
  a.assigned_by,
  a.assigned_at,
  a.sort_order
from public.simulator_review_scenario_assignments a
join public.simulator_scenario_parameters sp
  on sp.id = a.scenario_parameters_id
 and sp.module_id = a.module_id
where not exists (
  select 1
  from public.simulator_scenario_library_memberships existing
  where existing.module_id = a.module_id
    and existing.library_kind = 'practice'
    and existing.scenario_parameters_id = a.scenario_parameters_id
    and existing.archived_at is null
);

revoke all on table public.simulator_scenario_library_memberships from public;

comment on table public.simulator_scenario_library_memberships is
  'Practice/exam library memberships with immutable published Scenario Parameters snapshots.';
