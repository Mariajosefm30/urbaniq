import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, AlertCircle, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";

interface Building {
  id: string;
  name: string;
  address: string | null;
  org_id: string;
  ticketCounts: {
    open: number;
    in_progress: number;
  };
  paymentCounts: {
    due: number;
    overdue: number;
  };
  guestCount: number;
}

export default function ManagerHome() {
  const { profile } = useAuth();
  const { setCurrentBuildingId } = useBuilding();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'manager') {
      loadBuildings();
    }
  }, [profile]);

  const loadBuildings = async () => {
    setLoading(true);

    if (!profile?.org_id) {
      toast.error("No organization assigned to your profile");
      setLoading(false);
      return;
    }

    // Fetch buildings for the manager's org
    const { data: buildingsData, error: buildingsError } = await supabase
      .from('buildings_new')
      .select('*')
      .eq('org_id', profile.org_id);

    if (buildingsError) {
      toast.error("Failed to load buildings");
      console.error(buildingsError);
      setLoading(false);
      return;
    }

    // For each building, fetch counts
    const buildingsWithCounts = await Promise.all(
      (buildingsData || []).map(async (building) => {
        // Ticket counts (assuming maintenance_tickets has building_id or we filter by unit)
        const { data: ticketsData } = await supabase
          .from('maintenance_tickets')
          .select('status')
          .or(`status.eq.open,status.eq.in_progress`);

        const ticketCounts = {
          open: ticketsData?.filter(t => t.status === 'open').length || 0,
          in_progress: ticketsData?.filter(t => t.status === 'in_progress').length || 0,
        };

        // Payment counts - placeholder (you'd need a payments table)
        const paymentCounts = {
          due: 0,
          overdue: 0,
        };

        // Guest count with demo_code_status='new'
        const { count: guestCount } = await supabase
          .from('guests')
          .select('*', { count: 'exact', head: true })
          .eq('demo_code_status', 'new');

        return {
          ...building,
          ticketCounts,
          paymentCounts,
          guestCount: guestCount || 0,
        };
      })
    );

    setBuildings(buildingsWithCounts);
    setLoading(false);
  };

  const handleBuildingClick = (buildingId: string) => {
    setCurrentBuildingId(buildingId);
    navigate(`/buildings/${buildingId}/tickets`);
  };

  if (profile?.role !== 'manager') {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">This page is only accessible to managers.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Buildings</h1>
          <p className="text-muted-foreground">Manage all buildings in your organization</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading buildings...</p>
          </div>
        ) : buildings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No buildings found. Contact your administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buildings.map((building) => (
              <Card
                key={building.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleBuildingClick(building.id)}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Building2 className="h-8 w-8 text-primary mt-1" />
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{building.name}</CardTitle>
                      {building.address && (
                        <CardDescription className="text-sm">{building.address}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Tickets Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Tickets</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {building.ticketCounts.open} Open
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {building.ticketCounts.in_progress} In Progress
                      </Badge>
                    </div>
                  </div>

                  {/* Payments Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Payments</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {building.paymentCounts.due} Due
                      </Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {building.paymentCounts.overdue} Overdue
                      </Badge>
                    </div>
                  </div>

                  {/* Guests Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">New Guests</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {building.guestCount}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
