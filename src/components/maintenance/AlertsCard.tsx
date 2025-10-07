import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Alert {
  id: string;
  issue_key: string;
  title: string;
  details: {
    asset_id?: string;
    category?: string;
    unit?: string;
    incidents: number;
    window_days: number;
    first_seen: string;
    last_seen: string;
  };
  severity: string;
  created_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

export function AlertsCard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    refreshRecurringAlerts();
  }, []);

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from("maintenance_alerts")
      .select("*")
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Failed to load alerts:", error);
      toast.error("Failed to load alerts");
    } else {
      setAlerts(data || []);
    }
    setLoading(false);
  };

  const refreshRecurringAlerts = async () => {
    // Refresh the materialized view first
    await supabase.rpc("refresh_recurring_alerts");
  };

  const acknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from("maintenance_alerts")
      .update({
        acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) {
      toast.error("Failed to acknowledge alert");
    } else {
      toast.success("Alert acknowledged");
      loadAlerts();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Predictive Alerts</CardTitle>
          <CardDescription>Loading alerts...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Predictive Alerts
            </CardTitle>
            <CardDescription>
              Recurring issues detected in the last 60 days
            </CardDescription>
          </div>
          {alerts.length > 0 && (
            <Badge variant="destructive">{alerts.length} active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>No recurring issues detected</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={
                        alert.severity === "high"
                          ? "destructive"
                          : alert.severity === "medium"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {alert.severity}
                    </Badge>
                    <p className="font-medium">{alert.title}</p>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {alert.details.category && (
                      <p>Category: {alert.details.category}</p>
                    )}
                    {alert.details.unit && <p>Unit: {alert.details.unit}</p>}
                    <p>
                      {alert.details.incidents} incidents in last{" "}
                      {alert.details.window_days} days
                    </p>
                    <p className="text-xs">
                      Last seen:{" "}
                      {format(new Date(alert.details.last_seen), "PPp")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => acknowledgeAlert(alert.id)}
                >
                  Acknowledge
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
