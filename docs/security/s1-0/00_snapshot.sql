-- S1-0 / MCL
-- Snapshot somente leitura. Não altera schema, grants ou dados.

begin transaction read only;

select jsonb_build_object(
  'database', current_database(),
  'current_user', current_user,
  'server_version', current_setting('server_version'),
  'public_table_count', count(*),
  'rls_enabled_count', count(*) filter (where c.relrowsecurity),
  'table_name_hash', md5(string_agg(quote_ident(c.relname), ',' order by c.relname)),
  'table_names', jsonb_agg(c.relname order by c.relname)
) as inventory
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p');

with public_tables as (
  select format('%I.%I', n.nspname, c.relname) as qualified_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
)
select
  role_name,
  count(*)::int as tables,
  count(*) filter (
    where has_table_privilege(role_name, qualified_name, 'SELECT')
  )::int as can_select,
  count(*) filter (
    where has_table_privilege(role_name, qualified_name, 'INSERT')
  )::int as can_insert,
  count(*) filter (
    where has_table_privilege(role_name, qualified_name, 'UPDATE')
  )::int as can_update,
  count(*) filter (
    where has_table_privilege(role_name, qualified_name, 'DELETE')
  )::int as can_delete,
  count(*) filter (
    where has_table_privilege(role_name, qualified_name, 'TRUNCATE')
  )::int as can_truncate,
  count(*) filter (
    where has_table_privilege(role_name, qualified_name, 'REFERENCES')
  )::int as can_references,
  count(*) filter (
    where has_table_privilege(role_name, qualified_name, 'TRIGGER')
  )::int as can_trigger,
  count(*) filter (
    where has_table_privilege(role_name, qualified_name, 'MAINTAIN')
  )::int as can_maintain
from public_tables
cross join (
  values ('anon'), ('authenticated'), ('service_role')
) as roles(role_name)
group by role_name
order by role_name;

select
  pg_get_userbyid(default_acl.defaclrole) as owner_role,
  namespace.nspname as schema_name,
  default_acl.defaclobjtype as object_type,
  case
    when expanded_acl.grantee = 0 then 'PUBLIC'
    else pg_get_userbyid(expanded_acl.grantee)
  end as grantee,
  expanded_acl.privilege_type,
  expanded_acl.is_grantable
from pg_default_acl default_acl
join pg_namespace namespace
  on namespace.oid = default_acl.defaclnamespace
cross join lateral aclexplode(default_acl.defaclacl) expanded_acl
where namespace.nspname = 'public'
order by owner_role, object_type, grantee, privilege_type;

select jsonb_build_object(
  'User', (select count(*) from public."User"),
  'catmat_items', (select count(*) from public.catmat_items),
  'AuditLog', (select count(*) from public."AuditLog"),
  'CoverageQuery', (select count(*) from public."CoverageQuery"),
  'CatmatMapping', (select count(*) from public."CatmatMapping"),
  'ItemCatalogMapping', (select count(*) from public."ItemCatalogMapping"),
  'ArpUnitRecord', (select count(*) from public."ArpUnitRecord"),
  'Need', (select count(*) from public."Need"),
  'NeedItem', (select count(*) from public."NeedItem")
) as key_row_counts;

select jsonb_build_object(
  'policy_count', (
    select count(*)
    from pg_policy policy
    join pg_class relation on relation.oid = policy.polrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
  ),
  'view_count', (
    select count(*)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('v', 'm')
  ),
  'function_count', (
    select count(*)
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
  ),
  'sequence_count', (
    select count(*)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind = 'S'
  )
) as public_api_objects;

commit;
