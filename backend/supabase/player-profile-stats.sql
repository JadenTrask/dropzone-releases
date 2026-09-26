create or replace function public.save_matches(records jsonb) returns void language plpgsql security definer set search_path='' as $$
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
