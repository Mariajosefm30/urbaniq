-- Enable realtime for ticket messages
ALTER TABLE public.ticket_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;

-- Enable realtime for unit messages
ALTER TABLE public.unit_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.unit_messages;