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
import { guestPassConfig } from "@/config/guestPassConfig";

const guestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  arrival_at: z.string().min(1, "Arrival date/time is required"),
});

interface Guest {
  id: string;
  name: string;
  unit?: string;
  arrival_at: string;
  valid_from: string;
  qr_token_hash: string;
  qr_expires_at: string;
  redeemed_at?: string;
  status: "scheduled" | "expired" | "revoked";
  created_at: string;
}

interface GuestPassResponse {
  guest_id: string;
  name: string;
  unit?: string;
  verify_url: string;
  token: string;
  arrival_at: string;
  valid_from: string;
  expires_at: string;
  status: string;
}

export default function Guests() {
  const { user } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedQr, setSelectedQr] = useState<string>("");
  const [selectedVerifyUrl, setSelectedVerifyUrl] = useState<string>("");
  
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
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
      const { data, error } = await supabase.functions.invoke('create-guest-pass', {
        body: { 
          name, 
          unit: unit || undefined,
          arrival_at: new Date(arrivalAt).toISOString()
        }
      });
      
      if (error) {
        console.error('Create guest failed', error);
        toast.error(`Failed to create guest pass: ${error.message}`);
        setSubmitting(false);
        return;
      }
      
      if (!data) {
        console.error('Create guest returned no data');
        toast.error('Failed to create guest pass: no data returned');
        setSubmitting(false);
        return;
      }

      toast.success("Guest pass created successfully");
      setDialogOpen(false);
      setName("");
      setUnit("");
      setArrivalAt("");
      loadGuests();
      
      // Generate QR code from verify URL
      const qrDataUrl = await QRCode.toDataURL(data.verify_url, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'H',
      });
      setSelectedQr(qrDataUrl);
      setSelectedVerifyUrl(data.verify_url);
      setQrDialogOpen(true);
    } catch (error: any) {
      console.error('Create guest error:', error);
      toast.error(error.message || "Failed to create guest pass");
    }
    setSubmitting(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(selectedVerifyUrl);
    toast.success("Link copied to clipboard");
  };

  const downloadQr = () => {
    const link = document.createElement('a');
    link.download = 'guest-pass-qr.png';
    link.href = selectedQr;
    link.click();
    toast.success("QR code downloaded");
  };

  const getStatusBadge = (guest: Guest) => {
    const now = new Date();
    const validFrom = new Date(guest.valid_from);
    const expires = new Date(guest.qr_expires_at);
    
    if (guest.status === "revoked") {
      return <Badge variant="destructive">Revoked</Badge>;
    } else if (now < validFrom) {
      return <Badge variant="secondary">Not Yet Valid</Badge>;
    } else if (now > expires || guest.status === "expired") {
      return <Badge variant="secondary">Expired</Badge>;
    } else if (guest.redeemed_at) {
      return <Badge variant="outline">Used</Badge>;
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
                  Create a time-windowed QR pass for your visitor
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
                  <Label htmlFor="unit">Unit (Optional)</Label>
                  <Input
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Apt 101"
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
                  <p className="text-xs text-muted-foreground">
                    Pass valid {guestPassConfig.QR_WINDOW_HOURS}h before and {guestPassConfig.QR_WINDOW_HOURS}h after this time
                    {guestPassConfig.SINGLE_USE && " (Single use only)"}
                  </p>
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
                Share this QR code or link with your guest
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center py-4">
                {selectedQr && (
                  <img src={selectedQr} alt="QR Code" className="rounded-lg shadow-lg" />
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={copyLink} variant="outline" className="flex-1 gap-2">
                  Copy Link
                </Button>
                <Button onClick={downloadQr} variant="outline" className="flex-1 gap-2">
                  Download QR
                </Button>
              </div>
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
                <CardContent className="space-y-3">
                  {guest.unit && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Unit:</span> {guest.unit}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Valid: {new Date(guest.valid_from).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Expires: {new Date(guest.qr_expires_at).toLocaleString()}
                  </div>
                  {guest.redeemed_at && (
                    <div className="text-xs text-muted-foreground">
                      Used: {new Date(guest.redeemed_at).toLocaleString()}
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
