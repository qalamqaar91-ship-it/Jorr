-- Phase 3: admin photo review, request rate limit, audit inserts. Run after 0002.
create policy photos_obj_read_admin on storage.objects for select to authenticated
  using (bucket_id = 'photos' and is_admin());
create policy audit_insert_admin on audit_log for insert with check (is_admin() and actor_id = auth.uid());

create or replace function limit_requests() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int := coalesce((select (value)::text::int from app_settings where key = 'max_requests_per_day'), 10);
begin
  if (select count(*) from rishta_requests where sender_id = new.sender_id and created_at > now() - interval '24 hours') >= lim then
    raise exception 'Daily request limit reached';
  end if;
  return new;
end $$;
create trigger requests_limit before insert on rishta_requests for each row execute function limit_requests();
