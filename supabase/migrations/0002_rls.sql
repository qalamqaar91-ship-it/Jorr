-- Row-level security. Every table is locked by default; policies open only what is needed.
alter table user_roles enable row level security;
alter table system_state enable row level security;     -- no policies: service role only
alter table setup_attempts enable row level security;   -- no policies: service role only
alter table provinces enable row level security;
alter table cities enable row level security;
alter table educations enable row level security;
alter table professions enable row level security;
alter table marital_statuses enable row level security;
alter table app_settings enable row level security;
alter table profiles enable row level security;
alter table profile_private enable row level security;
alter table partner_prefs enable row level security;
alter table photos enable row level security;
alter table favourites enable row level security;
alter table blocks enable row level security;
alter table rishta_requests enable row level security;
alter table reports enable row level security;
alter table support_requests enable row level security;
alter table audit_log enable row level security;
alter table content_pages enable row level security;

-- roles: read own only; NO insert/update/delete policies (changes via server function only)
create policy roles_read_own on user_roles for select using (user_id = auth.uid());
create policy roles_read_admin on user_roles for select using (is_super_admin());

-- lookups: readable by everyone; editable by admins
do $$ declare t text; begin
  foreach t in array array['provinces','cities','educations','professions','marital_statuses'] loop
    execute format('create policy %I_read on %I for select using (true)', t, t);
    execute format('create policy %I_admin_write on %I for all using (is_admin()) with check (is_admin())', t, t);
  end loop;
end $$;

-- settings
create policy settings_public_read on app_settings for select using (is_public or is_admin());
create policy settings_update on app_settings for update
  using (is_admin() and (not is_secure or is_super_admin()))
  with check (is_admin() and (not is_secure or is_super_admin()));
create policy settings_insert on app_settings for insert with check (is_super_admin());

-- content pages
create policy pages_read on content_pages for select using (true);
create policy pages_write on content_pages for all using (is_admin()) with check (is_admin());

-- profiles: owner full read/update; others see approved, visible, unblocked profiles only
create policy profiles_owner_read on profiles for select using (user_id = auth.uid());
create policy profiles_owner_update on profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_admin_read on profiles for select using (is_admin());
create policy profiles_admin_update on profiles for update using (is_admin()) with check (is_admin());
create policy profiles_member_read on profiles for select using (
  auth.uid() is not null
  and status = 'approved' and visibility = 'public_members'
  and not exists (select 1 from blocks b where (b.blocker_id = auth.uid() and b.blocked_id = profiles.user_id)
                                            or (b.blocker_id = profiles.user_id and b.blocked_id = auth.uid()))
);
-- profile of a user who exchanged a request with me (requests_only visibility)
create policy profiles_request_read on profiles for select using (
  status = 'approved' and exists (select 1 from rishta_requests r
    where (r.sender_id = auth.uid() and r.receiver_id = profiles.user_id)
       or (r.receiver_id = auth.uid() and r.sender_id = profiles.user_id))
  and not exists (select 1 from blocks b where (b.blocker_id = auth.uid() and b.blocked_id = profiles.user_id)
                                            or (b.blocker_id = profiles.user_id and b.blocked_id = auth.uid()))
);
-- inserts happen only via the signup trigger; deletes cascade from auth.users

-- private data: owner only (admins deliberately excluded; use audited server functions if ever needed)
create policy private_owner_read on profile_private for select using (user_id = auth.uid());
create policy private_owner_update on profile_private for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- prevent changing date of birth to under 18 after signup
create or replace function check_adult() returns trigger language plpgsql as $$
begin
  if new.date_of_birth > (current_date - interval '18 years') then raise exception 'Must be 18 or older'; end if;
  return new;
end $$;
create trigger private_adult before insert or update on profile_private for each row execute function check_adult();

create policy prefs_owner on partner_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- photos: owner manages own rows; approval only by admins
create policy photos_owner_read on photos for select using (user_id = auth.uid());
create policy photos_owner_insert on photos for insert with check (user_id = auth.uid() and approved = false);
create policy photos_owner_delete on photos for delete using (user_id = auth.uid());
create policy photos_admin on photos for all using (is_admin()) with check (is_admin());

create policy fav_owner on favourites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy blocks_owner on blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- requests
create policy req_read on rishta_requests for select using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy req_insert on rishta_requests for insert with check (
  sender_id = auth.uid() and status = 'pending'
  and not exists (select 1 from blocks b where (b.blocker_id = receiver_id and b.blocked_id = auth.uid())
                                            or (b.blocker_id = auth.uid() and b.blocked_id = receiver_id))
  and exists (select 1 from profiles p where p.user_id = auth.uid() and p.status = 'approved')
  and exists (select 1 from profiles p where p.user_id = receiver_id and p.status = 'approved' and p.visibility <> 'hidden')
);
create policy req_update on rishta_requests for update using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy req_admin_read on rishta_requests for select using (is_admin());

-- reports & support
create policy reports_insert on reports for insert with check (reporter_id = auth.uid() and status = 'open');
create policy reports_read_own on reports for select using (reporter_id = auth.uid());
create policy reports_admin on reports for all using (is_admin()) with check (is_admin());
create policy support_insert on support_requests for insert with check (user_id = auth.uid());
create policy support_read_own on support_requests for select using (user_id = auth.uid());
create policy support_admin on support_requests for all using (is_admin()) with check (is_admin());

-- audit log: admins read; inserts only via service role / server functions
create policy audit_read on audit_log for select using (is_admin());

-- private photo bucket: no public access; owners upload into their own folder; viewing via signed URLs from server
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('photos','photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
  on conflict (id) do update set public = false;
create policy photos_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_obj_read_own on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_obj_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
