-- Create Themes Table
create table public.themes (
  id text primary key,
  name text not null,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Notes Table
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  title text,
  content text,
  theme_id text references public.themes(id),
  date_display timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.themes enable row level security;
alter table public.notes enable row level security;

-- Create Policies (Allow public access for now for simplicity, or specific if auth enabled)
-- For this prototype phase, we'll allow public Select/Insert/Update/Delete.
-- WARNING: In production, you should restrict this to authenticated users.

create policy "Enable access to all users" on public.themes for all using (true) with check (true);
create policy "Enable access to all users" on public.notes for all using (true) with check (true);
