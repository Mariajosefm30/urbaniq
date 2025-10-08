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
  const { user, profile } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedQr, setSelectedQr] = useState<string>("");
  const [selectedVerifyUrl, setSelectedVerifyUrl] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<string>("");
  
  // Demo QR state
  const [demoQrDialogOpen, setDemoQrDialogOpen] = useState(false);
  const [demoVerifyUrl, setDemoVerifyUrl] = useState<string>("");
  const [demoCode, setDemoCode] = useState<string>("");
  const [generatingDemo, setGeneratingDemo] = useState(false);
  
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
    setSubmitting(true);

    const validation = guestSchema.safeParse({ name, arrival_at: arrivalAt });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setSubmitting(false);
      return;
    }

    try {
      // Get total count of ALL guests to generate global tracking number
      const { count } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true });

      const guestNumber = String((count || 0) + 1).padStart(4, '0');
      const trackingCode = `PropPass&${guestNumber}`;

      // Set default values for required fields (we're using demo_code instead)
      const arrivalDate = new Date(arrivalAt);
      const validFrom = new Date(arrivalDate.getTime() - (2 * 60 * 60 * 1000)); // 2 hours before
      const expiresAt = new Date(arrivalDate.getTime() + (24 * 60 * 60 * 1000)); // 24 hours after

      const { error } = await supabase
        .from('guests')
        .insert({
          name,
          unit: unit || null,
          arrival_at: arrivalDate.toISOString(),
          host_id: user!.id,
          demo_code: trackingCode,
          demo_code_status: 'new',
          qr_token_hash: 'demo',
          qr_expires_at: expiresAt.toISOString(),
          valid_from: validFrom.toISOString(),
          status: 'scheduled'
        });

      if (error) {
        console.error('Error creating guest:', error);
        toast.error("Failed to create guest");
        setSubmitting(false);
        return;
      }

      toast.success(`Guest created with code: ${trackingCode}`);
      setDialogOpen(false);
      setName("");
      setUnit("");
      setArrivalAt("");
      loadGuests();
    } catch (error: any) {
      console.error('Exception creating guest:', error);
      toast.error(error.message || "Failed to create guest");
    }
    setSubmitting(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(selectedVerifyUrl);
    toast.success("Link copied to clipboard");
  };

  const copyToken = () => {
    navigator.clipboard.writeText(selectedToken);
    toast.success("Token copied to clipboard");
  };

  const downloadQr = () => {
    const link = document.createElement('a');
    link.download = 'guest-pass-qr.png';
    link.href = selectedQr;
    link.click();
    toast.success("QR code downloaded");
  };

  const generateDemoCode = async (guestId: string) => {
    setGeneratingDemo(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-demo-code', {
        body: { guest_id: guestId }
      });

      if (error) throw error;

      setDemoVerifyUrl(data.verify_url);
      setDemoCode(data.demo_code);
      setDemoQrDialogOpen(true);
      
      toast.success("Demo QR code generated");
    } catch (err: any) {
      console.error('Error generating demo code:', err);
      toast.error(err.message || "Failed to generate demo code");
    } finally {
      setGeneratingDemo(false);
    }
  };

  const copyDemoLink = () => {
    navigator.clipboard.writeText(demoVerifyUrl);
    toast.success("Link copied to clipboard");
  };

  const copyDemoCode = () => {
    navigator.clipboard.writeText(demoCode);
    toast.success("Code copied to clipboard");
  };

  const validateGuestCode = async () => {
    if (!validationCode.trim()) {
      toast.error("Please enter a guest code");
      return;
    }

    setValidating(true);

    try {
      // Find guest by demo_code
      const { data: guest, error } = await supabase
        .from('guests')
        .select('*')
        .eq('demo_code', validationCode.trim())
        .single();

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
              {selectedVerifyUrl && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded break-all">
                  🔍 {selectedVerifyUrl}
                </div>
              )}
              {selectedToken && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded break-all font-mono">
                  🔑 Token: {selectedToken}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={copyLink} variant="outline" className="flex-1 gap-2">
                  Copy Link
                </Button>
                <Button onClick={copyToken} variant="outline" className="flex-1 gap-2">
                  Copy Token
                </Button>
                <Button onClick={downloadQr} variant="outline" className="flex-1 gap-2">
                  Download QR
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={demoQrDialogOpen} onOpenChange={setDemoQrDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Demo Guest Pass</DialogTitle>
              <DialogDescription>
                Share this code with your guest for entry verification
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {demoCode && (
                <>
                  <div className="text-center space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">6-Digit Access Code</Label>
                    <div className="text-4xl font-mono font-bold bg-muted p-6 rounded-lg text-center tracking-widest">
                      {demoCode}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Guest can use this code at /verify-static for entry
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Verification Link</Label>
                    <div className="text-xs text-muted-foreground bg-muted p-3 rounded break-all">
                      {demoVerifyUrl}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={copyDemoCode} className="flex-1 gap-2">
                      Copy Code
                    </Button>
                    <Button onClick={copyDemoLink} variant="outline" className="flex-1 gap-2">
                      Copy Link
                    </Button>
                  </div>
                </>
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
                  <Button 
                    onClick={() => generateDemoCode(guest.id)}
                    variant="outline"
                    className="w-full gap-2 mt-2"
                    disabled={generatingDemo}
                  >
                    <QrCode className="h-4 w-4" />
                    {generatingDemo ? "Generating..." : "Generate Pass Code"}
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
