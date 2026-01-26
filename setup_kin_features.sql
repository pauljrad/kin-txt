-- Create kin_connections table
CREATE TABLE IF NOT EXISTS public.kin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(requester_id, recipient_id)
);

-- Create shared_items table
CREATE TABLE IF NOT EXISTS public.shared_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('news', 'txt', 'link')),
  content JSONB NOT NULL, -- Flexible structure for different item types
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('kin_request', 'kin_accepted', 'shared_item', 'pong_challenge')),
  payload JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.kin_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for kin_connections
CREATE POLICY "Users can view their own connections" ON public.kin_connections
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create connection requests" ON public.kin_connections
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own connections" ON public.kin_connections
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Policies for shared_items
CREATE POLICY "Users can view items shared with them or by them" ON public.shared_items
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send items" ON public.shared_items
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read status of received items" ON public.shared_items
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true); -- Ideally restricted, but for client-side triggering (e.g., sending challenge) we might need this open or handle via Edge Function.
  -- Better practice: Insert notifications via database triggers or Edge Functions.
  -- For now, allowing authenticated users to insert notifications if they are the *sender* logic-wise isn't directly enforced by this table structure purely.
  -- Let's define: Users can insert notifications for OTHER users (e.g. sending a challenge).
CREATE POLICY "Users can create notifications for others" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated'); 

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
