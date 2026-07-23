create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text default '',
  email text default '',
  photo_url text default '',
  role text default 'user' check (role in ('user', 'editor', 'admin', 'superadmin')),
  status text default 'active' check (status in ('active', 'banned')),
  banned_reason text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text default '',
  created_at timestamptz default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text default '',
  content text default '',
  featured_image_url text default '',
  category_id text default '',
  category_name text default '',
  category_slug text default '',
  tags text[] default '{}',
  author_id uuid references auth.users(id) on delete set null,
  author_name text default 'FTP Desk',
  status text default 'draft' check (status in ('draft', 'published')),
  is_featured boolean default false,
  is_trending boolean default false,
  views integer default 0,
  shares integer default 0,
  meta_title text default '',
  meta_description text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  published_at timestamptz
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  user_name text default '',
  user_email text default '',
  text text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'hidden', 'deleted')),
  reports_count integer default 0,
  moderation_reason text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  article_id uuid references public.articles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, article_id)
);

alter table public.comments add column if not exists moderation_reason text default '';

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  article_id uuid references public.articles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, article_id)
);

alter table public.articles add column if not exists shares integer default 0;

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  position text not null,
  type text default 'text' check (type in ('code', 'image', 'text')),
  content text default '',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.settings (
  id text primary key default 'site',
  data jsonb default '{}',
  updated_at timestamptz default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text default '',
  email text default '',
  subject text default '',
  message text not null,
  type text default 'general' check (type in ('general', 'news_tip', 'correction', 'partnership', 'advertising')),
  status text default 'new' check (status in ('new', 'read', 'resolved', 'spam')),
  admin_note text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.contact_messages add column if not exists user_id uuid references auth.users(id) on delete set null;

create table if not exists public.page_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  path text not null,
  title text default '',
  referrer text default '',
  user_agent text default '',
  language text default '',
  screen text default '',
  ip_address text default '',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.page_visits add column if not exists ip_address text default '';

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'superadmin')
    and status = 'active'
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'superadmin'
    and status = 'active'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('editor', 'admin', 'superadmin')
    and status = 'active'
  );
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.id = auth.uid() and new.role <> 'user' then
      new.role := 'user';
    end if;
    if new.id = auth.uid() and new.status <> 'active' then
      new.status := 'active';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.id = auth.uid() and not public.is_admin() then
      new.role := old.role;
      new.status := old.status;
      new.banned_reason := old.banned_reason;
    end if;
    new.updated_at := now();
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileges_trigger on public.profiles;
create trigger protect_profile_privileges_trigger
before insert or update on public.profiles
for each row execute function public.protect_profile_privileges();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, photo_url, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'user',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.comments enable row level security;
alter table public.bookmarks enable row level security;
alter table public.likes enable row level security;
alter table public.ads enable row level security;
alter table public.settings enable row level security;
alter table public.contact_messages enable row level security;
alter table public.page_visits enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles create own" on public.profiles;
create policy "profiles create own" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles update own or admin" on public.profiles;
create policy "profiles update own or admin" on public.profiles
for update using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories for select using (true);

drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "articles public read published" on public.articles;
create policy "articles public read published" on public.articles
for select using (status = 'published' or public.is_staff());

drop policy if exists "articles staff insert" on public.articles;
create policy "articles staff insert" on public.articles for insert with check (public.is_staff());

drop policy if exists "articles staff update" on public.articles;
create policy "articles staff update" on public.articles for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "articles admin delete" on public.articles;
create policy "articles admin delete" on public.articles for delete using (public.is_admin());

drop policy if exists "comments public approved" on public.comments;
create policy "comments public approved" on public.comments
for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());

drop policy if exists "comments user insert" on public.comments;
create policy "comments user insert" on public.comments
for insert with check (auth.uid() = user_id);

drop policy if exists "comments admin update" on public.comments;
create policy "comments admin update" on public.comments for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "comments admin delete" on public.comments;
create policy "comments admin delete" on public.comments for delete using (public.is_admin());

