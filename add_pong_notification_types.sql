-- Add new Pong notification types to the notifications table
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('kin_request', 'kin_accepted', 'shared_item', 'pong_challenge', 'pong_accept', 'pong_ready'));
