-- Jorr schema, phase 2. Run in order. Review before applying to production.
create extension if not exists pgcrypto;

create type app_role as enum ('user','moderator','super_admin');
create type profile_status as enum ('pending','approved','rejected','suspended');
create type request_status as enum ('pending','accepted','rejected','withdrawn');
create type visibility as enum ('public_members','requests_only','hidden');

-- ---------- roles (writable only via service role) ----------
create table user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'user',
  updated_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role in ('moderator','super_admin'));
$$;
create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin');
$$;

-- ---------- one-time setup state (no client policies at all) ----------
create table system_state (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
insert into system_state values ('admin_setup_completed', 'false');
create table setup_attempts (id bigserial primary key, attempted_at timestamptz not null default now());

-- ---------- lookup tables (admin-editable) ----------
create table provinces (id serial primary key, name_en text not null unique, name_ur text, active boolean not null default true);
create table cities (id serial primary key, province_id int not null references provinces(id), name_en text not null, name_ur text, active boolean not null default true, unique (province_id, name_en));
create table educations (id serial primary key, name_en text not null unique, name_ur text, sort int not null default 0, active boolean not null default true);
create table professions (id serial primary key, name_en text not null unique, name_ur text, active boolean not null default true);
create table marital_statuses (id serial primary key, name_en text not null unique, name_ur text, active boolean not null default true);

insert into provinces (name_en, name_ur) values
 ('Punjab','پنجاب'),('Sindh','سندھ'),('Khyber Pakhtunkhwa','خیبر پختونخوا'),('Balochistan','بلوچستان'),
 ('Islamabad Capital Territory','وفاقی دارالحکومت'),('Azad Jammu & Kashmir','آزاد جموں و کشمیر'),('Gilgit-Baltistan','گلگت بلتستان');
insert into marital_statuses (name_en, name_ur) values ('Never married','غیر شادی شدہ'),('Divorced','طلاق یافتہ'),('Widowed','بیوہ/رنڈوا');
insert into educations (name_en, name_ur, sort) values ('Matric',null,1),('Intermediate',null,2),('Bachelor''s',null,3),('Master''s',null,4),('Doctorate',null,5);

-- ---------- settings ----------
create table app_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,   -- readable by anonymous visitors
  is_secure boolean not null default false,   -- only super_admin may change
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into app_settings (key, value, is_public, is_secure) values
 ('app_name','"Jorr"',true,false), ('app_name_ur','"جوڑ"',true,false), ('logo_url','null',true,false),
 ('maintenance_mode','false',true,false), ('premium_enabled','false',true,true),
 ('max_requests_per_day','10',false,false), ('max_photos','5',false,false), ('max_photo_mb','5',false,false),
 ('require_profile_approval','true',false,false);

-- ---------- profiles ----------
-- public-facing fields (still only visible to authorised viewers, see RLS)
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  gender text check (gender in ('male','female')),
  province_id int references provinces(id),
  city_id int references cities(id),
  country text not null default 'Pakistan',
  education_id int references educations(id),
  profession_id int references professions(id),
  marital_status_id int references marital_statuses(id),
  languages text[] not null default '{}',
  about text check (char_length(about) <= 1500),
  family_intro text check (char_length(family_intro) <= 1500),
  religious_prefs text check (char_length(religious_prefs) <= 500),
  show_age boolean not null default true,
  visibility visibility not null default 'requests_only',
  profile_photo_path text,
  status profile_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- private data: never exposed to other members
create table profile_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  date_of_birth date not null,
  phone text,
  consent_accepted_at timestamptz,
  deletion_requested_at timestamptz
);
create table partner_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_min int check (age_min >= 18), age_max int check (age_max <= 100),
  province_ids int[] not null default '{}', education_ids int[] not null default '{}',
  marital_status_ids int[] not null default '{}', notes text check (char_length(notes) <= 1000)
);
create table photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- interactions ----------
create table favourites (
  user_id uuid references auth.users(id) on delete cascade,
  target_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id), check (user_id <> target_id)
);
create table blocks (
  blocker_id uuid references auth.users(id) on delete cascade,
  blocked_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id), check (blocker_id <> blocked_id)
);
create table rishta_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status request_status not null default 'pending',
  message text check (char_length(message) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> receiver_id), unique (sender_id, receiver_id)
);
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  photo_id uuid references photos(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  handled_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null default 'support' check (kind in ('support','deletion')),
  body text not null check (char_length(body) <= 3000),
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create table audit_log (
  id bigserial primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null, target text, details jsonb,   -- never store passwords, OTPs or tokens
  created_at timestamptz not null default now()
);
create table content_pages (
  slug text primary key, title_en text not null, title_ur text,
  body_en text not null default '', body_ur text, updated_at timestamptz not null default now()
);
insert into content_pages (slug, title_en, body_en) values
 ('privacy','Privacy Policy','DRAFT - requires legal review in Pakistan.'),
 ('terms','Terms of Service','DRAFT - requires legal review in Pakistan.'),
 ('community','Community Guidelines','DRAFT'),('safety','Safety Guidelines','DRAFT'),
 ('contact','Contact and Support','DRAFT'),('deletion','Account and Data Deletion','DRAFT');

-- ---------- triggers ----------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare dob date := nullif(new.raw_user_meta_data->>'dob','')::date;
begin
  if dob is null or dob > (current_date - interval '18 years') then
    raise exception 'Registration requires age 18 or older';
  end if;
  if coalesce(new.raw_user_meta_data->>'consent','false') <> 'true' then
    raise exception 'Consent is required';
  end if;
  insert into profiles (user_id, display_name)
    values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Member'),60));
  insert into profile_private (user_id, date_of_birth, consent_accepted_at) values (new.id, dob, now());
  insert into user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- members may not change moderation fields or escalate; admins may change status
create or replace function protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and not is_admin() and (auth.role() <> 'service_role') then
    new.status := old.status;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on profiles for each row execute function protect_profile_fields();

-- members may only withdraw (sender) or accept/reject (receiver) a pending request
create or replace function guard_request_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.sender_id := old.sender_id; new.receiver_id := old.receiver_id; new.message := old.message;
  new.updated_at := now();
  if old.status <> 'pending' then raise exception 'Request already resolved'; end if;
  if auth.uid() = old.sender_id and new.status <> 'withdrawn' then raise exception 'Senders may only withdraw'; end if;
  if auth.uid() = old.receiver_id and new.status not in ('accepted','rejected') then raise exception 'Receivers may only accept or reject'; end if;
  return new;
end $$;
create trigger requests_guard before update on rishta_requests for each row execute function guard_request_update();
