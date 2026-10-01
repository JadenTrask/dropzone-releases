-- Apex provider's initial quota is global, across all Edge Function instances.
-- This isolated gate changes no account, profile, friend or match tables.
begin;
create table if not exists public.apex_request_gate (
  id boolean primary key default true check (id),
  next_allowed_at timestamptz not null default '-infinity'
);
alter table public.apex_request_gate enable row level security;
revoke all on public.apex_request_gate from public, anon, authenticated;
insert into public.apex_request_gate(id) values(true) on conflict do nothing;

create or replace function public.reserve_apex_request(backoff_seconds integer default 0)
returns integer language plpgsql security definer set search_path = '' as $$
declare next_time timestamptz; now_time timestamptz;
begin
  if backoff_seconds is null or backoff_seconds < 0 or backoff_seconds > 300 then
    raise exception 'Invalid Apex backoff';
  end if;
  select next_allowed_at into next_time from public.apex_request_gate where id for update;
  if not found then raise exception 'Apex quota gate unavailable'; end if;
  now_time := clock_timestamp();
  if backoff_seconds > 0 then
    update public.apex_request_gate set next_allowed_at = greatest(next_allowed_at, now_time + make_interval(secs => least(backoff_seconds,300))) where id;
    return least(backoff_seconds,300);
  end if;
  if next_time > now_time then return greatest(1,ceil(extract(epoch from next_time-now_time))::integer); end if;
  update public.apex_request_gate set next_allowed_at=now_time+interval '2 seconds' where id;
  return 0;
end $$;
revoke all on function public.reserve_apex_request(integer) from public, anon, authenticated;
grant execute on function public.reserve_apex_request(integer) to service_role;
commit;
