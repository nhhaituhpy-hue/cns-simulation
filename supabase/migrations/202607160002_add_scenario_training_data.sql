-- Persist optional training data that was previously kept only in browser state.

alter table public.scenarios
  add column if not exists hardware_fault_json text,
  add column if not exists event_log_json text;