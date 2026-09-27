-- Daily, per-installation snapshots make repeated uploads idempotent.
create table if not exists public.player_playtime (
 owner uuid not null references public.profiles on delete cascade,
 source uuid not null,
 day bigint not null check(day % 86400000 = 0),
 kind text not null check(kind in ('ranked','casual','private','freeplay')),
 seconds double precision not null check(seconds >= 0 and seconds <= 86400),
 primary key(owner,source,day,kind)
);
alter table public.player_playtime enable row level security;
revoke all on public.player_playtime from anon,authenticated;
grant select on public.player_playtime to authenticated;
drop policy if exists playtime_read on public.player_playtime;
create policy playtime_read on public.player_playtime for select to authenticated using (
 owner=auth.uid() or (
 day >= (extract(epoch from now()-interval '365 days')*1000)::bigint
 and exists(select 1 from public.profiles p where p.id=owner and p.share_stats)
 and exists(select 1 from public.friendships f where f.accepted and
 ((f.requester=auth.uid() and f.recipient=owner) or (f.recipient=auth.uid() and f.requester=owner)))
 ));
create or replace function public.save_playtime(source_id uuid,records jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare r jsonb; d bigint; s double precision; k text;
begin
 if auth.uid() is null or source_id is null or records is null or jsonb_typeof(records)<>'array' or jsonb_array_length(records)>100 then raise exception 'Invalid batch'; end if;
 for r in select * from jsonb_array_elements(records) loop
  d=(r->>'day')::bigint; s=(r->>'seconds')::double precision; k=r->>'kind';
  if d is null or d%86400000<>0 or s is null or s<0 or s>86400 or k is null or k not in ('ranked','casual','private','freeplay') then raise exception 'Invalid playtime'; end if;
  if d < floor(extract(epoch from now()-interval '365 days')/86400)*86400000 then continue; end if;
  if d > floor(extract(epoch from now())/86400)*86400000 then raise exception 'Invalid day'; end if;
  insert into public.player_playtime(owner,source,day,kind,seconds) values(auth.uid(),source_id,d,k,s)
  on conflict(owner,source,day,kind) do update set seconds=greatest(public.player_playtime.seconds,excluded.seconds);
 end loop;
end;$$;
revoke execute on function public.save_playtime(uuid,jsonb) from public,anon;
grant execute on function public.save_playtime(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
