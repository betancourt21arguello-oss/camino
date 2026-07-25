alter table profiles add column if not exists role text not null default 'user';

grant select on profiles to authenticated;