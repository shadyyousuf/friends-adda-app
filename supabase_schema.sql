-- Enable required extensions
create extension if not exists "uuid-ossp";

-------------------------------------------------------------------------------
-- Tables
-------------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text unique not null,
  role text check (role in ('admin', 'member')) default 'member',
  is_approved boolean default false,
  blood_group text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  type text check (type in ('general', 'fund_tracker', 'random_picker')) not null,
  event_date date not null default current_date,
  status text check (status in ('open', 'active', 'completed')) default 'open',
  visibility text check (visibility in ('public', 'private')) default 'private',
  target_amount numeric,
  monthly_default_amount numeric,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.event_subscribers (
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_role text check (event_role in ('captain', 'co-captain', 'member')) default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (event_id, user_id)
);

create table if not exists public.event_funds (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  month integer not null,
  year integer not null,
  status text check (status in ('pending', 'paid')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (event_id, user_id, year, month)
);

alter table public.events
  add column if not exists target_amount numeric;

alter table public.events
  add column if not exists monthly_default_amount numeric;

alter table public.events
  add column if not exists event_date date;

update public.events
set event_date = coalesce(event_date, created_at::date)
where event_date is null;

alter table public.events
  alter column event_date set default current_date;

alter table public.events
  alter column event_date set not null;

alter table public.events
  drop constraint if exists events_type_check;

alter table public.events
  add constraint events_type_check
  check (type in ('general', 'fund_tracker', 'random_picker'));

alter table public.event_funds
  add column if not exists month integer;

alter table public.event_funds
  add column if not exists year integer;

update public.event_funds
set
  month = extract(month from timezone('utc'::text, created_at))::integer,
  year = extract(year from timezone('utc'::text, created_at))::integer
where month is null or year is null;

alter table public.event_funds
  alter column month set not null;

alter table public.event_funds
  alter column year set not null;

alter table public.event_funds
  drop constraint if exists event_funds_event_id_user_id_key;

alter table public.event_funds
  drop constraint if exists event_funds_event_id_user_id_year_month_key;

alter table public.event_funds
  add constraint event_funds_event_id_user_id_year_month_key
  unique (event_id, user_id, year, month);

create table if not exists public.event_activities (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  activity_type text not null,
  payload jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-------------------------------------------------------------------------------
-- Trigger + Helper Functions
-------------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do update
    set
      email = excluded.email,
      full_name = excluded.full_name;

  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_event_subscriber(p_event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.event_subscribers
    where event_id = p_event_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_event_role(
  p_event_id uuid,
  p_roles text[]
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.event_subscribers
    where event_id = p_event_id
      and user_id = auth.uid()
      and event_role = any(p_roles)
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-------------------------------------------------------------------------------
-- RPC / Mutation Functions
-------------------------------------------------------------------------------

create or replace function public.update_own_profile(
  p_full_name text,
  p_blood_group text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set
    full_name = nullif(trim(p_full_name), ''),
    blood_group = nullif(trim(p_blood_group), '')
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.approve_user(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve users';
  end if;

  update public.profiles
  set is_approved = true
  where id = p_user_id
  returning * into updated_profile;

  if updated_profile is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.promote_user_to_admin(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only admins can promote users';
  end if;

  update public.profiles
  set role = 'admin', is_approved = true
  where id = p_user_id
  returning * into updated_profile;

  if updated_profile is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.create_event_with_captain(
  p_title text,
  p_description text,
  p_type text,
  p_visibility text,
  p_event_date date,
  p_target_amount numeric default null,
  p_monthly_default_amount numeric default null
)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  created_event public.events;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile is null then
    raise exception 'Profile not found';
  end if;

  if current_profile.is_approved is distinct from true then
    raise exception 'Only approved users can create events';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'Title is required';
  end if;

  if p_type not in ('general', 'fund_tracker', 'random_picker') then
    raise exception 'Invalid event type';
  end if;

  if p_visibility not in ('public', 'private') then
    raise exception 'Invalid visibility';
  end if;

  if p_target_amount is not null and p_target_amount <= 0 then
    raise exception 'Target amount must be greater than zero';
  end if;

  if p_monthly_default_amount is not null and p_monthly_default_amount <= 0 then
    raise exception 'Monthly default amount must be greater than zero';
  end if;

  insert into public.events (
    title,
    description,
    type,
    event_date,
    visibility,
    target_amount,
    monthly_default_amount,
    created_by
  )
  values (
    nullif(trim(p_title), ''),
    nullif(trim(p_description), ''),
    p_type,
    p_event_date,
    p_visibility,
    p_target_amount,
    p_monthly_default_amount,
    auth.uid()
  )
  returning * into created_event;

  insert into public.event_subscribers (event_id, user_id, event_role)
  values (created_event.id, auth.uid(), 'captain')
  on conflict (event_id, user_id) do update
    set event_role = 'captain';

  return created_event;
end;
$$;

create or replace function public.join_public_event(p_event_id uuid)
returns public.event_subscribers
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_event public.events;
  joined_subscription public.event_subscribers;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile is null then
    raise exception 'Profile not found';
  end if;

  if current_profile.is_approved is distinct from true then
    raise exception 'Only approved users can join events';
  end if;

  select *
  into target_event
  from public.events
  where id = p_event_id;

  if target_event is null then
    raise exception 'Event not found';
  end if;

  if target_event.visibility <> 'public' or target_event.status <> 'open' then
    raise exception 'This event is not open for public joining';
  end if;

  insert into public.event_subscribers (event_id, user_id, event_role)
  values (p_event_id, auth.uid(), 'member')
  on conflict (event_id, user_id) do update
    set joined_at = event_subscribers.joined_at
  returning * into joined_subscription;

  return joined_subscription;
end;
$$;

create or replace function public.promote_event_member_to_cocaptain(
  p_event_id uuid,
  p_user_id uuid
)
returns public.event_subscribers
language plpgsql
security definer
set search_path = public
as $$
declare
  co_captain_count integer;
  updated_subscription public.event_subscribers;
  target_subscription public.event_subscribers;
begin
  if not public.is_admin() and not public.has_event_role(p_event_id, array['captain']) then
    raise exception 'Only captains or app admins can promote members';
  end if;

  select *
    into target_subscription
    from public.event_subscribers
    where event_id = p_event_id
      and user_id = p_user_id;

  if target_subscription is null then
    raise exception 'Subscriber not found';
  end if;

  if target_subscription.event_role = 'captain' then
    raise exception 'Captains cannot be promoted';
  end if;

  select count(*)
    into co_captain_count
    from public.event_subscribers
    where event_id = p_event_id and event_role = 'co-captain';

  if target_subscription.event_role <> 'co-captain' and co_captain_count >= 2 then
    raise exception 'Maximum of 2 co-captains is allowed for an event';
  end if;

  update public.event_subscribers
    set event_role = 'co-captain'
  where event_id = p_event_id
    and user_id = p_user_id
  returning * into updated_subscription;

  if updated_subscription is null then
    raise exception 'Subscriber not found or cannot be promoted';
  end if;

  return updated_subscription;
end;
$$;

create or replace function public.transfer_event_captain(
  p_event_id uuid,
  p_user_id uuid
)
returns public.event_subscribers
language plpgsql
security definer
set search_path = public
as $$
declare
  target_subscription public.event_subscribers;
  updated_subscription public.event_subscribers;
begin
  if not public.is_admin() and not public.has_event_role(p_event_id, array['captain']) then
    raise exception 'Only captains or app admins can transfer captaincy';
  end if;

  select *
    into target_subscription
    from public.event_subscribers
    where event_id = p_event_id and user_id = p_user_id;

  if target_subscription is null then
    raise exception 'Subscriber not found';
  end if;

  if target_subscription.event_role = 'captain' then
    raise exception 'Target is already the captain';
  end if;

  update public.event_subscribers
    set event_role = 'member'
  where event_id = p_event_id and event_role = 'captain' and user_id <> p_user_id;

  update public.event_subscribers
    set event_role = 'captain'
  where event_id = p_event_id and user_id = p_user_id
  returning * into updated_subscription;

  if updated_subscription is null then
    raise exception 'Subscriber not found';
  end if;

  if updated_subscription.event_role <> 'captain' then
    raise exception 'Only event members can be promoted to captain';
  end if;

  return updated_subscription;
end;
$$;

create or replace function public.demote_event_member_to_member(
  p_event_id uuid,
  p_user_id uuid
)
returns public.event_subscribers
language plpgsql
security definer
set search_path = public
as $$
declare
  target_subscription public.event_subscribers;
  updated_subscription public.event_subscribers;
begin
  select *
  into target_subscription
  from public.event_subscribers
  where event_id = p_event_id and user_id = p_user_id;

  if target_subscription is null then
    raise exception 'Subscriber not found';
  end if;

  if not public.is_admin() then
    if not public.has_event_role(p_event_id, array['captain']) then
      raise exception 'Only captains or app admins can demote members';
    end if;

    if target_subscription.event_role = 'captain' then
      raise exception 'Captains cannot be demoted by non-admins';
    end if;
  end if;

  update public.event_subscribers
  set event_role = 'member'
  where event_id = p_event_id and user_id = p_user_id
  returning * into updated_subscription;

  return updated_subscription;
end;
$$;

create or replace function public.remove_event_member(
  p_event_id uuid,
  p_user_id uuid
)
returns public.event_subscribers
language plpgsql
security definer
set search_path = public
as $$
declare
  target_subscription public.event_subscribers;
  removed_subscription public.event_subscribers;
begin
  select *
  into target_subscription
  from public.event_subscribers
  where event_id = p_event_id and user_id = p_user_id;

  if target_subscription is null then
    raise exception 'Subscriber not found';
  end if;

  if not public.is_admin() then
    if not public.has_event_role(p_event_id, array['captain']) then
      raise exception 'Only captains or app admins can remove members';
    end if;

    if target_subscription.event_role = 'captain' then
      raise exception 'Captains cannot be removed by non-admins';
    end if;

    if p_user_id = auth.uid() then
      raise exception 'Captains cannot remove themselves';
    end if;
  end if;

  delete from public.event_subscribers
  where event_id = p_event_id and user_id = p_user_id
  returning * into removed_subscription;

  return removed_subscription;
end;
$$;

create or replace function public.upsert_event_fund_payment(
  p_event_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_month integer,
  p_year integer
)
returns public.event_funds
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events;
  target_subscription public.event_subscribers;
  upserted_fund public.event_funds;
begin
  if not public.is_admin()
     and not public.has_event_role(p_event_id, array['captain', 'co-captain']) then
    raise exception 'Only captains, co-captains, or app admins can record payments';
  end if;

  if p_month < 1 or p_month > 12 then
    raise exception 'Month must be between 1 and 12';
  end if;

  if p_year < 2000 or p_year > 9999 then
    raise exception 'Year must be valid';
  end if;

  select *
  into target_event
  from public.events
  where id = p_event_id;

  if target_event is null or target_event.type <> 'fund_tracker' then
    raise exception 'Event is not a fund tracker';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if target_event.monthly_default_amount is not null and p_amount < target_event.monthly_default_amount then
    raise exception 'Amount must be at least monthly default amount';
  end if;

  select *
  into target_subscription
  from public.event_subscribers
  where event_id = p_event_id and user_id = p_user_id;

  if target_subscription is null then
    raise exception 'Subscriber not found';
  end if;

  insert into public.event_funds (
    event_id,
    user_id,
    amount,
    month,
    year,
    status
  )
  values (
    p_event_id,
    p_user_id,
    p_amount,
    p_month,
    p_year,
    'paid'
  )
  on conflict (event_id, user_id, year, month) do update
    set
      amount = excluded.amount,
      status = 'paid'
  returning * into upserted_fund;

  return upserted_fund;
end;
$$;

create or replace function public.spin_random_picker(
  p_event_id uuid,
  p_amount numeric
)
returns public.event_activities
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events;
  winner_id uuid;
  created_activity public.event_activities;
begin
  if not public.is_admin()
     and not public.has_event_role(p_event_id, array['captain', 'co-captain']) then
    raise exception 'Only captains, co-captains, or app admins can spin';
  end if;

  select *
  into target_event
  from public.events
  where id = p_event_id;

  if target_event is null or target_event.type <> 'random_picker' then
    raise exception 'Event is not a random picker';
  end if;

  select user_id
  into winner_id
  from public.event_subscribers
  where event_id = p_event_id
  order by random()
  limit 1;

  if winner_id is null then
    raise exception 'No subscribers available for random pick';
  end if;

  insert into public.event_activities (event_id, activity_type, payload)
  values (
    p_event_id,
    'random_pick',
    jsonb_build_object(
      'winner', winner_id,
      'amount', p_amount,
      'picked_by', auth.uid()
    )
  )
  returning * into created_activity;

  return created_activity;
end;
$$;

-------------------------------------------------------------------------------
-- RLS Enablement
-------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_subscribers enable row level security;
alter table public.event_funds enable row level security;
alter table public.event_activities enable row level security;

-------------------------------------------------------------------------------
-- Policy Reset
-------------------------------------------------------------------------------

drop policy if exists "Admins have full access to profiles" on public.profiles;
drop policy if exists "Users can view all approved profiles" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;

drop policy if exists "Admins have full access to events" on public.events;
drop policy if exists "Users can view public events or ones they are subscribed to" on public.events;
drop policy if exists "Captains and Co-Captains can update events" on public.events;
drop policy if exists "Captains can update events" on public.events;
drop policy if exists "Captains and Co-Captains can delete events" on public.events;
drop policy if exists "Approved users can create events" on public.events;

drop policy if exists "Admins have full access to subscribers" on public.event_subscribers;
drop policy if exists "Users can view subscribers of events they can view" on public.event_subscribers;
drop policy if exists "Captains and Co-Captains can manage subscribers" on public.event_subscribers;
drop policy if exists "Users can join public open events" on public.event_subscribers;

drop policy if exists "Admins have full access to funds" on public.event_funds;
drop policy if exists "Users can view funds of their events" on public.event_funds;
drop policy if exists "Captains and Co-Captains can manage funds" on public.event_funds;

drop policy if exists "Admins have full access to activities" on public.event_activities;
drop policy if exists "Users can view activities of their events" on public.event_activities;
drop policy if exists "Captains and Co-Captains can insert activities" on public.event_activities;

-------------------------------------------------------------------------------
-- Policies
-------------------------------------------------------------------------------

create policy "Admins have full access to profiles" on public.profiles
  for all using (public.is_admin());

create policy "Users can view all approved profiles" on public.profiles
  for select using (is_approved = true or id = auth.uid());

create policy "Users can create their own profile" on public.profiles
  for insert with check (id = auth.uid());

create policy "Admins have full access to events" on public.events
  for all using (public.is_admin());

create policy "Users can view public events or ones they are subscribed to" on public.events
  for select using (
    visibility = 'public' or public.is_event_subscriber(events.id)
  );

create policy "Captains can update events" on public.events
  for update using (
    public.has_event_role(events.id, array['captain'])
  );

create policy "Captains and Co-Captains can delete events" on public.events
  for delete using (
    public.has_event_role(events.id, array['captain', 'co-captain'])
  );

create policy "Approved users can create events" on public.events
  for insert with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid() and is_approved = true
    )
  );

create policy "Admins have full access to subscribers" on public.event_subscribers
  for all using (public.is_admin());

create policy "Users can view subscribers of events they can view" on public.event_subscribers
  for select using (
    exists (
      select 1
      from public.events e
      where e.id = event_subscribers.event_id
        and (e.visibility = 'public' or public.is_event_subscriber(e.id))
    )
  );

create policy "Captains and Co-Captains can manage subscribers" on public.event_subscribers
  for all using (
    public.has_event_role(event_subscribers.event_id, array['captain', 'co-captain'])
  );

create policy "Users can join public open events" on public.event_subscribers
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.events
      where id = event_id and visibility = 'public' and status = 'open'
    )
  );

create policy "Admins have full access to funds" on public.event_funds
  for all using (public.is_admin());

create policy "Users can view funds of their events" on public.event_funds
  for select using (public.is_event_subscriber(event_funds.event_id));

create policy "Captains and Co-Captains can manage funds" on public.event_funds
  for all using (
    public.has_event_role(event_funds.event_id, array['captain', 'co-captain'])
  );

create policy "Admins have full access to activities" on public.event_activities
  for all using (public.is_admin());

create policy "Users can view activities of their events" on public.event_activities
  for select using (public.is_event_subscriber(event_activities.event_id));

create policy "Captains and Co-Captains can insert activities" on public.event_activities
  for insert with check (
    public.has_event_role(event_activities.event_id, array['captain', 'co-captain'])
  );

-------------------------------------------------------------------------------
-- Grants
-------------------------------------------------------------------------------

grant execute on function public.update_own_profile(text, text) to authenticated;
grant execute on function public.approve_user(uuid) to authenticated;
grant execute on function public.promote_user_to_admin(uuid) to authenticated;
grant execute on function public.create_event_with_captain(text, text, text, text, date, numeric, numeric) to authenticated;
grant execute on function public.join_public_event(uuid) to authenticated;
grant execute on function public.promote_event_member_to_cocaptain(uuid, uuid) to authenticated;
grant execute on function public.transfer_event_captain(uuid, uuid) to authenticated;
grant execute on function public.demote_event_member_to_member(uuid, uuid) to authenticated;
grant execute on function public.remove_event_member(uuid, uuid) to authenticated;
grant execute on function public.upsert_event_fund_payment(uuid, uuid, numeric, integer, integer) to authenticated;
grant execute on function public.spin_random_picker(uuid, numeric) to authenticated;
