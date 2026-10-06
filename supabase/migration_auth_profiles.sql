-- Migration: Support rich profile creation from Google OAuth and Email OTP
-- Updates handle_new_user() to extract full_name, avatar_url and phone from raw_user_meta_data.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, phone, plan)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    new.raw_user_meta_data->>'phone',
    'free'
  )
  on conflict (id) do update set
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone);
  return new;
end;
$$;

-- Ensure trigger is active
do $$
begin
  begin
    drop trigger if exists on_auth_user_created on auth.users;
  exception when others then
    null;
  end;

  create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
end
$$;
