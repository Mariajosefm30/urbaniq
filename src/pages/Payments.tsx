import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, DollarSign, AlertCircle } from "lucide-react";

export default function Payments() {
  const { profile } = useAuth();
  const { currentBuildingId } = useBuilding();
  const [loading, setLoading] = useState(true);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);

  useEffect(() => {
    checkPaymentConfig();
  }, []);

  const checkPaymentConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-config');
      
      if (error) throw error;
      
      setPaymentsEnabled(data.enabled);
    } catch (error) {
      console.error('[payments] Failed to check payment config:', error);
      setPaymentsEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Payments</h1>
        <p className="text-muted-foreground">
          Manage invoices and payments for your {profile?.role === 'manager' ? 'building' : 'unit'}
        </p>
      </div>

      {!paymentsEnabled && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Payments are not configured yet.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {profile?.role === 'manager' ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Manage Invoices
                </CardTitle>
                <CardDescription>
                  Create and manage invoices for residents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsEnabled ? (
                  <Button>Create Invoice</Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Invoice creation is not available. Please configure payment provider.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>
                  View payment history and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No payments to display
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  My Invoices
                </CardTitle>
                <CardDescription>
                  View and pay your outstanding invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsEnabled ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No outstanding invoices
                    </p>
                    <Button disabled={!paymentsEnabled}>Pay Now</Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Payment functionality is not available at this time.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  View your past payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No payment history
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
