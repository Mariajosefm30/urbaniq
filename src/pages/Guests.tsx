import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, UserPlus, Calendar, Clock, QrCode as QrCodeIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import Layout from "@/components/Layout";
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
  demo_code?: string;
  demo_code_status?: string;
  demo_code_verified_at?: string;
}

interface GuestPassResponse {
  guest_id: string;
  name: string;
  unit?: string;
  guest_code: string;
  arrival_at: string;
  valid_from: string;
  expires_at: string;
  status: string;
}

export default function Guests() {
  const { user, profile } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [arrivalAt, setArrivalAt] = useState("");
  
  // Manager validation state
  const [validationCode, setValidationCode] = useState("");
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    loadGuests();
  }, [user, profile]);

  const loadGuests = async () => {
    if (!user) return;
    
    let query = supabase
      .from("guests")
      .select("*")
      .order("arrival_at", { ascending: false });
    
    // If not a manager, only show their own guests
    if (profile?.role !== "manager") {
      query = query.eq("host_id", user.id);
    }
    
    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load guests");
    } else {
      setGuests(data || []);
    }
    setLoading(false);
  };

  const createGuest = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent managers from creating guests
    if (profile?.role === "manager") {
      toast.error("Managers cannot create guest passes. Only residents can create passes.");
      return;
    }

    setSubmitting(true);

    const validation = guestSchema.safeParse({ name, arrival_at: arrivalAt });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setSubmitting(false);
      return;
    }

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke<GuestPassResponse>('create-guest-pass', {
        body: {
          name,
          unit: unit || null,
          arrival_at: arrivalAt,
        }
      });

      if (fnError || !result) {
        console.error('Error from edge function:', fnError);
        toast.error(fnError?.message || "Failed to create guest pass");
        setSubmitting(false);
        return;
      }

      toast.success(`Guest pass created! Code: ${result.guest_code}`);
      setDialogOpen(false);
      setName("");
      setUnit("");
      setArrivalAt("");
      loadGuests();
    } catch (error: any) {
      console.error('Exception creating guest:', error);
      toast.error(error.message || "Failed to create guest pass");
    }
    setSubmitting(false);
  };

  const validateGuestCode = async () => {
    if (!validationCode.trim()) {
      toast.error("Please enter a guest code");
      return;
    }

    setValidating(true);

    try {
      // Find guest by demo_code (case-insensitive)
      const { data: guest, error } = await supabase
        .from('guests')
        .select('*')
        .ilike('demo_code', validationCode.trim())
        .maybeSingle();

      if (error || !guest) {
        toast.error("Guest code not found");
        setValidating(false);
        return;
      }

      // Check if already verified
      if (guest.demo_code_status === 'verified') {
        toast.error(`Code already verified on ${new Date(guest.demo_code_verified_at).toLocaleString()}`);
        setValidating(false);
        return;
      }

      // Mark as verified
      const { error: updateError } = await supabase
        .from('guests')
        .update({
          demo_code_status: 'verified',
          demo_code_verified_at: new Date().toISOString()
        })
        .eq('id', guest.id);

      if (updateError) {
        toast.error("Failed to verify guest");
        setValidating(false);
        return;
      }

      toast.success(`✓ Guest verified: ${guest.name}`);
      setValidationCode("");
      loadGuests(); // Refresh the list
    } catch (err: any) {
      console.error('Validation error:', err);
      toast.error(err.message || "Failed to validate guest");
    } finally {
      setValidating(false);
    }
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
        {/* Manager Validation Section */}
        {profile?.role === "manager" && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-xl">Validate Guest Entry</CardTitle>
              <CardDescription>Enter the guest code provided at the entrance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={validationCode}
                  onChange={(e) => setValidationCode(e.target.value.toUpperCase())}
                  placeholder="Enter guest code (e.g., PropPass&0001)"
                  className="font-mono text-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      validateGuestCode();
                    }
                  }}
                />
                <Button 
                  onClick={validateGuestCode}
                  disabled={validating || !validationCode.trim()}
                  className="min-w-[120px]"
                >
                  {validating ? "Validating..." : "Validate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Guest Passes</h2>
            <CardDescription>
              {profile?.role === "manager" 
                ? "View and validate all registered guests" 
                : "Register visitors and manage your guest passes"}
            </CardDescription>
          </div>
          {profile?.role !== "manager" && (
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
          )}
        </div>

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
                  
                  {/* Show QR code and access code */}
                  {guest.demo_code && (
                    <div className="mt-3 p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <QrCodeIcon className="h-5 w-5 text-primary" />
                        <h4 className="text-sm font-semibold">Guest Pass</h4>
                      </div>
                      <div className="flex justify-center">
                        <img
                          alt="Guest Pass QR Code"
                          width={200}
                          height={200}
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(guest.demo_code)}`}
                          className="border rounded-lg p-2 bg-white"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Access Code</p>
                          <p className="text-lg font-mono font-bold tracking-wider">{guest.demo_code}</p>
                        </div>
                        {guest.demo_code_status === 'verified' && (
                          <Badge variant="outline" className="border-accent text-accent">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>
                      {guest.demo_code_verified_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Verified: {new Date(guest.demo_code_verified_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  
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
