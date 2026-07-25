create or replace function active_prayer_rooms()
returns table (
  session_id uuid,
  devotion_id text,
  participants bigint,
  started_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id as session_id,
    s.devotion_id,
    count(p.id) as participants,
    s.started_at
  from sessions s
  left join participants p on p.session_id = s.id and p.left_at is null
  where s.ended_at is null
  group by s.id, s.devotion_id, s.started_at
  order by participants desc, s.started_at asc;
$$;

grant execute on function active_prayer_rooms() to authenticated;
grant execute on function active_prayer_rooms() to anon;
