alter table public.vor_scenarios
  add column if not exists hardware_task jsonb;

alter table public.dme_scenarios
  add column if not exists hardware_task jsonb;

alter table public.vor_submissions
  add column if not exists hardware_answer jsonb;

alter table public.dme_submissions
  add column if not exists hardware_answer jsonb;

comment on column public.vor_scenarios.hardware_task is
  'Optional expected component selection and fault metadata for hardware diagnosis step.';
comment on column public.dme_scenarios.hardware_task is
  'Optional expected component selection and fault metadata for hardware diagnosis step.';
comment on column public.vor_submissions.hardware_answer is
  'Student component selection, reasoning, inspected components, and completion time.';
comment on column public.dme_submissions.hardware_answer is
  'Student component selection, reasoning, inspected components, and completion time.';
