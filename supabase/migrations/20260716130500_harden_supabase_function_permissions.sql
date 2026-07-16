-- public.rls_auto_enable() is the handler for the ensure_rls event trigger.
-- Event-trigger execution runs through PostgreSQL's event-trigger machinery
-- and does not require Data API roles to have direct EXECUTE permission.
-- Keep the owner permission intact while removing the public/API attack surface.
DO $migration$
BEGIN
  IF pg_catalog.to_regprocedure('public.rls_auto_enable()') IS NULL THEN
    RAISE NOTICE 'public.rls_auto_enable() does not exist; no permissions changed';
    RETURN;
  END IF;

  EXECUTE
    'REVOKE ALL ON FUNCTION public.rls_auto_enable() '
    'FROM PUBLIC, anon, authenticated, service_role';
END
$migration$;
