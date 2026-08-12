-- S1-0 / MCL
-- Rollback de grants. Usar somente se os gatilhos do README forem atendidos.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $precondition$
declare
  table_count integer;
  table_name_hash text;
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

  if table_count <> 45
    or table_name_hash <> '979d0ed2f36e9c36b44a76d3bbf7c46d'
    or function_count <> 0
    or sequence_count <> 0
    or extra_relation_count <> 0 then
    raise exception
      'S1-0 rollback aborted: object inventory changed (tables %, hash %, functions %, sequences %, extra relations %)',
      table_count, table_name_hash, function_count, sequence_count,
      extra_relation_count;
  end if;
end
$precondition$;

grant all privileges
  on all tables in schema public
  to anon, authenticated;

grant all privileges
  on all sequences in schema public
  to anon, authenticated;

grant execute
  on all functions in schema public
  to anon, authenticated;

alter default privileges for role postgres in schema public
  grant all privileges on tables to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant all privileges on sequences to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated, service_role;

do $verification$
declare
  restored_anon_tables integer;
  restored_authenticated_tables integer;
  restored_default_acl_entries integer;
  unexpected_default_acl_entries integer;
begin
  select count(*)
  into restored_anon_tables
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and has_table_privilege('anon', relation.oid, 'SELECT')
    and has_table_privilege('anon', relation.oid, 'INSERT')
    and has_table_privilege('anon', relation.oid, 'UPDATE')
    and has_table_privilege('anon', relation.oid, 'DELETE')
    and has_table_privilege('anon', relation.oid, 'TRUNCATE')
    and has_table_privilege('anon', relation.oid, 'REFERENCES')
    and has_table_privilege('anon', relation.oid, 'TRIGGER')
    and has_table_privilege('anon', relation.oid, 'MAINTAIN');

  select count(*)
  into restored_authenticated_tables
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and has_table_privilege('authenticated', relation.oid, 'SELECT')
    and has_table_privilege('authenticated', relation.oid, 'INSERT')
    and has_table_privilege('authenticated', relation.oid, 'UPDATE')
    and has_table_privilege('authenticated', relation.oid, 'DELETE')
    and has_table_privilege('authenticated', relation.oid, 'TRUNCATE')
    and has_table_privilege('authenticated', relation.oid, 'REFERENCES')
    and has_table_privilege('authenticated', relation.oid, 'TRIGGER')
    and has_table_privilege('authenticated', relation.oid, 'MAINTAIN');

  if restored_anon_tables <> 45 or restored_authenticated_tables <> 45 then
    raise exception
      'S1-0 rollback aborted: grants not fully restored (anon %, authenticated %)',
      restored_anon_tables, restored_authenticated_tables;
  end if;

  select count(*)
  into restored_default_acl_entries
  from pg_default_acl default_acl
  join pg_namespace namespace
    on namespace.oid = default_acl.defaclnamespace
  cross join lateral aclexplode(default_acl.defaclacl) expanded_acl
  where namespace.nspname = 'public'
    and pg_get_userbyid(default_acl.defaclrole) = 'postgres'
    and pg_get_userbyid(expanded_acl.grantee)
      in ('anon', 'authenticated', 'service_role')
    and (
      (default_acl.defaclobjtype = 'r'
        and expanded_acl.privilege_type in (
          'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE',
          'REFERENCES', 'TRIGGER', 'MAINTAIN'
        ))
      or (default_acl.defaclobjtype = 'S'
        and expanded_acl.privilege_type in ('SELECT', 'UPDATE', 'USAGE'))
      or (default_acl.defaclobjtype = 'f'
        and expanded_acl.privilege_type = 'EXECUTE')
    );

  select count(*)
  into unexpected_default_acl_entries
  from pg_default_acl default_acl
  join pg_namespace namespace
    on namespace.oid = default_acl.defaclnamespace
  cross join lateral aclexplode(default_acl.defaclacl) expanded_acl
  where namespace.nspname = 'public'
    and pg_get_userbyid(default_acl.defaclrole) = 'postgres'
    and (
      expanded_acl.grantee = 0
      or (
        pg_get_userbyid(expanded_acl.grantee)
          in ('anon', 'authenticated', 'service_role')
        and not (
          (default_acl.defaclobjtype = 'r'
            and expanded_acl.privilege_type in (
              'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE',
              'REFERENCES', 'TRIGGER', 'MAINTAIN'
            ))
          or (default_acl.defaclobjtype = 'S'
            and expanded_acl.privilege_type in ('SELECT', 'UPDATE', 'USAGE'))
          or (default_acl.defaclobjtype = 'f'
            and expanded_acl.privilege_type = 'EXECUTE')
        )
      )
    );

  if restored_default_acl_entries <> 36
    or unexpected_default_acl_entries <> 0 then
    raise exception
      'S1-0 rollback aborted: postgres default ACL mismatch (expected entries %, unexpected %)',
      restored_default_acl_entries, unexpected_default_acl_entries;
  end if;
end
$verification$;

commit;
