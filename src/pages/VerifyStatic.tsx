import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertCircle, Building2, Loader2, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface VerificationResult {
  state: 'VALID' | 'MISMATCH' | 'ALREADY_VERIFIED' | 'NOT_FOUND' | 'INVALID';
  message: string;
  guest?: {
    name: string;
    unit?: string;
    arrival_at: string;
  };
  attempts?: number;
  verified_at?: string;
}

export default function VerifyStatic() {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [guestId, setGuestId] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    const g = searchParams.get('g');
    const c = searchParams.get('c');
    
    if (g && c) {
      setGuestId(g);
      setCode(c);
      verifyCode(g, c);
    }
  }, [searchParams]);

  const verifyCode = async (g?: string, c?: string) => {
    const guestIdToVerify = g || guestId;
    const codeToVerify = c || code;

    if (!guestIdToVerify.trim() || !codeToVerify.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both Guest ID and Code",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-guest-static', {
        body: { guest_id: guestIdToVerify.trim(), code: codeToVerify.trim() }
      });

      if (error) {
        throw error;
      }

      setResult(data);
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Verification Error",
        description: error.message || "Failed to verify guest",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = () => {
    verifyCode();
  };

  const startScanner = () => {
    const scannedUrl = prompt("Scan QR code or paste the verification URL:");
    if (scannedUrl) {
      try {
        const url = new URL(scannedUrl);
        const g = url.searchParams.get('g');
        const c = url.searchParams.get('c');
        
        if (g && c) {
          setGuestId(g);
          setCode(c);
          toast({
            title: "QR Code Scanned",
            description: "Click Verify to validate the guest code."
          });
        } else {
          toast({
            title: "Invalid QR Code",
            description: "URL does not contain required parameters",
            variant: "destructive"
          });
        }
      } catch {
        toast({
          title: "Invalid URL",
          description: "Could not parse the scanned URL",
          variant: "destructive"
        });
      }
    }
  };

  const renderResult = () => {
    if (!result) return null;

    switch (result.state) {
      case 'VALID':
        return (
          <div className="text-center space-y-4 mt-6">
            <div className="flex justify-center">
              <div className="p-4 bg-accent/10 rounded-full">
                <CheckCircle2 className="h-16 w-16 text-accent" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-accent mb-2">CODE ACCEPTED</h3>
              {result.guest && (
                <div className="space-y-1">
                  <p className="text-lg font-medium">{result.guest.name}</p>
                  {result.guest.unit && (
                    <p className="text-sm text-muted-foreground">Unit: {result.guest.unit}</p>
                  )}
                  {result.guest.arrival_at && (
                    <p className="text-sm text-muted-foreground">
                      Arrival: {new Date(result.guest.arrival_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2">{result.message}</p>
            </div>
          </div>
        );

      case 'MISMATCH':
        return (
          <div className="text-center space-y-4 mt-6">
            <div className="flex justify-center">
              <div className="p-4 bg-destructive/10 rounded-full">
                <XCircle className="h-16 w-16 text-destructive" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-destructive mb-2">CODE MISMATCH</h3>
              <p className="text-sm text-muted-foreground">{result.message}</p>
              {result.attempts !== undefined && (
                <p className="text-sm text-muted-foreground mt-2">
                  Failed attempts: {result.attempts}
                </p>
              )}
            </div>
          </div>
        );

      case 'ALREADY_VERIFIED':
        return (
          <div className="text-center space-y-4 mt-6">
            <div className="flex justify-center">
              <div className="p-4 bg-orange-500/10 rounded-full">
                <AlertCircle className="h-16 w-16 text-orange-500" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-orange-500 mb-2">ALREADY VERIFIED</h3>
              <p className="text-sm text-muted-foreground">{result.message}</p>
              {result.guest && (
                <div className="space-y-1 mt-4">
                  <p className="text-lg font-medium">{result.guest.name}</p>
                  {result.guest.unit && (
                    <p className="text-sm text-muted-foreground">Unit: {result.guest.unit}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'NOT_FOUND':
        return (
          <div className="text-center space-y-4 mt-6">
            <div className="flex justify-center">
              <div className="p-4 bg-destructive/10 rounded-full">
                <XCircle className="h-16 w-16 text-destructive" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-destructive mb-2">GUEST NOT FOUND</h3>
              <p className="text-sm text-muted-foreground">{result.message}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-[var(--shadow-elegant)]">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Guest Verification (Demo)</CardTitle>
          <CardDescription>Validate guest access codes</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Enter Code</TabsTrigger>
              <TabsTrigger value="scan">Scan QR</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Guest ID</label>
                <Input
                  value={guestId}
                  onChange={(e) => setGuestId(e.target.value)}
                  placeholder="Enter guest ID"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">6-Digit Code</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="font-mono text-lg"
                />
              </div>
              <Button 
                onClick={handleManualVerify} 
                className="w-full"
                disabled={loading || !guestId.trim() || !code.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </TabsContent>

            <TabsContent value="scan" className="space-y-4 mt-4">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <QrCode className="h-24 w-24 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Click below to scan a QR code from a guest pass
                </p>
                <Button 
                  onClick={startScanner}
                  className="w-full"
                >
                  Scan QR Code
                </Button>
                
                {guestId && code && (
                  <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">Scanned Data:</p>
                    <p className="text-xs text-muted-foreground">Guest ID: {guestId}</p>
                    <p className="text-xs text-muted-foreground">Code: {code}</p>
                    <Button 
                      onClick={handleManualVerify} 
                      className="w-full mt-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify Code'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {renderResult()}
        </CardContent>
      </Card>
    </div>
  );
}
