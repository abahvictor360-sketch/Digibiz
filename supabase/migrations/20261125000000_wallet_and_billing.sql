-- digibiz: free business-card wallet + paid (Stripe) subscription for creating cards.

-- ---------- Subscriptions (written only by the Stripe webhook) ----------
create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  interval text check (interval in ('month', 'year')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create index subscriptions_customer_idx on public.subscriptions (stripe_customer_id);

-- Admins can give someone Pro for free.
alter table public.profiles add column comped boolean not null default false;

alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
create policy "Read own subscription or admin" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Pro = admin, comped, or a Stripe subscription that is paid up.
-- past_due keeps access while Stripe retries the card.
create or replace function public.is_pro(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user is not null and (
    exists (select 1 from public.profiles p where p.id = p_user and (p.role = 'admin' or p.comped))
    or exists (
      select 1 from public.subscriptions s
       where s.user_id = p_user
         and s.status in ('active', 'trialing', 'past_due')
         and (s.current_period_end is null or s.current_period_end > now() - interval '3 days')
    )
  );
$$;

-- Called by the stripe-webhook edge function (service role only) with a
-- Stripe Subscription object. The user id travels in subscription metadata.
create or replace function public.apply_stripe_subscription(p_sub jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  v_user := nullif(p_sub -> 'metadata' ->> 'user_id', '')::uuid;
  if v_user is null then
    select user_id into v_user from public.subscriptions
     where stripe_subscription_id = p_sub ->> 'id' or stripe_customer_id = p_sub ->> 'customer'
     limit 1;
  end if;
  if v_user is null or not exists (select 1 from public.profiles where id = v_user) then
    return null;
  end if;
  insert into public.subscriptions as s (user_id, stripe_customer_id, stripe_subscription_id, status, interval, current_period_end, cancel_at_period_end, updated_at)
  values (
    v_user,
    p_sub ->> 'customer',
    p_sub ->> 'id',
    coalesce(p_sub ->> 'status', 'incomplete'),
    p_sub -> 'items' -> 'data' -> 0 -> 'price' -> 'recurring' ->> 'interval',
    to_timestamp(coalesce(
      (p_sub ->> 'current_period_end')::bigint,
      (p_sub -> 'items' -> 'data' -> 0 ->> 'current_period_end')::bigint
    )),
    coalesce((p_sub ->> 'cancel_at_period_end')::boolean, false),
    now()
  )
  on conflict (user_id) do update set
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    status = excluded.status,
    interval = coalesce(excluded.interval, s.interval),
    current_period_end = coalesce(excluded.current_period_end, s.current_period_end),
    cancel_at_period_end = excluded.cancel_at_period_end,
    updated_at = now();
  return v_user;
end;
$$;

-- ---------- Card RPCs now require Pro ----------
create or replace function public.create_card(p_card jsonb)
returns table (id text, token text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_data jsonb;
  v_token text := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  v_id text;
begin
  if v_uid is null then
    raise exception 'Sign in to publish your card' using errcode = '42501';
  end if;
  if not public.is_pro(v_uid) then
    raise exception 'Creating cards needs a digibiz Pro subscription' using errcode = 'PT402';
  end if;
  v_data := public.sanitize_card(p_card);
  for attempt in 1..5 loop
    v_id := public.new_card_id();
    begin
      insert into public.cards (id, owner_id, data, token_hash)
      values (v_id, v_uid, v_data, encode(extensions.digest(v_token, 'sha256'), 'hex'));
      return query select v_id, v_token;
      return;
    exception when unique_violation then
      if attempt = 5 then raise; end if;
    end;
  end loop;
end;
$$;

create or replace function public.update_card(p_id text, p_card jsonb, p_token text default null)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  rec public.cards;
  v_uid uuid := (select auth.uid());
  v_now timestamptz := now();
begin
  select * into rec from public.cards c where c.id = p_id for update;
  if not found then
    raise exception 'Card not found' using errcode = 'P0002';
  end if;
  if public.is_admin() then
    null;
  elsif rec.owner_id is not null and rec.owner_id = v_uid then
    if not public.is_pro(v_uid) then
      raise exception 'Editing cards needs a digibiz Pro subscription' using errcode = 'PT402';
    end if;
  else
    raise exception 'You can''t edit that card' using errcode = '42501';
  end if;
  update public.cards set data = public.sanitize_card(p_card), updated_at = v_now where id = p_id;
  return v_now;
end;
$$;

-- Cards are public only while their owner is Pro.
create or replace function public.get_card(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', c.id, 'card', c.data, 'updatedAt', c.updated_at)
    from public.cards c
   where c.id = p_id and c.is_active and public.is_pro(c.owner_id);
$$;

create or replace function public.record_card_view(p_id text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.cards c set view_count = view_count + 1
   where c.id = p_id and c.is_active and public.is_pro(c.owner_id);
  if found then
    insert into public.card_views (card_id) values (p_id);
  end if;
end;
$$;

-- ---------- Wallet: business cards people collect (free) ----------
create table public.saved_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  title text not null default '' check (char_length(title) <= 100),
  company text not null default '' check (char_length(company) <= 100),
  phone text not null default '' check (char_length(phone) <= 60),
  email text not null default '' check (char_length(email) <= 200),
  website text not null default '' check (char_length(website) <= 200),
  address text not null default '' check (char_length(address) <= 300),
  notes text not null default '' check (char_length(notes) <= 4000),
  met_where text not null default '' check (char_length(met_where) <= 200),
  met_on date,
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  front_path text check (front_path is null or front_path like owner_id::text || '/%'),
  back_path text check (back_path is null or back_path like owner_id::text || '/%'),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index saved_contacts_owner_idx on public.saved_contacts (owner_id, updated_at desc);
create index saved_contacts_tags_idx on public.saved_contacts using gin (tags);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger saved_contacts_touch before update on public.saved_contacts
  for each row execute function public.touch_updated_at();

alter table public.saved_contacts enable row level security;
revoke all on public.saved_contacts from anon, authenticated;
grant select, insert, update, delete on public.saved_contacts to authenticated;
create policy "Own contacts: read" on public.saved_contacts for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Own contacts: add" on public.saved_contacts for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Own contacts: edit" on public.saved_contacts for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Own contacts: delete" on public.saved_contacts for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Private bucket for card photos; each user writes only under "<their id>/".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-photos', 'card-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Card photos: read own" on storage.objects for select to authenticated
  using (bucket_id = 'card-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Card photos: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'card-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Card photos: replace own" on storage.objects for update to authenticated
  using (bucket_id = 'card-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Card photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'card-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- Admin ----------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'pro', (select count(*) from public.profiles p where public.is_pro(p.id) and p.role <> 'admin'),
    'pro_paying', (select count(*) from public.subscriptions where status in ('active', 'trialing', 'past_due')),
    'mrr', (select coalesce(sum(case when interval = 'year' then 5 else 6 end), 0)
              from public.subscriptions where status in ('active', 'trialing', 'past_due')),
    'cards', (select count(*) from public.cards),
    'cards_active', (select count(*) from public.cards c where c.is_active and public.is_pro(c.owner_id)),
    'cards_anonymous', (select count(*) from public.cards where owner_id is null),
    'contacts', (select count(*) from public.saved_contacts),
    'views', (select coalesce(sum(view_count), 0) from public.cards),
    'views_7d', (select count(*) from public.card_views where viewed_at > now() - interval '7 days'),
    'messages_new', (select count(*) from public.contact_messages where status = 'new')
  );
end;
$$;

drop function public.admin_list_users();
create function public.admin_list_users()
returns table (
  id uuid, email text, full_name text, role text, created_at timestamptz,
  last_sign_in_at timestamptz, card_count bigint, view_count bigint,
  contact_count bigint, comped boolean, sub_status text, sub_interval text, sub_period_end timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
    select p.id, p.email, p.full_name, p.role, p.created_at, u.last_sign_in_at,
           (select count(*) from public.cards c where c.owner_id = p.id),
           (select coalesce(sum(c.view_count), 0)::bigint from public.cards c where c.owner_id = p.id),
           (select count(*) from public.saved_contacts sc where sc.owner_id = p.id),
           p.comped, s.status, s.interval, s.current_period_end
      from public.profiles p
      left join auth.users u on u.id = p.id
      left join public.subscriptions s on s.user_id = p.id
     order by p.created_at desc;
end;
$$;

create or replace function public.admin_set_comped(p_user_id uuid, p_comped boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  update public.profiles set comped = p_comped where id = p_user_id;
end;
$$;

-- ---------- Function privileges ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_card(text), public.record_card_view(text) to anon, authenticated;
grant execute on function public.create_card(jsonb), public.update_card(text, jsonb, text),
  public.claim_card(text, text), public.card_views_daily(integer, text),
  public.admin_stats(), public.admin_list_users(), public.admin_set_role(uuid, text),
  public.admin_set_comped(uuid, boolean), public.is_admin() to authenticated;
grant execute on function public.apply_stripe_subscription(jsonb) to service_role;
