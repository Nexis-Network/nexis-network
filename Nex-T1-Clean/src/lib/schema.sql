-- Supabase schema helper for the Knowledge Base document processor

-- Required extensions
create extension if not exists "pgcrypto";
create schema if not exists extensions;
create extension if not exists "vector" with schema extensions;

-- Private storage bucket for document uploads
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = excluded.public;

-- Storage policies to restrict access to owners or the service role
create policy if not exists "documents_select_policy" on storage.objects
  for select using (
    bucket_id = 'documents'
      and (
        coalesce(app_private.current_role(), '') = 'service_role'
        or coalesce(app_private.safe_auth_role(), '') = 'service_role'
        or owner = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  );

create policy if not exists "documents_insert_policy" on storage.objects
  for insert with check (
    bucket_id = 'documents'
      and (
        coalesce(app_private.current_role(), '') = 'service_role'
        or coalesce(app_private.safe_auth_role(), '') = 'service_role'
        or owner = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  );

create policy if not exists "documents_update_policy" on storage.objects
  for update using (
    bucket_id = 'documents'
      and (
        coalesce(app_private.current_role(), '') = 'service_role'
        or coalesce(app_private.safe_auth_role(), '') = 'service_role'
        or owner = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  )
  with check (
    bucket_id = 'documents'
      and (
        coalesce(app_private.current_role(), '') = 'service_role'
        or coalesce(app_private.safe_auth_role(), '') = 'service_role'
        or owner = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  );

create policy if not exists "documents_delete_policy" on storage.objects
  for delete using (
    bucket_id = 'documents'
      and (
        coalesce(app_private.current_role(), '') = 'service_role'
        or coalesce(app_private.safe_auth_role(), '') = 'service_role'
        or owner = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  );

-- Enumerations
create type if not exists document_type as enum ('pdf', 'docx', 'txt');
create type if not exists document_status as enum ('pending', 'processing', 'processed', 'error');
create type if not exists processing_task_type as enum ('extract', 'analyze', 'vectorize');
create type if not exists processing_task_status as enum ('pending', 'processing', 'processed', 'error');

-- Tables
create table if not exists doc_processor_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  title text not null,
  description text,
  file_path text not null,
  file_type document_type not null,
  file_size bigint not null,
  mime_type text not null,
  status document_status not null default 'pending',
  error text,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_hash text not null,
  extracted_text text,
  metadata jsonb,
  analysis jsonb,
  constraint doc_processor_documents_user_hash_key unique (user_id, file_hash)
);

create table if not exists doc_processor_document_chunks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  document_id uuid not null references doc_processor_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer not null,
  embedding extensions.vector(1536),
  page_number integer,
  heading text,
  constraint doc_processor_document_chunks_unique_idx unique (document_id, chunk_index)
);

create table if not exists doc_processor_document_entities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  document_id uuid not null references doc_processor_documents(id) on delete cascade,
  entity_type text not null,
  entity_text text not null,
  metadata jsonb,
  constraint doc_processor_document_entities_unique_idx unique (document_id, entity_type, entity_text)
);

create table if not exists doc_processor_processing_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  document_id uuid not null references doc_processor_documents(id) on delete cascade,
  task_type processing_task_type not null,
  status processing_task_status not null default 'pending',
  error text,
  metadata jsonb
);

-- Timestamp trigger
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger doc_processor_documents_set_updated_at
  before update on doc_processor_documents
  for each row execute procedure set_updated_at();

create trigger doc_processor_processing_tasks_set_updated_at
  before update on doc_processor_processing_tasks
  for each row execute procedure set_updated_at();

-- Indexes
create index if not exists doc_processor_documents_user_id_idx on doc_processor_documents (user_id);
create index if not exists doc_processor_documents_created_at_idx on doc_processor_documents (created_at desc);
create index if not exists doc_processor_document_chunks_document_idx on doc_processor_document_chunks (document_id);
create index if not exists doc_processor_document_chunks_embedding_idx
  on doc_processor_document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists doc_processor_document_entities_document_idx on doc_processor_document_entities (document_id);
create index if not exists doc_processor_processing_tasks_document_idx on doc_processor_processing_tasks (document_id);

-- Enable and enforce row level security
alter table doc_processor_documents enable row level security;
alter table doc_processor_documents force row level security;
alter table doc_processor_document_chunks enable row level security;
alter table doc_processor_document_chunks force row level security;
alter table doc_processor_document_entities enable row level security;
alter table doc_processor_document_entities force row level security;
alter table doc_processor_processing_tasks enable row level security;
alter table doc_processor_processing_tasks force row level security;

-- Document policies
create policy if not exists "doc_documents_select" on doc_processor_documents
  for select using (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
  );

create policy if not exists "doc_documents_insert" on doc_processor_documents
  for insert with check (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
  );

create policy if not exists "doc_documents_update" on doc_processor_documents
  for update using (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
  )
  with check (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
  );

create policy if not exists "doc_documents_delete" on doc_processor_documents
  for delete using (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
  );

-- Chunks policies
create policy if not exists "doc_chunks_select" on doc_processor_document_chunks
  for select using (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or exists (
        select 1
        from doc_processor_documents d
        where d.id = doc_processor_document_chunks.document_id
          and d.user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  );

create policy if not exists "doc_chunks_mutation" on doc_processor_document_chunks
  for all using (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or exists (
        select 1
        from doc_processor_documents d
        where d.id = doc_processor_document_chunks.document_id
          and d.user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  )
  with check (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or exists (
        select 1
        from doc_processor_documents d
        where d.id = doc_processor_document_chunks.document_id
          and d.user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  );

-- Entity policies
create policy if not exists "doc_entities_select" on doc_processor_document_entities
  for select using (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or exists (
        select 1
        from doc_processor_documents d
        where d.id = doc_processor_document_entities.document_id
          and d.user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  );

create policy if not exists "doc_entities_mutation" on doc_processor_document_entities
  for all using (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or exists (
        select 1
        from doc_processor_documents d
        where d.id = doc_processor_document_entities.document_id
          and d.user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  )
  with check (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or exists (
        select 1
        from doc_processor_documents d
        where d.id = doc_processor_document_entities.document_id
          and d.user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  );

-- Processing task policies
create policy if not exists "doc_tasks_select" on doc_processor_processing_tasks
  for select using (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or exists (
        select 1
        from doc_processor_documents d
        where d.id = doc_processor_processing_tasks.document_id
          and d.user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  );

create policy if not exists "doc_tasks_mutation" on doc_processor_processing_tasks
  for all using (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or exists (
        select 1
        from doc_processor_documents d
        where d.id = doc_processor_processing_tasks.document_id
          and d.user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  )
  with check (
    coalesce(app_private.current_role(), '') = 'service_role'
      or coalesce(app_private.safe_auth_role(), '') = 'service_role'
      or exists (
        select 1
        from doc_processor_documents d
        where d.id = doc_processor_processing_tasks.document_id
          and d.user_id = coalesce(app_private.current_user_uid(), app_private.safe_auth_uid())
      )
  );

-- Hybrid search helper
create or replace function hybrid_search_documents(
  query_text text,
  query_embedding extensions.vector(1536),
  match_count integer default 10,
  full_text_weight float default 1.0,
  semantic_weight float default 1.0,
  rrf_k integer default 50
)
returns table (
  id uuid,
  document_id uuid,
  title text,
  content text,
  page_number integer,
  heading text,
  combined_score float
)
language sql
stable
set search_path = pg_catalog, extensions, app_private, public
as $$
  with params as (
    select
      greatest(coalesce(match_count, 10), 1) as limit_count,
      coalesce(app_private.current_role(), '') = 'service_role' or coalesce(app_private.safe_auth_role(), '') = 'service_role' as is_service_role,
      coalesce(app_private.current_user_uid(), app_private.safe_auth_uid()) as request_uid
  ),
  full_text as (
    select
      dc.id,
      dc.document_id,
      dc.content,
      dc.page_number,
      dc.heading,
      row_number() over (
        order by ts_rank_cd(to_tsvector('english', dc.content), websearch_to_tsquery(query_text)) desc
      ) as rank_ix
    from doc_processor_document_chunks dc
    join doc_processor_documents d on d.id = dc.document_id
    cross join params p
    where
      (
        p.is_service_role
        or d.user_id = p.request_uid
      )
      and query_text is not null
      and length(query_text) > 0
      and to_tsvector('english', dc.content) @@ websearch_to_tsquery(query_text)
  ),
  semantic as (
    select
      dc.id,
      dc.document_id,
      dc.content,
      dc.page_number,
      dc.heading,
      1 - (dc.embedding <=> query_embedding) as similarity,
      row_number() over (order by dc.embedding <=> query_embedding) as rank_ix
    from doc_processor_document_chunks dc
    join doc_processor_documents d on d.id = dc.document_id
    cross join params p
    where
      (
        p.is_service_role
        or d.user_id = p.request_uid
      )
      and query_embedding is not null
  ),
  reciprocal_rank as (
    select
      coalesce(ft.id, sem.id) as id,
      coalesce(ft.document_id, sem.document_id) as document_id,
      coalesce(ft.content, sem.content) as content,
      coalesce(ft.page_number, sem.page_number) as page_number,
      coalesce(ft.heading, sem.heading) as heading,
      coalesce(ft.rank_ix, 1000000) as ft_rank,
      coalesce(sem.rank_ix, 1000000) as sem_rank,
      coalesce(ft.rank_ix, 1000000) + coalesce(sem.rank_ix, 1000000) as combined_rank
    from full_text ft
    full outer join semantic sem on ft.id = sem.id
  )
  select
    r.id,
    r.document_id,
    d.title,
    r.content,
    r.page_number,
    r.heading,
    (
      coalesce(full_text_weight, 1.0) * (case when r.ft_rank = 1000000 then 0 else 1.0 / (rrf_k + r.ft_rank) end) +
      coalesce(semantic_weight, 1.0) * (case when r.sem_rank = 1000000 then 0 else 1.0 / (rrf_k + r.sem_rank) end)
    ) as combined_score
  from reciprocal_rank r
  join doc_processor_documents d on d.id = r.document_id
  cross join params p
  where
    p.is_service_role
    or d.user_id = p.request_uid
  order by combined_score desc
  limit (select limit_count from params);
$$;
