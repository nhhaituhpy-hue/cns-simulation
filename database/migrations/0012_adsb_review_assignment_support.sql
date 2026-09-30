-- Allow normalized ADS-B Scenario Parameters to participate in the existing
-- practice/review assignment compatibility table. The new exam library does
-- not use this table, but the Ôn tập column still writes through it.

alter table public.simulator_review_scenario_assignments
  drop constraint if exists simulator_review_scenario_assignments_module_valid;

alter table public.simulator_review_scenario_assignments
  add constraint simulator_review_scenario_assignments_module_valid check (
    module_id in ('dvor-1150', 'dvor-1150a', 'dme-1119a', 'dvor-220', 'dme-320', 'ads-b')
  );
