import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Building2, ClipboardList, Users, LogOut, Shield, MessageSquare, BarChart3, Settings, Home, AlertCircle, DollarSign, Dumbbell, Rss } from "lucide-react";
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
  const [paymentsMode, setPaymentsMode] = useState<string>('disabled');
  
  const isManager = profile?.role === 'manager';
  const isAdmin = profile?.role === 'admin';
  const isResident = profile?.role === 'resident';
  
  const showNav = !isAdmin;

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (isManager && user?.id) {
      loadBuildings();
    }
    checkPaymentsMode();
  }, [isManager, user?.id]);

  const checkPaymentsMode = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-config');
      if (error) throw error;
      setPaymentsMode(data.mode || 'disabled');
    } catch (error) {
      console.error('[layout] Failed to check payments mode:', error);
      setPaymentsMode('disabled');
    }
  };

  const loadBuildings = async () => {
    if (!user?.id || !isManager) return;

    const { data } = await supabase
      .from('manager_buildings')
      .select(`
        building_id,
        buildings_new!inner(id, name, address)
      `)
      .eq('user_id', user.id);

    if (data) {
      const buildingsList = data.map((mb: any) => mb.buildings_new).filter(Boolean);
      setBuildings(buildingsList);
    }
  };

  const handleBuildingChange = async (buildingId: string) => {
    setCurrentBuildingId(buildingId);
    if (user) {
      await persistLastBuilding(buildingId, user.id);
    }
    navigate(`/buildings/${buildingId}/dashboard`);
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
              <Badge 
                variant="secondary" 
                className="gap-1 text-xs"
                title={paymentsMode !== 'mercadopago' ? "Configure Mercado Pago to accept online payments." : "Payments enabled"}
              >
                <DollarSign className="h-3 w-3" />
                Payments: {paymentsMode === 'mercadopago' ? 'Enabled' : 'Disabled'}
              </Badge>

              {isManager && !isAdmin && buildings.length > 0 && (
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
                  {isManager && (
                    <Link to="/manager">
                      <Button
                        variant={isActive("/manager") ? "default" : "ghost"}
                        size="sm"
                        className="gap-2"
                      >
                        <Building2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Buildings</span>
                      </Button>
                    </Link>
                  )}
                  
                  {isManager && currentBuildingId && (
                    <>
                      <Link to={`/buildings/${currentBuildingId}/dashboard`}>
                        <Button
                          variant={location.pathname.includes("/dashboard") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span className="hidden sm:inline">Dashboard</span>
                        </Button>
                      </Link>
                      <Link to={`/buildings/${currentBuildingId}/messages`}>
                        <Button
                          variant={location.pathname.includes("/messages") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span className="hidden sm:inline">Messages</span>
                        </Button>
                      </Link>
                      <Link to={`/buildings/${currentBuildingId}/tickets`}>
                        <Button
                          variant={location.pathname.includes("/tickets") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <ClipboardList className="h-4 w-4" />
                          <span className="hidden sm:inline">Tickets</span>
                        </Button>
                      </Link>
                      <Link to={`/buildings/${currentBuildingId}/units`}>
                        <Button
                          variant={location.pathname.includes("/units") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <Home className="h-4 w-4" />
                          <span className="hidden sm:inline">Units</span>
                        </Button>
                      </Link>
                      <Link to={`/buildings/${currentBuildingId}/guests`}>
                        <Button
                          variant={location.pathname.includes("/guests") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <Users className="h-4 w-4" />
                          <span className="hidden sm:inline">Guests</span>
                        </Button>
                      </Link>
                      <Link to={`/buildings/${currentBuildingId}/payments`}>
                        <Button
                          variant={location.pathname.includes("/payments") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <DollarSign className="h-4 w-4" />
                          <span className="hidden sm:inline">Payments</span>
                        </Button>
                      </Link>
                      <Link to={`/buildings/${currentBuildingId}/amenities`}>
                        <Button
                          variant={location.pathname.includes("/amenities") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <Dumbbell className="h-4 w-4" />
                          <span className="hidden sm:inline">Amenities</span>
                        </Button>
                      </Link>
                      <Link to={`/buildings/${currentBuildingId}/feed`}>
                        <Button
                          variant={location.pathname.includes("/feed") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <Rss className="h-4 w-4" />
                          <span className="hidden sm:inline">Feed</span>
                        </Button>
                      </Link>
                    </>
                  )}
                  
                  {isResident && currentBuildingId && (
                    <>
                      <Link to={`/buildings/${currentBuildingId}/feed`}>
                        <Button
                          variant={location.pathname.includes("/feed") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <Rss className="h-4 w-4" />
                          <span className="hidden sm:inline">Feed</span>
                        </Button>
                      </Link>
                      <Link to={`/buildings/${currentBuildingId}/amenities`}>
                        <Button
                          variant={location.pathname.includes("/amenities") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <Dumbbell className="h-4 w-4" />
                          <span className="hidden sm:inline">Amenities</span>
                        </Button>
                      </Link>
                      <Link to={`/buildings/${currentBuildingId}/guests`}>
                        <Button
                          variant={location.pathname.includes("/guests") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <Users className="h-4 w-4" />
                          <span className="hidden sm:inline">Guests</span>
                        </Button>
                      </Link>
                      <Link to={`/buildings/${currentBuildingId}/tickets`}>
                        <Button
                          variant={location.pathname.includes("/tickets") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <ClipboardList className="h-4 w-4" />
                          <span className="hidden sm:inline">Maintenance</span>
                        </Button>
                      </Link>
                      <Link to={`/buildings/${currentBuildingId}/payments`}>
                        <Button
                          variant={location.pathname.includes("/payments") ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                        >
                          <DollarSign className="h-4 w-4" />
                          <span className="hidden sm:inline">Payments</span>
                        </Button>
                      </Link>
                    </>
                  )}
                  
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
