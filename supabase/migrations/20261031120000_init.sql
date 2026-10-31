-- Lekhetho Buddy schema and row level security.
-- Apply on a Supabase project (auth.users must exist):
--   supabase db push
-- OpenAI keys do not belong in this file. The service-role key must stay off the client.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_officer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'officer'
  );
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null check (char_length(trim(first_name)) between 1 and 60),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'st')),
  role text not null default 'owner' check (role in ('owner', 'officer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  kind text not null check (kind in ('shop', 'salon', 'food', 'taxi', 'clothing', 'services', 'other')),
  kind_other text,
  location text not null check (char_length(trim(location)) between 2 and 80),
  activity_type text not null check (activity_type in ('permanent', 'seasonal', 'occasional')),
  registered text not null check (registered in ('yes', 'no', 'not_sure')),
  has_tin text not null check (has_tin in ('yes', 'no', 'not_sure')),
  record_method text not null check (record_method in ('notebook', 'phone', 'spreadsheet', 'none', 'other')),
  record_method_other text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'st')),
  share_summary_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_kind_other check (kind <> 'other' or char_length(trim(coalesce(kind_other, ''))) > 0),
  constraint businesses_record_other check (record_method <> 'other' or char_length(trim(coalesce(record_method_other, ''))) > 0)
);

-- Phone numbers are not on businesses, so an officer select on that table cannot read them.
create table public.business_contacts (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  phone text,
  contact_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_requires_consent check (phone is null or contact_consent)
);

create table public.sales_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  entry_date date not null,
  note text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  entry_date date not null,
  category text not null check (category in ('stock', 'transport', 'rent', 'utilities', 'wages', 'other')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journey_steps (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  step_key text not null,
  sort_order integer not null,
  title_en text not null,
  title_st text not null,
  explanation_en text not null,
  explanation_st text not null,
  status text not null check (status in ('not_started', 'in_progress', 'completed', 'needs_assistance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, step_key)
);

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  payload jsonb,
  created_at timestamptz not null default now(),
  constraint chat_payload_shape check (
    payload is null
    or (
      jsonb_typeof(payload -> 'answer') = 'string'
      and jsonb_typeof(payload -> 'needs_human_help') = 'boolean'
      and jsonb_typeof(payload -> 'next_steps') = 'array'
      and jsonb_typeof(payload -> 'sources') = 'array'
    )
  )
);

comment on table public.chat_messages is
  'Prototype retention: delete messages older than 18 months in a scheduled job once Supabase is connected.';

create sequence public.help_reference_seq start 2000;

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  topic text not null check (topic in ('registration', 'records', 'filing', 'payments', 'understanding', 'other')),
  description text not null check (char_length(description) between 1 and 4000),
  language text not null check (language in ('en', 'st')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  reference_number text not null unique default ('LB-' || lpad(nextval('public.help_reference_seq')::text, 4, '0')),
  assignee_id uuid references public.profiles (id),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint help_resolution_when_resolved check (
    status <> 'resolved' or (resolution is not null and char_length(trim(resolution)) > 0)
  )
);

create table public.officer_notes (
  id uuid primary key default gen_random_uuid(),
  help_request_id uuid not null references public.help_requests (id) on delete cascade,
  officer_id uuid not null references public.profiles (id),
  body text not null check (char_length(body) between 1 and 4000),
  action text not null check (action in ('note', 'assign', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

create index sales_entries_owner_date_idx on public.sales_entries (owner_id, entry_date);
create index expense_entries_owner_date_idx on public.expense_entries (owner_id, entry_date);
create index help_requests_status_topic_idx on public.help_requests (status, topic);
create index officer_notes_request_idx on public.officer_notes (help_request_id, created_at);
create index chat_messages_session_idx on public.chat_messages (session_id, created_at);

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger businesses_updated_at before update on public.businesses
for each row execute function public.set_updated_at();
create trigger contacts_updated_at before update on public.business_contacts
for each row execute function public.set_updated_at();
create trigger sales_updated_at before update on public.sales_entries
for each row execute function public.set_updated_at();
create trigger expenses_updated_at before update on public.expense_entries
for each row execute function public.set_updated_at();
create trigger journey_updated_at before update on public.journey_steps
for each row execute function public.set_updated_at();
create trigger chat_sessions_updated_at before update on public.chat_sessions
for each row execute function public.set_updated_at();
create trigger help_requests_updated_at before update on public.help_requests
for each row execute function public.set_updated_at();

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Profile id cannot be changed';
  end if;
  if new.role is distinct from old.role and current_user = 'authenticated' then
    raise exception 'Only an administrator can change a user role';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.prevent_profile_role_change();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, preferred_language, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''), 'Friend'),
    case when new.raw_user_meta_data ->> 'preferred_language' = 'st' then 'st' else 'en' end,
    'owner'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.business_record_summary(target uuid)
returns table (
  sales_this_month numeric,
  expenses_this_month numeric,
  net_record_summary numeric,
  days_with_records integer,
  month_label text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  month_start date;
  sales_total numeric;
  expenses_total numeric;
  recorded_days integer;
begin
  if not (
    exists (
      select 1 from public.businesses b
      where b.id = target and b.owner_id = auth.uid()
    )
    or (
      public.is_officer()
      and exists (
        select 1 from public.businesses b
        where b.id = target and b.share_summary_consent
      )
    )
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  month_start := date_trunc('month', timezone('Africa/Maseru', now()))::date;

  select coalesce(sum(amount), 0) into sales_total
  from public.sales_entries
  where business_id = target
    and entry_date >= month_start
    and entry_date < (month_start + interval '1 month')::date;

  select coalesce(sum(amount), 0) into expenses_total
  from public.expense_entries
  where business_id = target
    and entry_date >= month_start
    and entry_date < (month_start + interval '1 month')::date;

  select count(distinct entry_date)::integer into recorded_days
  from (
    select entry_date from public.sales_entries
    where business_id = target
      and entry_date >= month_start
      and entry_date < (month_start + interval '1 month')::date
    union
    select entry_date from public.expense_entries
    where business_id = target
      and entry_date >= month_start
      and entry_date < (month_start + interval '1 month')::date
  ) days;

  return query
  select
    sales_total,
    expenses_total,
    sales_total - expenses_total,
    recorded_days,
    to_char(month_start, 'FMMonth YYYY');
end;
$$;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_contacts enable row level security;
alter table public.sales_entries enable row level security;
alter table public.expense_entries enable row level security;
alter table public.journey_steps enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.help_requests enable row level security;
alter table public.officer_notes enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_officer());

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy businesses_select on public.businesses
for select to authenticated
using (owner_id = auth.uid() or public.is_officer());

create policy businesses_insert on public.businesses
for insert to authenticated
with check (owner_id = auth.uid() and not public.is_officer());

create policy businesses_update on public.businesses
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid() and not public.is_officer());

create policy businesses_delete on public.businesses
for delete to authenticated
using (owner_id = auth.uid() and not public.is_officer());

create policy contacts_owner on public.business_contacts
for all to authenticated
using (owner_id = auth.uid() and not public.is_officer())
with check (owner_id = auth.uid() and not public.is_officer());

create policy sales_owner on public.sales_entries
for all to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and not public.is_officer()
  and exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = auth.uid()
  )
);

create policy expenses_owner on public.expense_entries
for all to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and not public.is_officer()
  and exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = auth.uid()
  )
);

