import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import Layout from "@/components/Layout";
import { TicketCard } from "@/components/tickets/TicketCard";
import { CreateTicketDialog } from "@/components/tickets/CreateTicketDialog";
import { AlertsCard } from "@/components/maintenance/AlertsCard";

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
  priority: string;
  unit: string | null;
  photo_url: string | null;
  status: "open" | "in_progress" | "resolved";
  reporter_id: string;
  created_at: string;
  technician_id: string | null;
  access_code?: string | null;
  access_code_status?: string | null;
  profiles: {
    name: string;
    unit: string | null;
  } | null;
  technicians?: {
    name: string;
    phone: string;
    rating: number;
  } | null;
}

export default function Tickets() {
  const { user, profile } = useAuth();
  const { buildingId } = useParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [user, buildingId]);

  const loadTickets = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("maintenance_tickets")
      .select("*, profiles(name, unit), technicians(name, phone, rating)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load tickets");
    } else {
      // Filter by building on client side if buildingId is present
      const filteredData = buildingId 
        ? (data || []).filter((ticket: any) => ticket.building_id === buildingId)
        : (data || []);
      setTickets(filteredData);
    }
    setLoading(false);
  };

  const createTicket = async (title: string, description: string, category: string, unit: string, image?: File) => {
    // Prevent managers from creating tickets
    if (profile?.role === "manager") {
      toast.error("Managers cannot create tickets. Only residents can submit tickets.");
      return;
    }

    setSubmitting(true);

    const validation = ticketSchema.safeParse({ title, description, category });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setSubmitting(false);
      return;
    }

    let imageUrl: string | null = null;

    // Upload image if provided
    if (image) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ticket-images')
        .upload(fileName, image);

      if (uploadError) {
        toast.error("Failed to upload image");
        setSubmitting(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('ticket-images')
        .getPublicUrl(fileName);
      
      imageUrl = publicUrl;
    }

    // Auto-prioritization logic
    const text = `${title} ${description}`.toLowerCase();
    let priority = 'low';

    const highKeywords = ['water leak', 'gas', 'elevator stuck', 'no power', 'flood', 'burst', 'smoke', 'fire', 'electrical short'];
    const normalKeywords = ['door lock', 'elevator noise', 'dripping', 'slow drain'];

    for (const keyword of highKeywords) {
      if (text.includes(keyword)) {
        priority = 'high';
        break;
      }
    }

    if (priority === 'low') {
      for (const keyword of normalKeywords) {
        if (text.includes(keyword)) {
          priority = 'normal';
          break;
        }
      }
    }

    // Generate 6-digit access code
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    const n = (bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]) >>> 0;
    const access_code = String(n % 1_000_000).padStart(6, '0');

    const { error } = await supabase
      .from("maintenance_tickets")
      .insert({
        title,
        description,
        category,
        priority,
        unit: unit || null,
        reporter_id: user!.id,
        access_code,
        image_url: imageUrl,
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

  const updatePriority = async (ticketId: string, newPriority: string) => {
    const { error } = await supabase
      .from("maintenance_tickets")
      .update({ priority: newPriority })
      .eq("id", ticketId);

    if (error) {
      toast.error("Failed to update priority");
    } else {
      toast.success("Priority updated");
      loadTickets();
    }
  };

  const assignTechnician = async (ticketId: string, technicianName: string) => {
    const { error } = await supabase
      .from("maintenance_tickets")
      .update({ technician_id: technicianName })
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
            <p className="text-muted-foreground">
              {profile?.role === "manager" 
                ? "Review and manage maintenance requests" 
                : "Submit and track maintenance requests"}
            </p>
          </div>
          {profile?.role !== "manager" && (
            <CreateTicketDialog
              onSubmit={createTicket}
              submitting={submitting}
              open={dialogOpen}
              onOpenChange={setDialogOpen}
            />
          )}
        </div>

        {profile?.role === "manager" && <AlertsCard />}

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
                onPriorityUpdate={updatePriority}
                onTechnicianAssign={assignTechnician}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
