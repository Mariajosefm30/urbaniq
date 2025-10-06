import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, UserPlus, QrCode, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import Layout from "@/components/Layout";
import QRCode from "qrcode";

const guestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  arrival_at: z.string().min(1, "Arrival date/time is required"),
});

interface Guest {
  id: string;
  name: string;
  arrival_at: string;
  qr_token_hash: string;
  qr_expires_at: string;
  status: "scheduled" | "expired" | "revoked";
  created_at: string;
}

export default function Guests() {
  const { user } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedQr, setSelectedQr] = useState<string>("");
  
  const [name, setName] = useState("");
  const [arrivalAt, setArrivalAt] = useState("");

  useEffect(() => {
    loadGuests();
  }, [user]);

  const loadGuests = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .eq("host_id", user.id)
      .order("arrival_at", { ascending: false });

    if (error) {
      toast.error("Failed to load guests");
    } else {
      setGuests(data || []);
    }
    setLoading(false);
  };

  const createGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const validation = guestSchema.safeParse({ name, arrival_at: arrivalAt });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setSubmitting(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-guest-pass", {
        body: { name, arrival_at: arrivalAt }
      });

      if (error) throw error;

      toast.success("Guest registered successfully");
      setDialogOpen(false);
      setName("");
      setArrivalAt("");
      loadGuests();
      
      // Show QR code
      const qrUrl = `${window.location.origin}/verify?token=${data.token}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
      });
      setSelectedQr(qrDataUrl);
      setQrDialogOpen(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to create guest");
    }
    setSubmitting(false);
  };

  const showQr = async (guest: Guest) => {
    const qrUrl = `${window.location.origin}/verify?token=${guest.qr_token_hash}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
    });
    setSelectedQr(qrDataUrl);
    setQrDialogOpen(true);
  };

  const getStatusBadge = (guest: Guest) => {
    const now = new Date();
    const expires = new Date(guest.qr_expires_at);
    
    if (guest.status === "revoked") {
      return <Badge variant="destructive">Revoked</Badge>;
    } else if (now > expires || guest.status === "expired") {
      return <Badge variant="secondary">Expired</Badge>;
    } else {
      return <Badge variant="outline" className="border-accent text-accent">Valid</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Guest Passes</h2>
            <p className="text-muted-foreground">Register visitors and generate QR passes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Register Guest
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Guest</DialogTitle>
                <DialogDescription>
                  Create a 24-hour QR pass for your visitor
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createGuest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Guest Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arrival">Arrival Date & Time</Label>
                  <Input
                    id="arrival"
                    type="datetime-local"
                    value={arrivalAt}
                    onChange={(e) => setArrivalAt(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating..." : "Generate Pass"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Guest QR Pass</DialogTitle>
              <DialogDescription>
                Share this QR code with your guest. Valid for 24 hours.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              {selectedQr && (
                <img src={selectedQr} alt="QR Code" className="rounded-lg shadow-lg" />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading guests...</div>
        ) : guests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No guests registered</p>
              <p className="text-sm text-muted-foreground">Create your first guest pass to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {guests.map((guest) => (
              <Card key={guest.id} className="hover:shadow-[var(--shadow-elegant)] transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{guest.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(guest.arrival_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(guest)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Expires: {new Date(guest.qr_expires_at).toLocaleString()}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => showQr(guest)}
                  >
                    <QrCode className="h-4 w-4" />
                    View QR Code
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
