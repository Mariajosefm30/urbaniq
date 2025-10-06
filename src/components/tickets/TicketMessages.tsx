import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { z } from "zod";

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
}

interface TicketMessagesProps {
  ticketId: string;
}

const messageSchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty").max(500, "Message must be less than 500 characters"),
});

export function TicketMessages({ ticketId }: TicketMessagesProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const isManager = profile?.role === "manager";

  useEffect(() => {
    loadMessages();
  }, [ticketId]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load messages");
    } else {
      setMessages(data || []);
    }
  };

  const sendMessage = async () => {
    const validation = messageSchema.safeParse({ message: newMessage });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSending(true);
    const { error } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_id: profile!.id,
        message: newMessage,
      });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
      loadMessages();
      toast.success("Message sent");
    }
    setSending(false);
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div>
        <p className="text-sm font-medium mb-2">Messages from Manager</p>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className="p-3 bg-accent/10 rounded-md">
                <p className="text-sm">{msg.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isManager && (
        <div className="space-y-2">
          <Textarea
            placeholder="Type a message to the resident..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={3}
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            Send Message
          </Button>
        </div>
      )}
    </div>
  );
}