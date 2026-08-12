-- S1-0 / MCL
-- Lote executado e verificado em 12 AGO 2026. Não reaplicar sem novo snapshot
-- e nova revisão das pré-condições.
-- Altera somente privilégios. Não altera schema, RLS ou dados.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $precondition$
declare
  table_count integer;
  table_name_hash text;
  non_postgres_owner_count integer;
  exposed_table_count integer;
  function_count integer;
  sequence_count integer;
  extra_relation_count integer;
begin
  select
    count(*),
    md5(string_agg(quote_ident(relation.relname), ',' order by relation.relname))
  into table_count, table_name_hash
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p');

  if table_count <> 45 then
    raise exception 'S1-0 aborted: expected 45 public tables, found %', table_count;
  end if;

  if table_name_hash <> '979d0ed2f36e9c36b44a76d3bbf7c46d' then
    raise exception 'S1-0 aborted: public table inventory changed (%)', table_name_hash;
  end if;

  select count(*)
  into non_postgres_owner_count
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and pg_get_userbyid(relation.relowner) <> 'postgres';

  if non_postgres_owner_count <> 0 then
    raise exception
      'S1-0 aborted: % public tables are not owned by postgres',
      non_postgres_owner_count;
  end if;

  select count(*)
  into function_count
  from pg_proc function
  join pg_namespace namespace on namespace.oid = function.pronamespace
  where namespace.nspname = 'public';

  select count(*)
  into sequence_count
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind = 'S';

  select count(*)
  into extra_relation_count
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('v', 'm', 'f');

  if function_count <> 0
    or sequence_count <> 0
    or extra_relation_count <> 0 then
    raise exception
      'S1-0 aborted: public API object inventory changed (functions %, sequences %, extra relations %)',
      function_count, sequence_count, extra_relation_count;
  end if;

  select count(*)
  into exposed_table_count
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and (
      has_table_privilege('anon', relation.oid, 'SELECT')
      and has_table_privilege('anon', relation.oid, 'INSERT')
      and has_table_privilege('anon', relation.oid, 'UPDATE')
      and has_table_privilege('anon', relation.oid, 'DELETE')
      and has_table_privilege('anon', relation.oid, 'TRUNCATE')
      and has_table_privilege('anon', relation.oid, 'REFERENCES')
      and has_table_privilege('anon', relation.oid, 'TRIGGER')
      and has_table_privilege('anon', relation.oid, 'MAINTAIN')
      and has_table_privilege('authenticated', relation.oid, 'SELECT')
      and has_table_privilege('authenticated', relation.oid, 'INSERT')
      and has_table_privilege('authenticated', relation.oid, 'UPDATE')
      and has_table_privilege('authenticated', relation.oid, 'DELETE')
      and has_table_privilege('authenticated', relation.oid, 'TRUNCATE')
      and has_table_privilege('authenticated', relation.oid, 'REFERENCES')
      and has_table_privilege('authenticated', relation.oid, 'TRIGGER')
      and has_table_privilege('authenticated', relation.oid, 'MAINTAIN')
    );

  if exposed_table_count <> 45 then
    raise exception
      'S1-0 aborted: expected full anon/authenticated grants on 45 tables, found %',
      exposed_table_count;
  end if;
end
$precondition$;

revoke all privileges
  on all tables in schema public
  from anon, authenticated;

revoke all privileges
  on all sequences in schema public
  from anon, authenticated;

revoke execute
  on all functions in schema public
  from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

do $verification$
declare
  remaining_public_privileges integer;
  service_role_fully_granted_count integer;
  remaining_postgres_defaults integer;
begin
  select count(*)
  into remaining_public_privileges
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and (
      has_table_privilege('anon', relation.oid, 'SELECT')
      or has_table_privilege('anon', relation.oid, 'INSERT')
      or has_table_privilege('anon', relation.oid, 'UPDATE')
      or has_table_privilege('anon', relation.oid, 'DELETE')
      or has_table_privilege('anon', relation.oid, 'TRUNCATE')
      or has_table_privilege('anon', relation.oid, 'REFERENCES')
      or has_table_privilege('anon', relation.oid, 'TRIGGER')
      or has_table_privilege('anon', relation.oid, 'MAINTAIN')
      or has_table_privilege('authenticated', relation.oid, 'SELECT')
      or has_table_privilege('authenticated', relation.oid, 'INSERT')
      or has_table_privilege('authenticated', relation.oid, 'UPDATE')
      or has_table_privilege('authenticated', relation.oid, 'DELETE')
      or has_table_privilege('authenticated', relation.oid, 'TRUNCATE')
      or has_table_privilege('authenticated', relation.oid, 'REFERENCES')
      or has_table_privilege('authenticated', relation.oid, 'TRIGGER')
      or has_table_privilege('authenticated', relation.oid, 'MAINTAIN')
    );

  if remaining_public_privileges <> 0 then
    raise exception
      'S1-0 aborted: anon/authenticated still reach % public tables',
      remaining_public_privileges;
  end if;

  select count(*)
  into service_role_fully_granted_count
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and has_table_privilege('service_role', relation.oid, 'SELECT')
    and has_table_privilege('service_role', relation.oid, 'INSERT')
    and has_table_privilege('service_role', relation.oid, 'UPDATE')
    and has_table_privilege('service_role', relation.oid, 'DELETE')
    and has_table_privilege('service_role', relation.oid, 'TRUNCATE')
    and has_table_privilege('service_role', relation.oid, 'REFERENCES')
    and has_table_privilege('service_role', relation.oid, 'TRIGGER')
    and has_table_privilege('service_role', relation.oid, 'MAINTAIN');

  if service_role_fully_granted_count <> 45 then
    raise exception
      'S1-0 aborted: existing service_role grants changed (%)',
      service_role_fully_granted_count;
  end if;

  select count(*)
  into remaining_postgres_defaults
  from pg_default_acl default_acl
  join pg_namespace namespace
    on namespace.oid = default_acl.defaclnamespace
  cross join lateral aclexplode(default_acl.defaclacl) expanded_acl
  where namespace.nspname = 'public'
    and pg_get_userbyid(default_acl.defaclrole) = 'postgres'
    and (
      expanded_acl.grantee = 0
      or pg_get_userbyid(expanded_acl.grantee)
        in ('anon', 'authenticated', 'service_role')
    );

  if remaining_postgres_defaults <> 0 then
    raise exception
      'S1-0 aborted: postgres default exposure remains (%)',
      remaining_postgres_defaults;
  end if;
end
$verification$;

commit;
