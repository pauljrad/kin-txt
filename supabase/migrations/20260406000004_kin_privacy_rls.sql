-- 1. DOCUMENTS PRIVACY: Allow accepted KiNs to view each other's documents
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;

CREATE POLICY "Users and their accepted KiNs can view documents"
ON public.documents FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id -- Owner
  OR
  EXISTS (
    SELECT 1 FROM public.kin_connections 
    WHERE status = 'accepted'
    AND (
      (requester_id = auth.uid() AND recipient_id = documents.user_id)
      OR
      (recipient_id = auth.uid() AND requester_id = documents.user_id)
    )
  )
);

-- 2. READING SESSIONS PRIVACY: Allow accepted KiNs to view each other's reading sessions
DROP POLICY IF EXISTS "Users can view their own reading sessions" ON public.reading_sessions;

CREATE POLICY "Users and their accepted KiNs can view reading sessions"
ON public.reading_sessions FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id -- Owner
  OR
  EXISTS (
    SELECT 1 FROM public.kin_connections 
    WHERE status = 'accepted'
    AND (
      (requester_id = auth.uid() AND recipient_id = reading_sessions.user_id)
      OR
      (recipient_id = auth.uid() AND requester_id = reading_sessions.user_id)
    )
  )
);
