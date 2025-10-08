import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ClipboardList, Users, LogOut, Shield, MessageSquare, UserCircle, BarChart3, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleWhoAmI = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whoami');
      
      if (error) {
        console.error('whoami error:', error);
        toast.error('Failed to fetch user info');
        return;
      }
      
      console.log('whoami response:', data);
      toast.success('User info logged to console');
    } catch (err) {
      console.error('whoami exception:', err);
      toast.error('Failed to call whoami');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">PropPass</h1>
                {profile && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {profile.role === "manager" && <Shield className="h-3 w-3" />}
                    {profile.name} {profile.unit && `• Unit ${profile.unit}`}
                  </p>
                )}
              </div>
            </div>
            <nav className="flex items-center gap-2">
              {!import.meta.env.PROD && profile && (
                <>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    You are: <span className="font-semibold capitalize">{profile.role}</span>
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWhoAmI}
                    className="gap-2"
                    title="Debug: Check current user info"
                  >
                    <UserCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Who am I?</span>
                  </Button>
                </>
              )}
              <Link to="/tickets">
                <Button
                  variant={isActive("/tickets") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Tickets</span>
                </Button>
              </Link>
              {profile?.role === "manager" && (
                <>
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
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
