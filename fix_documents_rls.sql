-- Drop the restrictive select policy if it exists
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;

-- Create a new policy that allows users to see their own documents 
-- OR documents belonging to their accepted KiNs
CREATE POLICY "Users can view their own or KiNs documents" ON public.documents
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.kin_connections
      WHERE status = 'accepted' AND (
        (requester_id = auth.uid() AND recipient_id = documents.user_id) OR
        (recipient_id = auth.uid() AND requester_id = documents.user_id)
      )
    )
  );

-- Ensure updated_at is fetched for sorting
-- (Table already has it, this is just a reminder)
