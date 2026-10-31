-- Run in Supabase SQL Editor.
-- Each authenticated account has exactly one role. New signups default to student.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- Signed-in users can read only their own role; the frontend uses this to route safely.
drop policy if exists "Users can read their own role" on public.user_roles;
create policy "Users can read their own role"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

-- Create a student role row automatically for every new Auth account.
create or replace function public.assign_default_student_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_assign_role on auth.users;
create trigger on_auth_user_created_assign_role
after insert on auth.users
for each row execute procedure public.assign_default_student_role();

-- Promote a trusted existing account to admin using its exact Auth email.
-- Run this manually as the project owner; never expose service-role credentials in frontend code.
-- update public.user_roles
-- set role = 'admin'
-- where user_id = (select id from auth.users where email = 'admin@your-university.edu');

-- Existing Auth users who predate the trigger receive student by default.
insert into public.user_roles (user_id, role)
select id, 'student' from auth.users
on conflict (user_id) do nothing;
