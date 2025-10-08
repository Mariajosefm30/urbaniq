import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertCircle, QrCode, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface ValidationResult {
  state: 'VALID' | 'MISMATCH' | 'ALREADY_VERIFIED' | 'NOT_FOUND';
  message: string;
  ticket?: {
    id: string;
    title: string;
    unit?: string;
    status: string;
  };
  attempts?: number;
  verifiedAt?: string;
}

export default function Validate() {
  const { user, profile } = useAuth();
  const [ticketId, setTicketId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [scannerActive, setScannerActive] = useState(false);

  if (!user || profile?.role !== "manager") {
    return <Navigate to="/" replace />;
  }

  const handleValidate = async () => {
    if (!ticketId.trim() || !code.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both Ticket ID and Code",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-ticket', {
        body: { ticketId: ticketId.trim(), code: code.trim() }
      });

      if (error) {
        throw error;
      }

      setResult(data);
    } catch (error: any) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Error",
        description: error.message || "Failed to validate ticket",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startScanner = () => {
    setScannerActive(true);
    // Simple prompt-based QR scanner for MVP
    const scannedData = prompt("Scan QR code or paste the QR data (MT:ticketId:code):");
    if (scannedData) {
      const match = scannedData.match(/^MT:([^:]+):(\d{6})$/);
      if (match) {
        setTicketId(match[1]);
        setCode(match[2]);
        toast({
          title: "QR Code Scanned",
          description: "Code detected. Click Verify to validate."
        });
      } else {
        toast({
          title: "Invalid QR Code",
          description: "QR code format not recognized",
          variant: "destructive"
        });
      }
    }
    setScannerActive(false);
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
              {result.ticket && (
                <div className="space-y-1">
                  <p className="text-lg font-medium">{result.ticket.title}</p>
                  {result.ticket.unit && (
                    <p className="text-sm text-muted-foreground">Unit: {result.ticket.unit}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Status: {result.ticket.status}</p>
                </div>
              )}
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
              {result.ticket && (
                <div className="space-y-1 mt-4">
                  <p className="text-lg font-medium">{result.ticket.title}</p>
                  {result.ticket.unit && (
                    <p className="text-sm text-muted-foreground">Unit: {result.ticket.unit}</p>
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
              <h3 className="text-2xl font-bold text-destructive mb-2">TICKET NOT FOUND</h3>
              <p className="text-sm text-muted-foreground">{result.message}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Validate Ticket Access</CardTitle>
            <CardDescription>Verify maintenance ticket access codes</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Enter Code</TabsTrigger>
                <TabsTrigger value="scan">Scan QR</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ticket ID</label>
                  <Input
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    placeholder="Enter ticket ID"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Access Code</label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="font-mono text-lg"
                  />
                </div>
                <Button 
                  onClick={handleValidate} 
                  className="w-full"
                  disabled={loading || !ticketId.trim() || !code.trim()}
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
              </TabsContent>

              <TabsContent value="scan" className="space-y-4 mt-4">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <QrCode className="h-24 w-24 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click below to scan a QR code from a maintenance ticket
                  </p>
                  <Button 
                    onClick={startScanner}
                    className="w-full"
                    disabled={scannerActive}
                  >
                    {scannerActive ? 'Scanning...' : 'Scan QR Code'}
                  </Button>
                  
                  {ticketId && code && (
                    <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                      <p className="text-sm font-medium">Scanned Data:</p>
                      <p className="text-xs text-muted-foreground">Ticket ID: {ticketId}</p>
                      <p className="text-xs text-muted-foreground">Code: {code}</p>
                      <Button 
                        onClick={handleValidate} 
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
    </Layout>
  );
}
