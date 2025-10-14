import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, ClipboardList, Users, LogOut, Shield, MessageSquare, BarChart3, Settings, Home, AlertCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Building {
  id: string;
  name: string;
  address: string | null;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut, user } = useAuth();
  const { currentBuildingId, setCurrentBuildingId, persistLastBuilding } = useBuilding();
  const location = useLocation();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  
  const isManager = profile?.role === 'manager';
  const showNav = !isManager || !!currentBuildingId;

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (profile?.org_id) {
      loadBuildings();
    }
  }, [profile?.org_id]);

  const loadBuildings = async () => {
    if (!profile?.org_id) return;

    const { data } = await supabase
      .from('buildings_new')
      .select('id, name, address')
      .eq('org_id', profile.org_id);

    if (data) {
      setBuildings(data);
    }
  };

  const handleBuildingChange = async (buildingId: string) => {
    setCurrentBuildingId(buildingId);
    if (user) {
      await persistLastBuilding(buildingId, user.id);
    }
    navigate(`/buildings/${buildingId}/tickets`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to={isManager ? "/manager" : "/"} className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">BuildingHub</h1>
                  {profile && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {profile.role === "manager" && <Shield className="h-3 w-3" />}
                      {profile.name} {profile.unit && `• Unit ${profile.unit}`}
                    </p>
                  )}
                </div>
              </Link>
            </div>
            <nav className="flex items-center gap-2">
              {isManager && buildings.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mr-2">
                    <span className="text-sm text-muted-foreground">Building:</span>
                    <Select value={currentBuildingId || ""} onValueChange={handleBuildingChange}>
                      <SelectTrigger className="w-[200px] h-9">
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              {showNav && (
                <>
                  <Link to={currentBuildingId ? `/buildings/${currentBuildingId}/tickets` : "/tickets"}>
                    <Button
                      variant={isActive("/tickets") || location.pathname.includes("/buildings/") ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <ClipboardList className="h-4 w-4" />
                      <span className="hidden sm:inline">Tickets</span>
                    </Button>
                  </Link>
                  {isManager && (
                    <Link to="/dashboard">
                      <Button
                        variant={isActive("/dashboard") ? "default" : "ghost"}
                        size="sm"
                        className="gap-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                      </Button>
                    </Link>
                  )}
                  <Link to="/guests">
                    <Button
                      variant={isActive("/guests") ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Guests</span>
                    </Button>
                  </Link>
                  <Link to="/messages">
                    <Button
                      variant={isActive("/messages") ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">Messages</span>
                    </Button>
                  </Link>
                  <Link to="/settings">
                    <Button
                      variant={isActive("/settings") ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Settings</span>
                    </Button>
                  </Link>
                </>
              )}
              
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </nav>
          </div>
        </div>
      </header>
      
      {isManager && !currentBuildingId && (
        <Alert className="container mx-auto mt-4 mx-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Select a building to continue.
          </AlertDescription>
        </Alert>
      )}
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