drop policy if exists "bookmarks own" on public.bookmarks;
create policy "bookmarks own" on public.bookmarks for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "likes own" on public.likes;
create policy "likes own" on public.likes for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "ads public read active" on public.ads;
create policy "ads public read active" on public.ads for select using (is_active = true or public.is_admin());

drop policy if exists "ads admin write" on public.ads;
create policy "ads admin write" on public.ads for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings public read" on public.settings;
create policy "settings public read" on public.settings for select using (true);

drop policy if exists "settings admin write" on public.settings;
create policy "settings admin write" on public.settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "contact public insert" on public.contact_messages;
drop policy if exists "contact authenticated insert" on public.contact_messages;
create policy "contact authenticated insert" on public.contact_messages
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "contact admin read" on public.contact_messages;
create policy "contact admin read" on public.contact_messages
for select using (public.is_admin());

drop policy if exists "contact admin update" on public.contact_messages;
create policy "contact admin update" on public.contact_messages
for update using (public.is_admin()) with check (public.is_admin());


drop policy if exists "contact admin delete" on public.contact_messages;
create policy "contact admin delete" on public.contact_messages
for delete using (public.is_admin());

drop policy if exists "visits public insert" on public.page_visits;
create policy "visits public insert" on public.page_visits
for insert with check (true);

drop policy if exists "visits superadmin read" on public.page_visits;
create policy "visits superadmin read" on public.page_visits
for select using (public.is_superadmin());

create table if not exists public.daily_weather_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  city text not null,
  state text default '',
  country text default 'India',
  latitude numeric,
  longitude numeric,
  temperature_max numeric,
  temperature_min numeric,
  temperature_current numeric,
  precipitation_probability integer,
  rainfall numeric,
  wind_speed numeric,
  weather_code integer,
  summary text default '',
  source text default 'Open-Meteo',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(report_date, city, country)
);

create table if not exists public.weather_locations (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  state text default '',
  country text default 'India',
  latitude numeric not null,
  longitude numeric not null,
  location_type text default 'district' check (location_type in ('district', 'city', 'state_capital', 'international')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(city, state, country)
);

alter table public.daily_weather_reports enable row level security;
alter table public.weather_locations enable row level security;

drop policy if exists "weather public read" on public.daily_weather_reports;
create policy "weather public read" on public.daily_weather_reports
for select using (true);

drop policy if exists "weather admin write" on public.daily_weather_reports;
create policy "weather admin write" on public.daily_weather_reports
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "weather locations public read" on public.weather_locations;
create policy "weather locations public read" on public.weather_locations
for select using (true);

drop policy if exists "weather locations admin write" on public.weather_locations;
create policy "weather locations admin write" on public.weather_locations
for all using (public.is_admin()) with check (public.is_admin());

insert into public.settings (id, data)
values (
  'site',
  '{"websiteName":"THE FTP NEWS","footerText":"Fresh Take Politics - independent reporting, clear context, and verified updates from Odisha for readers across India.","contactEmail":"kubulukhotei@gmail.com","contactAddress":"Odisha, India","defaultSeoTitle":"THE FTP NEWS","defaultSeoDescription":"THE FTP NEWS means Fresh Take Politics: independent political news, explainers, analysis, and public updates from Odisha and India.","founderName":"KMC7T09","founderTitle":"Founder, Full Stack Developer and Student","founderBio":"KMC7T09 is the founder of THE FTP NEWS, a student and full stack developer from Odisha, India. FTP means Fresh Take Politics. The mission is to build an independent, clear, and reader-first news platform that explains politics and public issues in simple language for people across India.\n\nAuthor name: R.C. Khotei.","authorName":"R.C. Khotei","teamText":"Editorial Desk | News verification and publishing |  | \nPolitics Desk | Fresh Take Politics coverage |  | \nCommunity Desk | Reader tips, corrections, and feedback |  | ","socialLinks":{"facebook":"","x":"","instagram":"","youtube":"","whatsapp":"","telegram":""},"logoURL":""}'::jsonb
)
on conflict (id) do nothing;

-- First admin setup after your own signup:
-- update public.profiles
-- set role = 'superadmin', status = 'active'
-- where email = 'your-email@example.com';
