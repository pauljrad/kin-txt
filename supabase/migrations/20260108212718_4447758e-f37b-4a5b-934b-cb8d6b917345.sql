ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'paste',
  ADD COLUMN IF NOT EXISTS file_type text;

-- Backfill for existing rows: keep default 'paste' unless we can confidently infer URL.
UPDATE public.documents
SET source = 'url'
WHERE source = 'paste'
  AND (title ILIKE 'http%' OR title ILIKE 'www.%');

CREATE INDEX IF NOT EXISTS idx_documents_source ON public.documents (user_id, source);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents (user_id, file_type);