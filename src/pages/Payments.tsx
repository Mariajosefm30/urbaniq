import { useEffect, useState, useRef } from "react";
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
import { Loader2, DollarSign, AlertCircle, CheckCircle, Clock, Upload, FileText } from "lucide-react";
import { format } from "date-fns";

export default function Payments() {
  const { profile } = useAuth();
  const { currentBuildingId } = useBuilding();
  const [loading, setLoading] = useState(true);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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

  const handleUploadReceipt = async (paymentId: string, file: File) => {
    setUploadingId(paymentId);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${paymentId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('payments')
        .update({ receipt_url: filePath })
        .eq('id', paymentId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Receipt uploaded successfully",
      });

      await fetchPayments();
    } catch (error) {
      console.error('[payments] Failed to upload receipt:', error);
      toast({
        title: "Error",
        description: "Failed to upload receipt",
        variant: "destructive",
      });
    } finally {
      setUploadingId(null);
    }
  };

  const handleFileChange = (paymentId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUploadReceipt(paymentId, file);
    }
  };

  const handleViewReceipt = async (receiptUrl: string) => {
    const { data } = await supabase.storage
      .from('payment-receipts')
      .createSignedUrl(receiptUrl, 60);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
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
                        <TableHead>Receipt</TableHead>
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
                          <TableCell>
                            {payment.receipt_url ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewReceipt(payment.receipt_url)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            ) : (
                              <>
                                <input
                                  ref={(el) => (fileInputRefs.current[payment.id] = el)}
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={(e) => handleFileChange(payment.id, e)}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => fileInputRefs.current[payment.id]?.click()}
                                  disabled={uploadingId === payment.id}
                                >
                                  {uploadingId === payment.id ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4 mr-1" />
                                  )}
                                  Upload
                                </Button>
                              </>
                            )}
                          </TableCell>
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
