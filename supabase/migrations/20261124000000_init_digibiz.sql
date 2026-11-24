-- digibiz: accounts, cards, views, contact messages, admin.
-- All writes to cards go through security-definer RPCs so card data is
-- validated in one place and anonymous (token-based) editing keeps working.

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '' check (char_length(full_name) <= 80),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------- Cards ----------
create table public.cards (
  id text primary key check (id ~ '^[a-z0-9]{6,16}$'),
  owner_id uuid references public.profiles (id) on delete cascade,
  data jsonb not null,
  name text generated always as (data ->> 'name') stored,
  is_active boolean not null default true,
  view_count integer not null default 0,
  token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cards_owner_id_idx on public.cards (owner_id);
create index cards_created_at_idx on public.cards (created_at desc);

create table public.card_views (
  id bigint generated always as identity primary key,
  card_id text not null references public.cards (id) on delete cascade,
  viewed_at timestamptz not null default now()
);
create index card_views_card_id_viewed_at_idx on public.card_views (card_id, viewed_at);
create index card_views_viewed_at_idx on public.card_views (viewed_at);

-- ---------- Contact messages ----------
create table public.contact_messages (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 200),
  topic text not null default '' check (char_length(topic) <= 60),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index contact_messages_user_id_idx on public.contact_messages (user_id);

-- ---------- Row level security ----------
alter table public.profiles enable row level security;
alter table public.cards enable row level security;
alter table public.card_views enable row level security;
alter table public.contact_messages enable row level security;

revoke all on public.profiles, public.cards, public.card_views, public.contact_messages from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
create policy "Read own profile or admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select, delete on public.cards to authenticated;
grant update (is_active) on public.cards to authenticated;
create policy "Read own cards or admin" on public.cards for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "Toggle own cards or admin" on public.cards for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()))
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "Delete own cards or admin" on public.cards for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));

grant select on public.card_views to authenticated;
create policy "Read views of own cards or admin" on public.card_views for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.cards c where c.id = card_id and c.owner_id = (select auth.uid()))
  );

grant insert (name, email, topic, message, user_id) on public.contact_messages to anon, authenticated;
grant select, delete on public.contact_messages to authenticated;
grant update (status) on public.contact_messages to authenticated;
create policy "Anyone can send a message" on public.contact_messages for insert to anon, authenticated
  with check (status = 'new' and (user_id is null or user_id = (select auth.uid())));
create policy "Admins read messages" on public.contact_messages for select to authenticated
  using ((select public.is_admin()));
create policy "Admins update messages" on public.contact_messages for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete messages" on public.contact_messages for delete to authenticated
  using ((select public.is_admin()));

