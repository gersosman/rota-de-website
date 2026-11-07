-- Let the application role through row level security.
-- Policies do not grant access by themselves. Table ownership still applies.
do $$
declare
  table_name text;
begin
  for table_name in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('drop policy if exists app_access on public.%I', table_name);
    execute format(
      'create policy app_access on public.%I for all using (true) with check (true)',
      table_name
    );
  end loop;
end $$;
