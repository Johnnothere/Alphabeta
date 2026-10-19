-- These two only ever run as triggers. They return `trigger`, so they are not
-- usefully callable over the REST API, but they still carried Postgres's
-- default PUBLIC execute grant. Nothing outside the database should hold it.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.validate_vouch()  from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.validate_vouch()  to service_role;
