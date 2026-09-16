create unique index simulator_scenario_parameters_id_module_idx
  on public.simulator_scenario_parameters (id, module_id);

create table public.simulator_review_scenario_assignments (
  id uuid primary key default gen_random_uuid(),
  module_id text not null,
  scenario_parameters_id uuid not null,
  sort_order integer not null,
  assigned_by uuid not null references public.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  constraint simulator_review_scenario_assignments_module_valid check (
    module_id in ('dvor-1150', 'dvor-1150a', 'dme-1119a', 'dvor-220', 'dme-320')
  ),
  constraint simulator_review_scenario_assignments_sort_order_valid check (sort_order > 0),
  constraint simulator_review_scenario_assignments_scenario_module_fk
    foreign key (scenario_parameters_id, module_id)
    references public.simulator_scenario_parameters (id, module_id)
    on delete cascade,
  unique (module_id, scenario_parameters_id),
  unique (module_id, sort_order)
);

create index simulator_review_scenario_assignments_module_order_idx
  on public.simulator_review_scenario_assignments (module_id, sort_order);

revoke all on table public.simulator_review_scenario_assignments from public;

comment on table public.simulator_review_scenario_assignments is
  'Examiner-controlled subset of Scenario Parameters published to the review workspace.';
