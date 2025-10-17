import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2, Ticket, CreditCard, UserPlus } from "lucide-react";
import { useBuilding } from "@/contexts/BuildingContext";

interface Building {
  id: string;
  name: string;
  address: string | null;
  openTickets: number;
  inProgressTickets: number;
  newGuests: number;
}

export default function Manager() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { setCurrentBuildingId } = useBuilding();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && profile?.role !== 'manager' && profile?.role !== 'admin') {
      navigate('/');
    }
  }, [authLoading, profile, navigate]);

  useEffect(() => {
    if (profile?.id) {
      loadBuildings();
    }
  }, [profile?.id]);

  const loadBuildings = async () => {
    try {
      // Get buildings assigned to this manager
      const { data: assignments } = await supabase
        .from("manager_buildings")
        .select("building_id")
        .eq("user_id", profile!.id);

      if (!assignments || assignments.length === 0) {
        setBuildings([]);
        setLoading(false);
        return;
      }

      const buildingIds = assignments.map(a => a.building_id);

      // Get building details
      const { data: buildingsData } = await supabase
        .from("buildings")
        .select("*")
        .in("id", buildingIds);

      // Get counts for each building
      const buildingsWithCounts = await Promise.all(
        (buildingsData || []).map(async (building) => {
          const { count: openCount } = await (supabase as any)
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("building_id", building.id)
            .eq("status", "open");

          const { count: inProgressCount } = await (supabase as any)
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("building_id", building.id)
            .eq("status", "in_progress");

          const { count: guestCount } = await (supabase as any)
            .from("guest_passes")
            .select("*", { count: "exact", head: true })
            .eq("building_id", building.id)
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          return {
            id: building.id,
            name: building.name,
            address: building.address,
            openTickets: openCount || 0,
            inProgressTickets: inProgressCount || 0,
            newGuests: guestCount || 0,
          };
        })
      );

      setBuildings(buildingsWithCounts);
    } catch (error) {
      console.error("Error loading buildings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuildingClick = async (buildingId: string) => {
    try {
      // Update last_building_id in profile
      await supabase
        .from("profiles")
        .update({ last_building_id: buildingId })
        .eq("id", profile!.id);

      // Set current building in context
      setCurrentBuildingId(buildingId);

      // Navigate to building tickets
      navigate(`/buildings/${buildingId}/tickets`);
    } catch (error) {
      console.error("Error setting building:", error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role !== 'manager' && profile?.role !== 'admin') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (buildings.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Buildings</h1>
          <p className="text-muted-foreground">
            Select a building to manage
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No buildings assigned</h3>
              <p className="text-muted-foreground">
                Contact your administrator to get access to buildings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Buildings</h1>
        <p className="text-muted-foreground">
          Select a building to manage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.map((building) => (
          <Card
            key={building.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleBuildingClick(building.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {building.name}
                  </CardTitle>
                  {building.address && (
                    <CardDescription className="mt-2">
                      {building.address}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                    <Ticket className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold">{building.openTickets}</div>
                  <div className="text-xs text-muted-foreground">Open</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold">{building.inProgressTickets}</div>
                  <div className="text-xs text-muted-foreground">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold">{building.newGuests}</div>
                  <div className="text-xs text-muted-foreground">New Guests</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
