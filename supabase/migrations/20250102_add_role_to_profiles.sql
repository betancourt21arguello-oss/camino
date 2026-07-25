alter table profiles add column if not exists role text not null default 'user';
alter table profiles add column if not exists email text;
alter table profiles add column if not exists full_name text;

grant select on profiles to authenticated;