create policy journey_owner on public.journey_steps
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid() and not public.is_officer());

create policy chat_sessions_owner on public.chat_sessions
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid() and not public.is_officer());

create policy chat_messages_owner on public.chat_messages
for all to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.chat_sessions s
    where s.id = session_id and s.owner_id = auth.uid()
  )
);

create policy help_select on public.help_requests
for select to authenticated
using (owner_id = auth.uid() or public.is_officer());

create policy help_insert_owner on public.help_requests
for insert to authenticated
with check (
  owner_id = auth.uid()
  and not public.is_officer()
  and status = 'open'
  and assignee_id is null
  and resolution is null
  and exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = auth.uid()
  )
);

create policy help_update_officer on public.help_requests
for update to authenticated
using (public.is_officer())
with check (public.is_officer());

create policy notes_select_officer on public.officer_notes
for select to authenticated
using (public.is_officer());

create policy notes_insert_officer on public.officer_notes
for insert to authenticated
with check (public.is_officer() and officer_id = auth.uid());

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.businesses from anon, authenticated;
revoke all on table public.business_contacts from anon, authenticated;
revoke all on table public.sales_entries from anon, authenticated;
revoke all on table public.expense_entries from anon, authenticated;
revoke all on table public.journey_steps from anon, authenticated;
revoke all on table public.chat_sessions from anon, authenticated;
revoke all on table public.chat_messages from anon, authenticated;
revoke all on table public.help_requests from anon, authenticated;
revoke all on table public.officer_notes from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.businesses to authenticated;
grant select, insert, update, delete on table public.business_contacts to authenticated;
grant select, insert, update, delete on table public.sales_entries to authenticated;
grant select, insert, update, delete on table public.expense_entries to authenticated;
grant select, insert, update, delete on table public.journey_steps to authenticated;
grant select, insert, update, delete on table public.chat_sessions to authenticated;
grant select, insert, update, delete on table public.chat_messages to authenticated;
grant select, insert, update on table public.help_requests to authenticated;
grant select, insert on table public.officer_notes to authenticated;

revoke all on sequence public.help_reference_seq from anon, authenticated;
grant usage, select on sequence public.help_reference_seq to authenticated;

revoke all on function public.is_officer() from public, anon;
grant execute on function public.is_officer() to authenticated;

revoke all on function public.business_record_summary(uuid) from public, anon;
grant execute on function public.business_record_summary(uuid) to authenticated;

-- Promote an officer only with a database role other than `authenticated`
-- (the SQL editor or service role), after that person has a profile:
--   update public.profiles set role = 'officer' where email = 'officer@example.com';
-- Self-service sign-up always inserts role 'owner' and cannot change it.
