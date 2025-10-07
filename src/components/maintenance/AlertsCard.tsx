import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, X } from "lucide-react";
import { format } from "date-fns";

interface Ticket {
  id: string;
  title: string;
  category: string;
  unit: string | null;
  created_at: string;
}

interface Alert {
  key: string;
  category: string;
  unit: string | null;
  count: number;
  tickets: Ticket[];
}

export function AlertsCard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    const stored = localStorage.getItem("dismissedAlerts");
    if (stored) {
      setDismissed(JSON.parse(stored));
    }
  }, []);

  const loadAlerts = async () => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data, error } = await supabase
      .from("maintenance_tickets")
      .select("id, title, category, unit, created_at")
      .gte("created_at", sixtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load tickets:", error);
    } else {
      const grouped = new Map<string, Ticket[]>();
      
      (data || []).forEach((ticket) => {
        const key = `${ticket.category}|${ticket.unit || "none"}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(ticket);
      });

      const alertList: Alert[] = [];
      grouped.forEach((tickets, key) => {
        if (tickets.length >= 3) {
          const [category, unitKey] = key.split("|");
          alertList.push({
            key,
            category,
            unit: unitKey === "none" ? null : unitKey,
            count: tickets.length,
            tickets,
          });
        }
      });

      setAlerts(alertList);
    }
    setLoading(false);
  };

  const dismissAlert = (key: string) => {
    const updated = [...dismissed, key];
    setDismissed(updated);
    localStorage.setItem("dismissedAlerts", JSON.stringify(updated));
  };

  const visibleAlerts = alerts.filter((alert) => !dismissed.includes(alert.key));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recurring Issues</CardTitle>
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
              Recurring Issues
            </CardTitle>
            <CardDescription>
              Detected issues with 3+ incidents in the last 60 days
            </CardDescription>
          </div>
          {visibleAlerts.length > 0 && (
            <Badge variant="destructive">{visibleAlerts.length} active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {visibleAlerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>No recurring issues detected</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleAlerts.map((alert) => (
              <div
                key={alert.key}
                className="flex items-start justify-between p-4 border rounded-lg bg-destructive/5"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="font-medium">
                      {alert.category.charAt(0).toUpperCase() + alert.category.slice(1)}
                      {alert.unit && ` - Unit ${alert.unit}`}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {alert.count} incidents in the last 60 days — recommend service
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last seen: {format(new Date(alert.tickets[0].created_at), "PPp")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dismissAlert(alert.key)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
