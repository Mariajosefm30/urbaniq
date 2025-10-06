import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertCircle, Wrench, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import Layout from "@/components/Layout";

const ticketSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  description: z.string().trim().min(1, "Description is required").max(1000),
  category: z.string().min(1, "Category is required"),
});

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  photo_url: string | null;
  status: "open" | "in_progress" | "resolved";
  reporter_id: string;
  created_at: string;
  profiles: {
    name: string;
    unit: string | null;
  };
}

export default function Tickets() {
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("maintenance_tickets")
      .select("*, profiles(name, unit)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load tickets");
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const validation = ticketSchema.safeParse({ title, description, category });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("maintenance_tickets")
      .insert({
        title,
        description,
        category,
        reporter_id: user!.id,
      });

    if (error) {
      toast.error("Failed to create ticket");
    } else {
      toast.success("Ticket created successfully");
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setCategory("");
      loadTickets();
    }
    setSubmitting(false);
  };

  const updateStatus = async (ticketId: string, newStatus: "open" | "in_progress" | "resolved") => {
    const { error } = await supabase
      .from("maintenance_tickets")
      .update({ status: newStatus })
      .eq("id", ticketId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      loadTickets();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Open</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="gap-1 border-warning text-warning"><Clock className="h-3 w-3" /> In Progress</Badge>;
      case "resolved":
        return <Badge variant="outline" className="gap-1 border-accent text-accent"><CheckCircle2 className="h-3 w-3" /> Resolved</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Maintenance Tickets</h2>
            <p className="text-muted-foreground">Submit and track maintenance requests</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Maintenance Ticket</DialogTitle>
                <DialogDescription>
                  Submit a new maintenance request for your unit
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Leaking faucet in bathroom"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="appliance">Appliance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed description of the issue..."
                    rows={4}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Ticket"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No tickets yet</p>
              <p className="text-sm text-muted-foreground">Create your first maintenance ticket to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-[var(--shadow-elegant)] transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{ticket.title}</CardTitle>
                      <CardDescription>
                        {ticket.profiles.name} {ticket.profiles.unit && `• Unit ${ticket.profiles.unit}`}
                      </CardDescription>
                    </div>
                    {getStatusBadge(ticket.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Badge variant="secondary">{ticket.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ticket.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                  {profile?.role === "manager" && ticket.status !== "resolved" && (
                    <div className="flex gap-2 pt-2 border-t">
                      {ticket.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(ticket.id, "in_progress")}
                          className="flex-1"
                        >
                          Start Work
                        </Button>
                      )}
                      {ticket.status === "in_progress" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(ticket.id, "resolved")}
                          className="flex-1 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                        >
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
