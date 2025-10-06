import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import Layout from "@/components/Layout";
import { TicketCard } from "@/components/tickets/TicketCard";
import { CreateTicketDialog } from "@/components/tickets/CreateTicketDialog";

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
  technician_id: string | null;
  profiles: {
    name: string;
    unit: string | null;
  };
  technicians?: {
    name: string;
    phone: string;
    rating: number;
  } | null;
}

export default function Tickets() {
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("maintenance_tickets")
      .select("*, profiles(name, unit), technicians(name, phone, rating)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load tickets");
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  const createTicket = async (title: string, description: string, category: string) => {
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

  const assignTechnician = async (ticketId: string, technicianId: string) => {
    const { error } = await supabase
      .from("maintenance_tickets")
      .update({ technician_id: technicianId })
      .eq("id", ticketId);

    if (error) {
      toast.error("Failed to assign technician");
    } else {
      toast.success("Technician assigned successfully");
      loadTickets();
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
          <CreateTicketDialog
            onSubmit={createTicket}
            submitting={submitting}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
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
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isManager={profile?.role === "manager"}
                onStatusUpdate={updateStatus}
                onTechnicianAssign={assignTechnician}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
