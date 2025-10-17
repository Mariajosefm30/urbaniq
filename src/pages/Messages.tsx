import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";

const messageSchema = z.object({
  unit: z.string().trim().min(1, "Unit number is required").max(50),
  subject: z.string().trim().min(1, "Subject is required").max(100),
  message: z.string().trim().min(1, "Message is required").max(1000),
});

interface UnitMessage {
  id: string;
  unit: string;
  subject: string;
  message: string;
  created_at: string;
}

export default function Messages() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<UnitMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unit, setUnit] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const isManager = profile?.role === "manager";

  useEffect(() => {
    loadMessages();
  }, [user]);

  const loadMessages = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("unit_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load messages");
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    const validation = messageSchema.safeParse({ unit, subject, message });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("unit_messages")
      .insert({
        sender_id: user!.id,
        unit: unit.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });

    if (error) {
      toast.error("Failed to send message");
    } else {
      toast.success("Message sent successfully");
      setDialogOpen(false);
      setUnit("");
      setSubject("");
      setMessage("");
      loadMessages();
    }
    setSubmitting(false);
  };

  const myMessages = isManager
    ? messages
    : messages.filter((msg) => msg.unit === profile?.unit);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Messages</h2>
            <p className="text-muted-foreground">
              {isManager
                ? "View and send messages to residents"
                : "View messages from management"}
            </p>
          </div>
          {isManager && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Send className="h-4 w-4" />
              New Message
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading messages...</div>
        ) : myMessages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                {isManager
                  ? "Send your first message to residents"
                  : "You'll see messages from management here"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {myMessages.map((msg) => (
              <Card key={msg.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{msg.subject}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">Unit {msg.unit}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {msg.message}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to Unit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Unit Number</label>
              <Input
                placeholder="e.g., 101"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                placeholder="e.g., Maintenance Schedule"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>
            <Button
              onClick={sendMessage}
              disabled={submitting}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}