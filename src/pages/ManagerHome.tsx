import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
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
  const { profile, user } = useAuth();
  const { session, loading: sessionLoading } = useSession();
  const { currentBuildingId, setCurrentBuildingId, persistLastBuilding } = useBuilding();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);

  // Manager-only access guard (admins can access too for debugging)
  useEffect(() => {
    if (sessionLoading) return;
    
    // Redirect to auth if not authenticated
    if (!session) {
      navigate('/auth');
      return;
    }
    
    // Allow managers and admins, block residents
    if (session.role === 'manager' || session.role === 'admin') {
      // Do nothing - authorized
      return;
    } else if (session.role === 'resident') {
      navigate('/feed');
    } else {
      navigate('/auth');
    }
  }, [session, sessionLoading, navigate]);

  useEffect(() => {
    if (profile?.role === 'manager') {
      loadOrganizationAndBuildings();
    }
  }, [profile]);

  // Auto-redirect if building already selected
  useEffect(() => {
    if (currentBuildingId && !loading) {
      navigate(`/buildings/${currentBuildingId}/tickets`);
    }
  }, [currentBuildingId, loading, navigate]);

  const loadOrganizationAndBuildings = async () => {
    setLoading(true);

    // Managers don't need to create organizations - just load buildings
    await loadBuildings();
  };

  const loadBuildings = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Query manager_buildings junction table to get only assigned buildings
    const { data: buildingsData, error: buildingsError } = await supabase
      .from('manager_buildings')
      .select(`
        building_id,
        buildings_new!inner(*)
      `)
      .eq('user_id', user.id);

    if (buildingsError) {
      toast.error("Failed to load buildings");
      console.error(buildingsError);
      setLoading(false);
      return;
    }

    // Extract buildings from the join result
    const extractedBuildings = buildingsData?.map((mb: any) => mb.buildings_new).filter(Boolean) || [];

    // For each building, fetch counts
    const buildingsWithCounts = await Promise.all(
      extractedBuildings.map(async (building: any) => {
        // Get residents (profile ids) for this building via units
        const { data: unitResidents } = await supabase
          .from('units')
          .select('resident_user_id')
          .eq('building_id', building.id)
          .not('resident_user_id', 'is', null);

        const residentIds = (unitResidents || [])
          .map((u: any) => u.resident_user_id)
          .filter(Boolean);

        // Ticket counts for this building
        let ticketCounts = { open: 0, in_progress: 0 };
        if (residentIds.length > 0) {
          const { data: ticketsData } = await supabase
            .from('maintenance_tickets')
            .select('status')
            .in('reporter_id', residentIds);

          ticketCounts = {
            open: ticketsData?.filter(t => t.status === 'open').length || 0,
            in_progress: ticketsData?.filter(t => t.status === 'in_progress').length || 0,
          };
        }

        const paymentCounts = {
          due: 0,
          overdue: 0,
        };

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

  const handleBuildingClick = async (buildingId: string) => {
    setCurrentBuildingId(buildingId);
    if (user) {
      await persistLastBuilding(buildingId, user.id);
    }
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
          <h1 className="text-3xl font-bold mb-2">Your buildings</h1>
          <p className="text-muted-foreground">
            Select a building to manage
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading buildings...</p>
          </div>
        ) : buildings.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">No buildings assigned</h3>
                <p className="text-muted-foreground">
                  Contact your administrator to get assigned to buildings.
                </p>
              </div>
            </CardContent>
          </Card>
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
