-- Replace the missing Supabase role resolver with the verified server actor.
-- Only the trusted Next.js server can access the database credential. It sets
-- app.actor_user_id with set_config(..., true) inside the same transaction as
-- each legacy exam write. Never accept this actor from browser action input.
-- No actor, malformed ID, inactive account or required password change fails closed.
create function public.current_app_role()
returns text
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select u.role
  from public.users u
  where u.id = case
    when current_setting('app.actor_user_id', true) ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then current_setting('app.actor_user_id', true)::uuid
    else null
  end
    and u.is_active
    and not u.must_change_password;
$$;

comment on function public.current_app_role() is
  'Role of the verified server-only actor in the current transaction; NULL without a valid active actor. No Supabase auth context or default admin.';
