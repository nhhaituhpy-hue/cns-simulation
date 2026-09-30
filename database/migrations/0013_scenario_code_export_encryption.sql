-- Keep the one-time redemption hash while allowing an authorized examiner to
-- re-export newly issued codes. The envelope is AES-256-GCM ciphertext; the
-- application key is deployment-only and is never stored in PostgreSQL.

alter table public.scenario_exam_codes
  add column code_ciphertext text;

alter table public.scenario_exam_codes
  add constraint scenario_exam_codes_ciphertext_valid check (
    code_ciphertext is null
    or code_ciphertext ~ '^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$'
  );

alter table public.scenario_exam_audit_events
  drop constraint scenario_exam_audit_event_type_valid;

alter table public.scenario_exam_audit_events
  add constraint scenario_exam_audit_event_type_valid check (
    event_type in (
      'exam_created', 'exam_opened', 'exam_locked', 'exam_closed',
      'code_issued', 'code_redeemed', 'code_exported', 'session_started', 'subject_started',
      'scenario_assigned', 'item_submitted', 'session_submitted',
      'session_timed_out', 'code_revoked', 'review_updated'
    )
  );

comment on column public.scenario_exam_codes.code_ciphertext is
  'Authenticated encrypted code envelope for admin export; null for codes issued before migration 0013.';

comment on table public.scenario_exam_codes is
  'One-time candidate codes; plaintext codes are never stored. New exportable codes use an encrypted envelope.';
