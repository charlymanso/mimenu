-- ============================================================
-- MiMenú — ejecutar en Supabase SQL Editor
-- ============================================================

-- PROFILES (extiende auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url    text,
  created_at    timestamptz default now()
);

-- RECIPES
create table if not exists public.recipes (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  description text,
  prep_time   integer,        -- minutos
  servings    integer default 2,
  photo_url   text,
  steps       text[],
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- INGREDIENTS (pertenecen a una receta)
create table if not exists public.ingredients (
  id        uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  name      text not null,
  quantity  numeric,
  unit      text
);

-- WEEKLY MENU
-- Cada fila = un slot (día + tipo de comida) para una semana concreta.
-- meal_text guarda texto libre; recipe_id es opcional para cuando
-- se vincule a una receta guardada.
create table if not exists public.weekly_menu (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  week_start  date not null,  -- lunes de la semana
  day         text not null,  -- 'monday' .. 'sunday'
  meal        text not null,  -- 'desayuno' | 'almuerzo' | 'comida' | 'merienda' | 'cena'
  meal_text   text,           -- texto libre introducido por el usuario
  recipe_id   uuid references public.recipes(id) on delete set null,
  unique(user_id, week_start, day, meal)
);

-- PANTRY ITEMS
create table if not exists public.pantry_items (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  quantity    numeric default 0,
  unit        text,
  category    text,
  running_low boolean default false,
  updated_at  timestamptz default now()
);

-- SHOPPING LIST
create table if not exists public.shopping_list (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  quantity   numeric,
  unit       text,
  category   text,
  checked    boolean default false,
  manual     boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS: activar en todas las tablas
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.recipes        enable row level security;
alter table public.ingredients    enable row level security;
alter table public.weekly_menu    enable row level security;
alter table public.pantry_items   enable row level security;
alter table public.shopping_list  enable row level security;

-- ============================================================
-- POLÍTICAS: cada usuario solo ve sus propios datos
-- ============================================================
create policy "Users see own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "Users see own recipes" on public.recipes
  for all using (auth.uid() = user_id);

create policy "Users see own ingredients" on public.ingredients
  for all using (
    recipe_id in (select id from public.recipes where user_id = auth.uid())
  );

create policy "Users see own weekly_menu" on public.weekly_menu
  for all using (auth.uid() = user_id);

create policy "Users see own pantry" on public.pantry_items
  for all using (auth.uid() = user_id);

create policy "Users see own shopping_list" on public.shopping_list
  for all using (auth.uid() = user_id);
