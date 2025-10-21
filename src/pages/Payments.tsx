import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Loader2, DollarSign, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Payments() {
  const { profile } = useAuth();
  const { currentBuildingId } = useBuilding();
  const [loading, setLoading] = useState(true);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    checkPaymentConfig();
    fetchPayments();
  }, [profile]);

  const checkPaymentConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-config');
      
      if (error) throw error;
      
      console.log('[payments] Config:', data);
      setPaymentsEnabled(data.enabled);
    } catch (error) {
      console.error('[payments] Failed to check payment config:', error);
      setPaymentsEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('due_date', { ascending: false });
      
      if (error) throw error;
      
      console.log('[payments] Fetched payments:', data);
      setPayments(data || []);
    } catch (error) {
      console.error('[payments] Failed to fetch payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive",
      });
    }
  };

  const handlePayNow = () => {
    if (!paymentsEnabled) {
      toast({
        title: "Payments disabled",
        description: "Could not start checkout (payments disabled).",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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

      {!paymentsEnabled && profile?.role === 'manager' && (
        <Alert className="mb-6 border-warning/50 bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            Payments are not configured. You can still create invoices; residents won't be able to pay until setup is complete.
          </AlertDescription>
        </Alert>
      )}

      {!paymentsEnabled && profile?.role !== 'manager' && (
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
                <CardTitle>Maintenance Expenses</CardTitle>
                <CardDescription>
                  Building maintenance payments and expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payments.filter(p => p.type === 'maintenance').length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Paid Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.filter(p => p.type === 'maintenance').map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.description}</TableCell>
                          <TableCell>{formatAmount(payment.amount)}</TableCell>
                          <TableCell>{format(new Date(payment.due_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {payment.paid_date ? format(new Date(payment.paid_date), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No maintenance payments</p>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Rental Payments
                </CardTitle>
                <CardDescription>
                  Monthly rent and utilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payments.filter(p => p.type === 'rental' || p.type === 'utilities').length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Paid Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.filter(p => p.type === 'rental' || p.type === 'utilities').map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.description}</TableCell>
                          <TableCell className="capitalize">{payment.type}</TableCell>
                          <TableCell>{formatAmount(payment.amount)}</TableCell>
                          <TableCell>{format(new Date(payment.due_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {payment.paid_date ? format(new Date(payment.paid_date), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No payments to display</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
