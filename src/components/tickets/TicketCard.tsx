import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, User, Copy, QrCode as QrCodeIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { TechnicianSuggestions } from "./TechnicianSuggestions";
import { TicketMessages } from "./TicketMessages";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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

interface TicketCardProps {
  ticket: Ticket;
  isManager: boolean;
  onStatusUpdate: (ticketId: string, newStatus: "open" | "in_progress" | "resolved") => void;
  onPriorityUpdate: (ticketId: string, newPriority: string) => void;
  onTechnicianAssign: (ticketId: string, technicianName: string) => void;
}

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

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "high":
      return <Badge variant="destructive">High</Badge>;
    case "normal":
      return <Badge variant="secondary">Normal</Badge>;
    case "low":
      return <Badge variant="outline">Low</Badge>;
    default:
      return <Badge variant="outline">Low</Badge>;
  }
};

export function TicketCard({ ticket, isManager, onStatusUpdate, onPriorityUpdate, onTechnicianAssign }: TicketCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { user } = useAuth();

  const isResidentTicket = user?.id === ticket.reporter_id;
  const qrPayload = ticket.access_code ? `MT:${ticket.id}:${ticket.access_code}` : null;

  const copyCode = () => {
    if (ticket.access_code) {
      navigator.clipboard.writeText(ticket.access_code);
      toast({
        title: "Copied!",
        description: "Access code copied to clipboard"
      });
    }
  };

  return (
    <>
      <Card 
        className="hover:shadow-[var(--shadow-elegant)] transition-shadow cursor-pointer"
        onClick={() => setDetailsOpen(true)}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-lg">{ticket.title}</CardTitle>
              <CardDescription>
                {ticket.profiles?.name || "Unknown User"} {ticket.profiles?.unit || (ticket.unit && `• Unit ${ticket.unit}`)}
              </CardDescription>
            </div>
            {getStatusBadge(ticket.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Badge variant="secondary">{ticket.category}</Badge>
            {getPriorityBadge(ticket.priority)}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
          {ticket.technicians && (
            <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-md">
              <User className="h-4 w-4 text-accent" />
              <div className="text-sm">
                <p className="font-medium">{ticket.technicians.name}</p>
                <p className="text-xs text-muted-foreground">Assigned Technician</p>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(ticket.created_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ticket.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Status</p>
                {getStatusBadge(ticket.status)}
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Category</p>
                <Badge variant="secondary">{ticket.category}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Priority</p>
                {isManager ? (
                  <Select
                    value={ticket.priority}
                    onValueChange={(value) => onPriorityUpdate(ticket.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  getPriorityBadge(ticket.priority)
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Reported By</p>
                <p className="text-sm text-muted-foreground">
                  {ticket.profiles?.name || "Unknown User"} {ticket.profiles?.unit || (ticket.unit && `• Unit ${ticket.unit}`)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{ticket.description}</p>
              </div>
              {ticket.technicians && (
                <div>
                  <p className="text-sm font-medium mb-2">Assigned Technician</p>
                  <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-md">
                    <User className="h-5 w-5 text-accent" />
                    <div>
                      <p className="font-medium">{ticket.technicians.name}</p>
                      <p className="text-sm text-muted-foreground">{ticket.technicians.phone}</p>
                      <p className="text-xs text-muted-foreground">⭐ {ticket.technicians.rating}/5.0</p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-1">Created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(ticket.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Show QR code and access code to resident */}
            {isResidentTicket && ticket.access_code && !isManager && (
              <div className="border-t pt-4 space-y-4">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <QrCodeIcon className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Ticket Access</h3>
                  </div>
                  {qrPayload && (
                    <div className="flex justify-center">
                      <img
                        alt="Ticket QR Code"
                        width={240}
                        height={240}
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrPayload)}`}
                        className="border rounded-lg p-2 bg-white"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Entry Code</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-2xl font-mono font-bold tracking-wider px-4 py-2 bg-muted rounded-lg">
                        {ticket.access_code}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyCode}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {ticket.access_code_status === 'verified' && (
                      <p className="text-xs text-accent font-medium">✓ Verified by manager</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isManager && ticket.status !== "resolved" && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex gap-2">
                  {ticket.status === "open" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        onStatusUpdate(ticket.id, "in_progress");
                        setDetailsOpen(false);
                      }}
                      className="flex-1"
                    >
                      Start Work
                    </Button>
                  )}
                  {ticket.status === "in_progress" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        onStatusUpdate(ticket.id, "resolved");
                        setDetailsOpen(false);
                      }}
                      className="flex-1 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                    >
                      Mark Resolved
                    </Button>
                  )}
                </div>

                {!ticket.technician_id && (
                  <TechnicianSuggestions
                    category={ticket.category}
                    ticketId={ticket.id}
                    onAssign={(technicianId) => {
                      onTechnicianAssign(ticket.id, technicianId);
                      setDetailsOpen(false);
                    }}
                  />
                )}
              </div>
            )}

            <TicketMessages ticketId={ticket.id} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
