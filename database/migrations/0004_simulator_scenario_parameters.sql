create table public.simulator_scenario_parameters (
  id uuid primary key default gen_random_uuid(),
  module_id text not null,
  scenario_id text not null,
  name text not null,
  description text not null,
  difficulty text not null,
  schema_version integer not null,
  definition_json jsonb not null,
  source_filename text not null default '',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulator_scenario_parameters_id_not_empty check (length(btrim(scenario_id)) > 0),
  constraint simulator_scenario_parameters_name_not_empty check (length(btrim(name)) >= 1),
  constraint simulator_scenario_parameters_schema_version_valid check (schema_version > 0),
  constraint simulator_scenario_parameters_definition_object check (jsonb_typeof(definition_json) = 'object'),
  constraint simulator_scenario_parameters_source_filename_length check (length(source_filename) <= 255),
  unique (module_id, scenario_id)
);

create index simulator_scenario_parameters_module_updated_idx
  on public.simulator_scenario_parameters (module_id, updated_at desc);

create trigger simulator_scenario_parameters_set_updated_at
before update on public.simulator_scenario_parameters
for each row execute function public.set_updated_at();

revoke all on table public.simulator_scenario_parameters from public;

comment on table public.simulator_scenario_parameters is
  'Validated Scenario Parameters JSON imported from simulator PMDT tools.';
