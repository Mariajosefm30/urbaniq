import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Building2 } from "lucide-react";

interface VerificationResult {
  valid: boolean;
  state: 'VALID' | 'EXPIRED' | 'REVOKED' | 'INVALID';
  guest?: {
    name: string;
    unit?: string;
    arrival_at: string;
    valid_from: string;
    expires_at: string;
  };
  guest_name?: string;
  message: string;
}

export default function Verify() {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualToken, setManualToken] = useState("");

  useEffect(() => {
    const token = getToken();
    console.info('Verify page loaded:', { href: window.location.href, token });
    verifyToken();
  }, [searchParams]);

  const getToken = () => {
    // Primary: query parameter
    let t = searchParams.get('token');
    
    // Fallback 1: hash fragment
    if (!t && window.location.hash.startsWith('#token=')) {
      t = decodeURIComponent(window.location.hash.slice(7));
    }
    
    // Fallback 2: path segment
    if (!t) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('verify');
      if (idx >= 0 && parts[idx + 1]) {
        t = parts[idx + 1];
      }
    }
    
    return t || '';
  };

  const verifyToken = async (tokenOverride?: string) => {
    const token = tokenOverride || getToken();
    
    if (!token) {
      setResult({
        valid: false,
        state: 'INVALID',
        message: "No verification token provided. Make sure you opened the link from a guest QR code."
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("verify-guest-pass", {
        body: { token }
      });

      if (error) {
        console.error('verify-guest-pass error', error);
        throw error;
      }
      setResult(data);
    } catch (error: any) {
      console.error('verify-guest-pass error', error);
      setResult({
        valid: false,
        state: 'INVALID',
        message: error.message || "Verification failed"
      });
    }
    setLoading(false);
  };

  const handleManualVerify = () => {
    if (!manualToken.trim()) return;
    setLoading(true);
    verifyToken(manualToken.trim());
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
          <CardTitle className="text-2xl font-bold">Guest Pass Verification</CardTitle>
          <CardDescription>Building access validation</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Verifying pass...</p>
            </div>
          ) : !getToken() && result?.state === 'INVALID' ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">No verification token found</h3>
                <p className="text-sm text-muted-foreground">
                  Paste a token below or open this page via a guest QR link
                </p>
              </div>
              <div className="space-y-2">
                <Input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste verification token"
                  className="font-mono text-sm"
                />
                <Button onClick={handleManualVerify} className="w-full" disabled={!manualToken.trim()}>
                  Verify
                </Button>
              </div>
            </div>
          ) : result ? (
            <div className="text-center space-y-4">
              {result.valid ? (
                <>
                  <div className="flex justify-center">
                    <div className="p-4 bg-accent/10 rounded-full">
                      <CheckCircle2 className="h-16 w-16 text-accent" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-accent mb-2">VALID PASS</h3>
                    {(result.guest?.name || result.guest_name) && (
                      <p className="text-lg font-medium">{result.guest?.name || result.guest_name}</p>
                    )}
                    {result.guest?.unit && (
                      <p className="text-sm text-muted-foreground">Unit: {result.guest.unit}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">{result.message}</p>
                    <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                      {result.guest?.valid_from && (
                        <p>Valid from: {new Date(result.guest.valid_from).toLocaleString()}</p>
                      )}
                      {result.guest?.expires_at && (
                        <p>Expires: {new Date(result.guest.expires_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="p-4 bg-destructive/10 rounded-full">
                      <XCircle className="h-16 w-16 text-destructive" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-destructive mb-2">
                      {result.state === 'REVOKED' ? 'REVOKED' : 
                       result.state === 'EXPIRED' ? 'EXPIRED' : 'INVALID PASS'}
                    </h3>
                    {result.guest_name && (
                      <p className="text-lg font-medium mb-2">{result.guest_name}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
