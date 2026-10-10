-- EuFluente: schema inicial do banco Supabase/PostgreSQL.
-- Execute este arquivo completo no SQL Editor do projeto Supabase.

create extension if not exists pgcrypto;

create table if not exists public.sections (
  id text primary key,
  label text not null,
  description text not null default '',
  kind text not null check (kind in ('vocabulary', 'content')),
  position integer not null,
  icon text not null default 'book-open',
  created_at timestamptz not null default now()
);

insert into public.sections (id, label, description, kind, position, icon)
values
  ('contents', 'Conteúdos', 'Gramática, estruturas e regras', 'content', 1, 'book-open-check'),
  ('verbs', 'Verbos', 'Ações e formas verbais', 'vocabulary', 2, 'repeat-2'),
  ('nouns', 'Substantivos', 'Pessoas, objetos e ideias', 'vocabulary', 3, 'shapes'),
  ('adjectives', 'Adjetivos', 'Características e qualidades', 'vocabulary', 4, 'sparkles'),
  ('adverbs', 'Advérbios', 'Tempo, frequência e intensidade', 'vocabulary', 5, 'gauge'),
  ('prepositions', 'Preposições', 'Tempo, lugar, direção e relações', 'vocabulary', 6, 'map-pin'),
  ('phrasal-verbs', 'Phrasal verbs', 'Verbos combinados com partículas', 'vocabulary', 7, 'combine'),
  ('expressions', 'Expressões', 'Frases e combinações frequentes', 'vocabulary', 8, 'messages-square')
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  kind = excluded.kind,
  position = excluded.position,
  icon = excluded.icon;

create table if not exists public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  section_key text not null references public.sections(id),
  word text not null check (length(trim(word)) > 0),
  translation text not null check (length(trim(translation)) > 0),
  base_form text,
  past_simple text,
  past_participle text,
  mastery_level smallint not null default 0 check (mastery_level between 0 and 3),
  past_mastery_level smallint not null default 0 check (past_mastery_level between 0 and 3),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vocabulary_section_must_be_vocabulary check (section_key <> 'contents')
);

-- Evita duplicatas ignorando diferenças de maiúsculas/minúsculas e espaços externos.
create unique index if not exists vocabulary_items_user_section_word_unique
  on public.vocabulary_items (user_id, section_key, lower(trim(word)));
create index if not exists vocabulary_items_user_section_idx
  on public.vocabulary_items (user_id, section_key);

create table if not exists public.learning_contents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  section_key text not null default 'contents' references public.sections(id) check (section_key = 'contents'),
  title text not null check (length(trim(title)) > 0),
  content_area text not null default 'Geral',
  notes text,
  mastery_level smallint not null default 0 check (mastery_level between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists learning_contents_user_title_unique
  on public.learning_contents (user_id, lower(trim(title)));

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  overall_word_goal integer not null default 1000 check (overall_word_goal > 0),
  section_goals jsonb not null default '{"contents":53,"verbs":200,"nouns":300,"adjectives":200,"adverbs":100,"prepositions":80,"phrasal-verbs":150,"expressions":150}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vocabulary_items_set_updated_at on public.vocabulary_items;
create trigger vocabulary_items_set_updated_at
before update on public.vocabulary_items
for each row execute function public.set_updated_at();

drop trigger if exists learning_contents_set_updated_at on public.learning_contents;
create trigger learning_contents_set_updated_at
before update on public.learning_contents
for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create or replace function public.create_eu_fluente_user_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_eu_fluente on auth.users;
create trigger on_auth_user_created_eu_fluente
after insert on auth.users
for each row execute function public.create_eu_fluente_user_settings();

-- Também cria as configurações padrão para contas que já existiam antes da migration.
insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.sections enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.learning_contents enable row level security;
alter table public.user_settings enable row level security;

grant select on public.sections to authenticated;
grant select, insert, update, delete on public.vocabulary_items to authenticated;
grant select, insert, update, delete on public.learning_contents to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;

drop policy if exists "Authenticated users can read fixed sections" on public.sections;
create policy "Authenticated users can read fixed sections"
  on public.sections for select to authenticated
  using (true);

-- Cada usuário só pode ler e alterar seus próprios registros.
drop policy if exists "Users read own vocabulary" on public.vocabulary_items;
create policy "Users read own vocabulary"
  on public.vocabulary_items for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users insert own vocabulary" on public.vocabulary_items;
create policy "Users insert own vocabulary"
  on public.vocabulary_items for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users update own vocabulary" on public.vocabulary_items;
create policy "Users update own vocabulary"
  on public.vocabulary_items for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users delete own vocabulary" on public.vocabulary_items;
create policy "Users delete own vocabulary"
  on public.vocabulary_items for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users read own learning contents" on public.learning_contents;
create policy "Users read own learning contents"
  on public.learning_contents for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users insert own learning contents" on public.learning_contents;
create policy "Users insert own learning contents"
  on public.learning_contents for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users update own learning contents" on public.learning_contents;
create policy "Users update own learning contents"
  on public.learning_contents for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users delete own learning contents" on public.learning_contents;
create policy "Users delete own learning contents"
  on public.learning_contents for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users read own settings" on public.user_settings;
create policy "Users read own settings"
  on public.user_settings for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users insert own settings" on public.user_settings;
create policy "Users insert own settings"
  on public.user_settings for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users update own settings" on public.user_settings;
create policy "Users update own settings"
  on public.user_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users delete own settings" on public.user_settings;
create policy "Users delete own settings"
  on public.user_settings for delete to authenticated
  using (auth.uid() = user_id);
