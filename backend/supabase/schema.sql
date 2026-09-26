-- Run in a new Supabase project's SQL editor. No service-role key belongs in the desktop app.
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 handle text not null unique check (handle ~ '^[a-z0-9_]{3,24}$'),
 display_name text not null default '' check(length(display_name)<=40),
 avatar text check(avatar is null or (length(avatar)<200000 and avatar ~ '^data:image/png;base64,[A-Za-z0-9+/=]+$')),
 share_stats boolean not null default false
);
create table public.friendships (
 requester uuid references public.profiles on delete cascade,
 recipient uuid references public.profiles on delete cascade,
 accepted boolean not null default false, created_at timestamptz not null default now(),
 primary key(requester,recipient), check(requester<>recipient)
);
create unique index one_friendship on public.friendships(least(requester,recipient),greatest(requester,recipient));
create table public.match_records (
 owner uuid references public.profiles on delete cascade,
 match_id text check(length(match_id) between 1 and 160), played_at timestamptz not null,
 won boolean not null, stats jsonb not null check(jsonb_typeof(stats)='object' and pg_column_size(stats)<4096),
 primary key(owner,match_id)
);
create index match_records_date on public.match_records(owner,played_at desc);
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.match_records enable row level security;
revoke all on public.profiles,public.friendships,public.match_records from anon,authenticated;
grant select on public.profiles,public.friendships,public.match_records to authenticated;
grant update(display_name,avatar,share_stats) on public.profiles to authenticated;
grant update(accepted) on public.friendships to authenticated;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or exists(select 1 from public.friendships f where (f.requester=auth.uid() and f.recipient=id) or (f.recipient=auth.uid() and f.requester=id)));
create policy profile_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy friendship_read on public.friendships for select to authenticated using(auth.uid() in (requester,recipient));
create policy friendship_accept on public.friendships for update to authenticated using(recipient=auth.uid()) with check(recipient=auth.uid());
create policy match_read on public.match_records for select to authenticated using(owner=auth.uid() or (played_at>now()-interval '365 days' and exists(select 1 from public.profiles p where p.id=owner and p.share_stats) and exists(select 1 from public.friendships f where f.accepted and ((f.requester=auth.uid() and f.recipient=owner) or (f.recipient=auth.uid() and f.requester=owner)))));
create function public.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,handle) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'handle',''),'player_'||substr(replace(new.id::text,'-',''),1,16)));return new;end;$$;
create trigger on_signup after insert on auth.users for each row execute function public.create_profile();
create function public.request_friend(friend_handle text) returns void language plpgsql security definer set search_path='' as $$
declare other uuid;begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 if (select count(*) from public.friendships where requester=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception 'Please wait before sending more requests';end if;
 select id into other from public.profiles where handle=friend_handle;
 if other is null or other=auth.uid() then raise exception 'Username not available';end if;
 insert into public.friendships(requester,recipient) values(auth.uid(),other) on conflict do nothing;
end;$$;
create function public.list_friends() returns table(id uuid,handle text,display_name text,avatar text,accepted boolean,incoming boolean) language sql security invoker set search_path='' as $$
 select p.id,p.handle,p.display_name,p.avatar,f.accepted,f.recipient=auth.uid() from public.friendships f join public.profiles p on p.id=case when f.requester=auth.uid() then f.recipient else f.requester end where auth.uid() in (f.requester,f.recipient);
$$;
create function public.remove_friend(other_id uuid) returns void language sql security definer set search_path='' as $$delete from public.friendships where (requester=auth.uid() and recipient=other_id) or (recipient=auth.uid() and requester=other_id);$$;
create function public.save_matches(records jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r jsonb;clean jsonb;begin
 if auth.uid() is null or jsonb_typeof(records)<>'array' or jsonb_array_length(records)>100 then raise exception 'Invalid batch';end if;
 for r in select * from jsonb_array_elements(records) loop
 if (r->>'played_at')::timestamptz<now()-interval '365 days' then continue;end if;
 if (r->>'played_at')::timestamptz>now()+interval '5 minutes' then raise exception 'Invalid match date';end if;
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into clean from jsonb_each(r->'stats') where key in ('Score','Goals','Assists','Saves','Shots','Touches','CarTouches','Demos','EpicSaves','CrossbarHits','TimesDemolished','Overtime','TeamScore','OpponentScore','PlaylistId') and jsonb_typeof(value)='number' and (value::text)::numeric between 0 and 1000000;
 insert into public.match_records(owner,match_id,played_at,won,stats) values(auth.uid(),r->>'match_id',(r->>'played_at')::timestamptz,(r->>'won')::boolean,clean) on conflict(owner,match_id) do update set stats=public.match_records.stats||excluded.stats,won=excluded.won;
 end loop;
 delete from public.match_records where owner=auth.uid() and played_at<now()-interval '365 days';
end;$$;
create function public.delete_my_account() returns void language sql security definer set search_path='' as $$delete from auth.users where id=auth.uid();$$;
revoke execute on function public.create_profile(),public.request_friend(text),public.list_friends(),public.remove_friend(uuid),public.save_matches(jsonb),public.delete_my_account() from public,anon;
grant execute on function public.request_friend(text),public.list_friends(),public.remove_friend(uuid),public.save_matches(jsonb),public.delete_my_account() to authenticated;
-- Daily cleanup includes inactive accounts. Verified active in the hosted project.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('dropzone-year-retention','15 3 * * *', $$delete from public.match_records where played_at < now() - interval '365 days'$$);
