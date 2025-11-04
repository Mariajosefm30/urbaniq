import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { Building2, ClipboardList, Users, LogOut, MessageSquare, BarChart3, Settings, Home, DollarSign, Dumbbell, Rss } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Building {
  id: string;
  name: string;
  address: string | null;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const { profile, signOut, user } = useAuth();
  const { currentBuildingId, setCurrentBuildingId, persistLastBuilding } = useBuilding();
  const location = useLocation();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [paymentsMode, setPaymentsMode] = useState<string>('disabled');
  
  const isManager = profile?.role === 'manager';
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

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
      console.error('[sidebar] Failed to check payments mode:', error);
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
    navigate(`/buildings/${buildingId}/tickets`);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-muted/50";

  // Manager navigation items
  const managerGlobalItems = [
    { title: "Buildings", url: "/manager", icon: Building2 },
    { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
    { title: "Messages", url: "/messages", icon: MessageSquare },
  ];

  const managerBuildingItems = currentBuildingId ? [
    { title: "Tickets", url: `/buildings/${currentBuildingId}/tickets`, icon: ClipboardList },
    { title: "Units", url: `/buildings/${currentBuildingId}/units`, icon: Home },
    { title: "Guests", url: "/guests", icon: Users },
    { title: "Payments", url: `/buildings/${currentBuildingId}/payments`, icon: DollarSign },
    { title: "Amenities", url: `/buildings/${currentBuildingId}/amenities`, icon: Dumbbell },
    { title: "Feed", url: `/buildings/${currentBuildingId}/feed`, icon: Rss },
  ] : [];

  // Resident navigation items
  const residentItems = [
    { title: "Feed", url: "/feed", icon: Rss },
    { title: "Tickets", url: "/tickets", icon: ClipboardList },
    { title: "Guests", url: "/guests", icon: Users },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Payments", url: "/payments", icon: DollarSign },
    { title: "Amenities", url: "/amenities", icon: Dumbbell },
  ];

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-bold text-sm">BuildingHub</h2>
                {profile && (
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.name}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payments Badge */}
        {!isCollapsed && (
          <div className="px-4 py-2">
            <Badge 
              variant="secondary" 
              className="w-full justify-start gap-2 text-xs"
              title={paymentsMode !== 'mercadopago' ? "Configure Mercado Pago to accept online payments." : "Payments enabled"}
            >
              <DollarSign className="h-3 w-3" />
              {paymentsMode === 'mercadopago' ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        )}

        {/* Building Selector for Managers */}
        {isManager && buildings.length > 0 && !isCollapsed && (
          <div className="px-4 py-2">
            <Select value={currentBuildingId || ""} onValueChange={handleBuildingChange}>
              <SelectTrigger className="w-full">
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
        )}

        {/* Manager Navigation */}
        {isManager && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Main</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {managerGlobalItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {currentBuildingId && (
              <SidebarGroup>
                <SidebarGroupLabel>Building</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {managerBuildingItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={getNavCls}>
                          <item.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}

        {/* Resident Navigation */}
        {!isManager && (
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {residentItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Settings & Sign Out */}
        <div className="mt-auto border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/settings" className={getNavCls}>
                  <Settings className="h-4 w-4" />
                  {!isCollapsed && <span>Settings</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={signOut}>
                <LogOut className="h-4 w-4" />
                {!isCollapsed && <span>Sign Out</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