-- ---------- Card helpers ----------
create or replace function public.sanitize_card(p jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  limits constant jsonb := '{"name":60,"title":60,"company":60,"bio":160,"phone":40,"email":100,"website":120,"location":80}';
  socials constant text[] := array['linkedin','x','instagram','facebook','tiktok','youtube','github','whatsapp'];
  themes constant text[] := array['glass','lime','midnight','peach','mono'];
  out jsonb := '{}';
  soc jsonb := '{}';
  k text;
  v text;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'Card data is missing' using errcode = '22023';
  end if;
  for k in select jsonb_object_keys(limits) loop
    v := case when jsonb_typeof(p -> k) = 'string' then btrim(p ->> k) else '' end;
    out := out || jsonb_build_object(k, left(v, (limits ->> k)::int));
  end loop;
  if out ->> 'name' = '' then
    raise exception 'Add your name before publishing' using errcode = '22023';
  end if;
  out := out || jsonb_build_object('theme', case when p ->> 'theme' = any (themes) then p ->> 'theme' else 'glass' end);
  v := case when jsonb_typeof(p -> 'avatar') = 'string' then p ->> 'avatar' else '' end;
  if v <> '' and (v !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' or char_length(v) > 120000) then
    raise exception 'Photo must be a JPEG, PNG or WebP under 90 KB' using errcode = '22023';
  end if;
  out := out || jsonb_build_object('avatar', v);
  if jsonb_typeof(p -> 'socials') = 'object' then
    foreach k in array socials loop
      if jsonb_typeof(p -> 'socials' -> k) = 'string' and btrim(p -> 'socials' ->> k) <> '' then
        soc := soc || jsonb_build_object(k, left(btrim(p -> 'socials' ->> k), 120));
      end if;
    end loop;
  end if;
  return out || jsonb_build_object('socials', soc);
end;
$$;

create or replace function public.new_card_id()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alpha constant text := 'abcdefghijkmnpqrstuvwxyz23456789';
  b bytea := extensions.gen_random_bytes(8);
  s text := '';
begin
  for i in 0..7 loop
    s := s || substr(alpha, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return s;
end;
$$;

-- Create a card. Signed-in users own it; everyone also gets an edit token
-- (kept in their browser) so anonymous publishing still works.
create or replace function public.create_card(p_card jsonb)
returns table (id text, token text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_data jsonb := public.sanitize_card(p_card);
  v_token text := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  v_id text;
begin
  for attempt in 1..5 loop
    v_id := public.new_card_id();
    begin
      insert into public.cards (id, owner_id, data, token_hash)
      values (v_id, (select auth.uid()), v_data, encode(extensions.digest(v_token, 'sha256'), 'hex'));
      return query select v_id, v_token;
      return;
    exception when unique_violation then
      if attempt = 5 then raise; end if;
    end;
  end loop;
end;
$$;

-- Update a card: owner, admin, or anyone holding its edit token.
create or replace function public.update_card(p_id text, p_card jsonb, p_token text default null)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  rec public.cards;
  v_now timestamptz := now();
begin
  select * into rec from public.cards c where c.id = p_id for update;
  if not found then
    raise exception 'Card not found' using errcode = 'P0002';
  end if;
  if not (
    (rec.owner_id is not null and rec.owner_id = (select auth.uid()))
    or public.is_admin()
    or (p_token is not null and rec.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex'))
  ) then
    raise exception 'You can''t edit that card' using errcode = '42501';
  end if;
  update public.cards set data = public.sanitize_card(p_card), updated_at = v_now where id = p_id;
  return v_now;
end;
$$;

-- Attach a card published anonymously from this browser to the signed-in account.
create or replace function public.claim_card(p_id text, p_token text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  update public.cards
     set owner_id = (select auth.uid())
   where id = p_id and owner_id is null
     and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  return found;
end;
$$;

-- Public card lookup. Returns null for missing or disabled cards.
create or replace function public.get_card(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', c.id, 'card', c.data, 'updatedAt', c.updated_at)
    from public.cards c where c.id = p_id and c.is_active;
$$;

create or replace function public.record_card_view(p_id text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.cards set view_count = view_count + 1 where id = p_id and is_active;
  if found then
    insert into public.card_views (card_id) values (p_id);
  end if;
end;
$$;

-- Daily views for the caller's cards (or every card for admins), via RLS.
create or replace function public.card_views_daily(p_days integer default 30, p_card_id text default null)
returns table (day date, views bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select d::date as day, count(v.id) as views
    from generate_series((current_date - (least(greatest(p_days, 1), 365) - 1))::timestamptz, current_date::timestamptz, interval '1 day') d
    left join public.card_views v
      on v.viewed_at >= d and v.viewed_at < d + interval '1 day'
     and (p_card_id is null or v.card_id = p_card_id)
   group by d
   order by d;
$$;

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
    'cards', (select count(*) from public.cards),
    'cards_active', (select count(*) from public.cards where is_active),
    'cards_anonymous', (select count(*) from public.cards where owner_id is null),
    'views', (select coalesce(sum(view_count), 0) from public.cards),
    'views_7d', (select count(*) from public.card_views where viewed_at > now() - interval '7 days'),
    'messages_new', (select count(*) from public.contact_messages where status = 'new')
  );
end;
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid, email text, full_name text, role text, created_at timestamptz,
  last_sign_in_at timestamptz, card_count bigint, view_count bigint
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
           count(c.id), coalesce(sum(c.view_count), 0)::bigint
      from public.profiles p
      left join auth.users u on u.id = p.id
      left join public.cards c on c.owner_id = p.id
     group by p.id, u.last_sign_in_at
     order by p.created_at desc;
end;
$$;

create or replace function public.admin_set_role(p_user_id uuid, p_role text)
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
  if p_role not in ('user', 'admin') then
    raise exception 'Unknown role' using errcode = '22023';
  end if;
  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'You can''t remove your own admin role' using errcode = '22023';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

-- ---------- Function privileges ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_card(text), public.record_card_view(text),
  public.create_card(jsonb), public.update_card(text, jsonb, text) to anon, authenticated;
grant execute on function public.claim_card(text, text), public.card_views_daily(integer, text),
  public.admin_stats(), public.admin_list_users(), public.admin_set_role(uuid, text),
  public.is_admin() to authenticated;
