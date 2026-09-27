alter table public.users
  drop constraint if exists users_role_valid;

alter table public.users
  add constraint users_role_valid check (role in ('admin', 'teacher', 'student'));

comment on column public.users.role is
  'Application role: admin, teacher, or student. Teacher permissions are resource-scoped in the server layer.';
