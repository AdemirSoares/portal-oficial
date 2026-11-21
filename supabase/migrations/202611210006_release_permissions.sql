-- Visitors use the publication projection. Keep internal IDs and editorial
-- state on the underlying table available only to authorized staff.
drop policy articles_public on public.articles;
revoke select on public.articles from anon;
alter view public.published_articles set (security_invoker = false, security_barrier = true);

create function public.cms_staff_accounts()
returns table (id uuid, email text, role text, can_publish boolean)
language sql stable security definer set search_path = ''
as $$
  select profile.id, account.email::text, profile.role, profile.can_publish
  from public.profiles profile
  join auth.users account on account.id = profile.id
  where (select cms_private.has_cms_permission('admin'))
  order by account.email, profile.id
$$;

create function public.cms_assign_staff(account_email text, staff_role text, publish_allowed boolean)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  account_id uuid;
begin
  if not cms_private.has_cms_permission('admin') then
    raise exception using errcode = '42501', message = 'Staff management not authorized';
  end if;

  select id into strict account_id
  from auth.users
  where lower(email) = lower(btrim(account_email));

  if account_id = auth.uid() then
    raise exception using errcode = '42501', message = 'Cannot change your own profile';
  end if;

  insert into public.profiles (id, role, can_publish)
  values (account_id, staff_role, publish_allowed)
  on conflict (id) do update set role = excluded.role, can_publish = excluded.can_publish;
  return account_id;
exception
  when no_data_found or too_many_rows then
    raise exception using errcode = 'P0002', message = 'An existing unique account is required';
end;
$$;

revoke all on function public.cms_staff_accounts(), public.cms_assign_staff(text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.cms_staff_accounts(), public.cms_assign_staff(text, text, boolean)
  to authenticated;
