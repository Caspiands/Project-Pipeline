-- Admin-only RPC to create logins or set passwords without the service role in the browser.

create or replace function public.admin_manage_login(
  p_email text,
  p_password text,
  p_role public.app_role,
  p_person_id uuid default null,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person public.people%rowtype;
  v_user_id uuid;
  v_email text;
  v_hash text;
  v_full_name text;
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
begin
  if not public.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'A valid email is required';
  end if;

  if p_password is null or length(trim(p_password)) < 10 then
    raise exception 'Password must be at least 10 characters';
  end if;

  if p_role is null then
    raise exception 'Role is required';
  end if;

  v_hash := extensions.crypt(trim(p_password), extensions.gen_salt('bf'));

  if p_person_id is not null then
    select * into v_person from public.people where id = p_person_id;
    if not found then
      raise exception 'Deal owner not found';
    end if;
    v_full_name := v_person.name;
  end if;

  if p_user_id is not null then
    v_user_id := p_user_id;
  elsif p_person_id is not null then
    if v_person.profile_id is not null then
      v_user_id := v_person.profile_id;
    else
      select u.id into v_user_id
      from auth.users u
      where lower(u.email) = v_email
        and u.deleted_at is null
      limit 1;
    end if;
  else
    raise exception 'Choose a deal owner or an existing login';
  end if;

  if v_user_id is null then
    if p_person_id is null then
      raise exception 'Choose a deal owner or an existing login';
    end if;
    if v_person.profile_id is not null then
      raise exception 'This deal owner already has a login';
    end if;

    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, is_sso_user, is_anonymous
    ) values (
      v_instance_id, v_user_id, 'authenticated', 'authenticated', v_email, v_hash,
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('full_name', v_full_name),
      now(), now(), false, false
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      v_user_id::text, v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email', now(), now(), now()
    );
  else
    if not exists (select 1 from auth.users u where u.id = v_user_id and u.deleted_at is null) then
      raise exception 'Login not found';
    end if;

    update auth.users
    set encrypted_password = v_hash,
        email = v_email,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = v_user_id;

    update auth.identities
    set identity_data = jsonb_set(
          jsonb_set(identity_data, '{email}', to_jsonb(v_email), true),
          '{email_verified}', 'true'::jsonb,
          true
        ),
        updated_at = now()
    where user_id = v_user_id and provider = 'email';
  end if;

  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    v_user_id,
    v_email,
    coalesce(v_full_name, split_part(v_email, '@', 1)),
    p_role,
    true
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      role = excluded.role,
      updated_at = now();

  if p_person_id is not null then
    update public.people
    set email = v_email,
        profile_id = v_user_id
    where id = p_person_id;
  else
    update public.people
    set profile_id = v_user_id
    where profile_id is null
      and email is not null
      and lower(email) = v_email;
  end if;

  return v_user_id;
end;
$$;

revoke all on function public.admin_manage_login(text, text, public.app_role, uuid, uuid) from public;
grant execute on function public.admin_manage_login(text, text, public.app_role, uuid, uuid) to authenticated;
