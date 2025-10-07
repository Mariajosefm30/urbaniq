import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertsCard } from "@/components/maintenance/AlertsCard";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { TrendingUp, Clock, Star, DollarSign, Wrench, CheckCircle } from "lucide-react";

interface MonthlyMetrics {
  month: string;
  tickets_opened: number;
  tickets_resolved: number;
  median_response_time: string;
  avg_resolution_time: string;
  avg_satisfaction: number;
  total_cost: number;
  avg_cost: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<MonthlyMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === "manager") {
      loadMetrics();
    }
  }, [profile]);

  const loadMetrics = async () => {
    const { data, error } = await supabase
      .rpc("get_monthly_metrics")
      .limit(6);

    if (error) {
      console.error("Failed to load metrics:", error);
    } else {
      const typedData = (data || []) as unknown as MonthlyMetrics[];
      setMetrics(typedData.reverse());
    }
    setLoading(false);
  };

  const formatDuration = (interval: string | null) => {
    if (!interval) return "N/A";
    const match = interval.match(/(\d+):(\d+):(\d+)/);
    if (!match) return interval;
    const [_, hours, minutes] = match;
    return `${hours}h ${minutes}m`;
  };

  const latestMetrics = metrics[metrics.length - 1];

  if (profile?.role !== "manager") {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            Dashboard is only available for managers
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Maintenance Dashboard</h2>
          <p className="text-muted-foreground">
            Key performance indicators and predictive insights
          </p>
        </div>

        <AlertsCard />

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading metrics...</div>
        ) : !latestMetrics ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No metrics available yet
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tickets Opened</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestMetrics.tickets_opened}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tickets Resolved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestMetrics.tickets_resolved}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatDuration(latestMetrics.avg_resolution_time)}
                  </div>
                  <p className="text-xs text-muted-foreground">Average</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {latestMetrics.avg_satisfaction?.toFixed(1) || "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">Out of 5</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Tickets Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="tickets_opened" 
                        stroke="hsl(var(--primary))" 
                        name="Opened"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="tickets_resolved" 
                        stroke="hsl(var(--chart-2))" 
                        name="Resolved"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Costs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                      />
                      <Legend />
                      <Bar 
                        dataKey="total_cost" 
                        fill="hsl(var(--chart-3))" 
                        name="Total Cost"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
