import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertsCard } from "@/components/maintenance/AlertsCard";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { Clock, Star, Wrench, CheckCircle } from "lucide-react";

interface Ticket {
  id: string;
  created_at: string;
  updated_at?: string;
  status: string;
  actual_cost: number | null;
  satisfaction_rating: number | null;
}

interface MonthlyData {
  month: string;
  tickets_opened: number;
  tickets_resolved: number;
  total_cost: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { buildingId } = useParams();
  const { currentBuildingId, setCurrentBuildingId } = useBuilding();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (buildingId && buildingId !== currentBuildingId) {
      setCurrentBuildingId(buildingId);
    }
  }, [buildingId, currentBuildingId, setCurrentBuildingId]);

  useEffect(() => {
    const isManagerOrAdmin = profile?.role === "manager" || profile?.role === "admin";
    if (isManagerOrAdmin && currentBuildingId) {
      loadTickets();
    }
  }, [profile, currentBuildingId]);

  const loadTickets = async () => {
    if (!currentBuildingId) return;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // @ts-ignore - Supabase query type issue
    const { data, error } = await supabase
      .from("maintenance_tickets")
      .select("id, created_at, updated_at, status, actual_cost, satisfaction_rating")
      .eq("building_id", currentBuildingId)
      .gte("created_at", sixMonthsAgo.toISOString());

    if (error) {
      console.error("Failed to load tickets:", error);
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  // Compute metrics client-side
  const computeMetrics = () => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisMonthTickets = tickets.filter(t => 
      new Date(t.created_at) >= currentMonth
    );

    const resolvedThisMonth = thisMonthTickets.filter(t => t.status === 'resolved');
    
    // Avg Satisfaction
    const avgSatisfaction = resolvedThisMonth.length > 0
      ? resolvedThisMonth
          .filter(t => t.satisfaction_rating !== null)
          .reduce((sum, t) => sum + (t.satisfaction_rating || 0), 0) / 
        resolvedThisMonth.filter(t => t.satisfaction_rating !== null).length
      : 0;

    // Total Cost
    const totalCost = thisMonthTickets.reduce((sum, t) => sum + (t.actual_cost || 0), 0);

    // Response Time: created_at to updated_at (proxy for first status change)
    const responseTimes = thisMonthTickets
      .filter(t => t.updated_at && t.status !== 'open')
      .map(t => {
        const created = new Date(t.created_at).getTime();
        const updated = new Date(t.updated_at!).getTime();
        return (updated - created) / (1000 * 60 * 60); // hours
      });

    const medianResponseTime = responseTimes.length > 0
      ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
      : 0;

    // Resolution Time: created_at to updated_at for resolved tickets
    const resolutionTimes = resolvedThisMonth
      .filter(t => t.updated_at)
      .map(t => {
        const created = new Date(t.created_at).getTime();
        const updated = new Date(t.updated_at!).getTime();
        return (updated - created) / (1000 * 60 * 60); // hours
      });

    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
      : 0;

    return {
      opened: thisMonthTickets.length,
      resolved: resolvedThisMonth.length,
      avgSatisfaction: avgSatisfaction || 0,
      totalCost,
      medianResponseTime,
      avgResolutionTime,
    };
  };

  const computeMonthlyTrends = (): MonthlyData[] => {
    const monthMap = new Map<string, { opened: number; resolved: number; cost: number }>();

    tickets.forEach(ticket => {
      const date = new Date(ticket.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { opened: 0, resolved: 0, cost: 0 });
      }
      
      const entry = monthMap.get(monthKey)!;
      entry.opened++;
      if (ticket.status === 'resolved') entry.resolved++;
      entry.cost += ticket.actual_cost || 0;
    });

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        tickets_opened: data.opened,
        tickets_resolved: data.resolved,
        total_cost: data.cost,
      }));
  };

  const metrics = computeMetrics();
  const monthlyData = computeMonthlyTrends();

  const isManagerOrAdmin = profile?.role === "manager" || profile?.role === "admin";

  if (!isManagerOrAdmin) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            Dashboard is only available for managers and admins
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
            Key performance indicators and recurring issue alerts
          </p>
        </div>

        <AlertsCard />

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading metrics...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tickets Opened</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.opened}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tickets Resolved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.resolved}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Median Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.medianResponseTime > 0 
                      ? `${metrics.medianResponseTime.toFixed(1)}h` 
                      : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">Median time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.avgResolutionTime > 0 
                      ? `${metrics.avgResolutionTime.toFixed(1)}h` 
                      : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">Average time</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalCost.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.avgSatisfaction > 0 ? metrics.avgSatisfaction.toFixed(1) : "N/A"}
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
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
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
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
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
