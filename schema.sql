-- Run in the Supabase SQL editor once for this site.
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phrase text not null check (char_length(trim(phrase)) between 1 and 300),
  meaning text not null check (char_length(trim(meaning)) between 1 and 500),
  created_on date not null default (timezone('Asia/Seoul', now()))::date,
  created_at timestamptz not null default now(),
  next_review_at timestamptz not null default now(),
  review_step smallint not null default 0 check (review_step between 0 and 5)
);

create index if not exists cards_user_created_idx on public.cards (user_id, created_at desc);
create index if not exists cards_user_review_idx on public.cards (user_id, next_review_at);

alter table public.cards enable row level security;
revoke all on public.cards from anon, authenticated;
grant select, insert, update, delete on public.cards to authenticated;

create policy "Users can read their own cards"
  on public.cards for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own cards"
  on public.cards for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can edit their own cards"
  on public.cards for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own cards"
  on public.cards for delete to authenticated
  using ((select auth.uid()) = user_id);
