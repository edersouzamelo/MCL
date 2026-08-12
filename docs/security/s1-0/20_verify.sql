-- S1-0 / MCL
-- Verificação somente leitura após a aplicação.

begin transaction read only;

with public_tables as (
  select relation.oid, relation.relname, relation.relrowsecurity
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
)
select jsonb_build_object(
  'public_table_count', count(*),
  'table_name_hash', md5(string_agg(quote_ident(relname), ',' order by relname)),
  'rls_enabled_count', count(*) filter (where relrowsecurity)
) as inventory
from public_tables;

with public_tables as (
  select relation.oid
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
)
select
  role_name,
  count(*)::int as tables,
  count(*) filter (
    where has_table_privilege(role_name, oid, 'SELECT')
  )::int as can_select,
  count(*) filter (
    where has_table_privilege(role_name, oid, 'INSERT')
  )::int as can_insert,
  count(*) filter (
    where has_table_privilege(role_name, oid, 'UPDATE')
  )::int as can_update,
  count(*) filter (
    where has_table_privilege(role_name, oid, 'DELETE')
  )::int as can_delete,
  count(*) filter (
    where has_table_privilege(role_name, oid, 'TRUNCATE')
  )::int as can_truncate,
  count(*) filter (
    where has_table_privilege(role_name, oid, 'REFERENCES')
  )::int as can_references,
  count(*) filter (
    where has_table_privilege(role_name, oid, 'TRIGGER')
  )::int as can_trigger,
  count(*) filter (
    where has_table_privilege(role_name, oid, 'MAINTAIN')
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
  expanded_acl.privilege_type
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

commit;
