import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Building2 } from "lucide-react";

interface VerificationResult {
  valid: boolean;
  state: 'VALID' | 'EXPIRED' | 'REVOKED' | 'INVALID';
  guest_name?: string;
  unit?: string;
  arrival_at?: string;
  valid_from?: string;
  expires_at?: string;
  redeemed_at?: string;
  message: string;
}

export default function Verify() {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyToken();
  }, [searchParams]);

  const verifyToken = async () => {
    const token = searchParams.get("token");
    
    if (!token) {
      setResult({
        valid: false,
        state: 'INVALID',
        message: "No verification token provided"
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("verify-guest-pass", {
        body: { token }
      });

      if (error) throw error;
      setResult(data);
    } catch (error: any) {
      setResult({
        valid: false,
        state: 'INVALID',
        message: error.message || "Verification failed"
      });
    }
    setLoading(false);
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
                    {result.guest_name && (
                      <p className="text-lg font-medium">{result.guest_name}</p>
                    )}
                    {result.unit && (
                      <p className="text-sm text-muted-foreground">Unit: {result.unit}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">{result.message}</p>
                    <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                      {result.valid_from && (
                        <p>Valid from: {new Date(result.valid_from).toLocaleString()}</p>
                      )}
                      {result.expires_at && (
                        <p>Expires: {new Date(result.expires_at).toLocaleString()}</p>
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
