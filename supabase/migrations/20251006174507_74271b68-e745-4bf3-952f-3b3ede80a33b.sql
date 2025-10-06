-- Create ticket_messages table for communication on tickets
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for tickets they're involved with
CREATE POLICY "Users can view messages for their tickets"
ON public.ticket_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_tickets
    WHERE id = ticket_id
    AND (reporter_id = auth.uid() OR auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'manager'
    ))
  )
);

-- Managers can insert messages on any ticket
CREATE POLICY "Managers can insert messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'manager'
  )
);

-- Create unit_messages table for direct manager-to-unit communication
CREATE TABLE public.unit_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  unit TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unit_messages ENABLE ROW LEVEL SECURITY;

-- Residents can view messages sent to their unit
CREATE POLICY "Residents can view messages to their unit"
ON public.unit_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND unit = unit_messages.unit
  )
);

-- Managers can insert messages
CREATE POLICY "Managers can insert unit messages"
ON public.unit_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'manager'
  )
);

-- Managers can view all messages they sent
CREATE POLICY "Managers can view their messages"
ON public.unit_messages
FOR SELECT
USING (sender_id = auth.uid());