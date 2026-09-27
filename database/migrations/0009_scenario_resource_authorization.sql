-- Resource-scoped authoring and optimistic concurrency for Scenario Parameters.
-- Expand-only: existing source rows remain owned by created_by and published
-- library snapshots remain immutable.

alter table public.simulator_scenario_parameters
  add column if not exists revision integer not null default 1,
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'simulator_scenario_parameters_revision_valid'
  ) then
    alter table public.simulator_scenario_parameters
      add constraint simulator_scenario_parameters_revision_valid
      check (revision > 0);
  end if;
end $$;

create index if not exists simulator_scenario_parameters_owner_idx
  on public.simulator_scenario_parameters (created_by, module_id, archived_at);

create table if not exists public.simulator_scenario_parameter_permissions (
  scenario_parameters_id uuid not null,
  module_id text not null,
  grantee_user_id uuid not null references public.users(id) on delete cascade,
  permission text not null default 'manage',
  granted_by uuid not null references public.users(id) on delete restrict,
  granted_at timestamptz not null default now(),
  primary key (scenario_parameters_id, grantee_user_id),
  constraint simulator_scenario_parameter_permissions_permission_valid
    check (permission = 'manage'),
  constraint simulator_scenario_parameter_permissions_source_fk
    foreign key (scenario_parameters_id, module_id)
    references public.simulator_scenario_parameters (id, module_id)
    on delete cascade
);

create index if not exists simulator_scenario_parameter_permissions_user_idx
  on public.simulator_scenario_parameter_permissions (grantee_user_id, module_id);

create table if not exists public.simulator_scenario_library_revisions (
  module_id text not null,
  library_kind text not null,
  revision integer not null default 0,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (module_id, library_kind),
  constraint simulator_scenario_library_revisions_module_valid check (
    module_id in ('dvor-1150', 'dvor-1150a', 'dme-1119a', 'dvor-220', 'dme-320')
  ),
  constraint simulator_scenario_library_revisions_kind_valid check (
    library_kind in ('practice', 'exam')
  ),
  constraint simulator_scenario_library_revisions_revision_valid check (revision >= 0)
);

insert into public.simulator_scenario_library_revisions (module_id, library_kind, revision)
select modules.module_id, kinds.library_kind, 0
from (values
  ('dvor-1150'),
  ('dvor-1150a'),
  ('dme-1119a'),
  ('dvor-220'),
  ('dme-320')
) as modules(module_id)
cross join (values ('practice'), ('exam')) as kinds(library_kind)
on conflict (module_id, library_kind) do nothing;

revoke all on table public.simulator_scenario_parameter_permissions from public;
revoke all on table public.simulator_scenario_library_revisions from public;

comment on table public.simulator_scenario_parameter_permissions is
  'Explicit teacher grants for a Scenario Parameters source; owner/admin checks remain server-authoritative.';

comment on table public.simulator_scenario_library_revisions is
  'Per-module/library optimistic concurrency counter for atomic publication updates.';
