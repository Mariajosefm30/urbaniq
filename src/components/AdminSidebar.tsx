import { useAuth } from "@/contexts/AuthContext";
import { Building2, LogOut, User, LayoutDashboard } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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

export function AdminSidebar() {
  const { state } = useSidebar();
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-muted/50";

  const adminItems = [
    { title: "Buildings", url: "/admin", icon: Building2, exact: true },
    { title: "Portfolio", url: "/admin/portfolio", icon: LayoutDashboard },
    { title: "Profile", url: "/admin/profile", icon: User },
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
                <h2 className="font-bold text-sm">Admin Portal</h2>
                {profile && (
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.name || profile.email}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.exact} 
                      className={getNavCls}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sign Out */}
        <div className="mt-auto border-t">
          <SidebarMenu>
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
