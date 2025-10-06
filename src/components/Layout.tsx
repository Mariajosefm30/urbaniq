import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ClipboardList, Users, LogOut, Shield } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Debug: Log profile and environment
  console.log("Profile data:", profile);
  console.log("Environment PROD:", import.meta.env.PROD);
  console.log("Environment DEV:", import.meta.env.DEV);
  console.log("Environment MODE:", import.meta.env.MODE);

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
                <Badge variant="secondary" className="gap-1 text-xs">
                  You are: <span className="font-semibold capitalize">{profile.role}</span>
                </Badge>
              )}
              <Link to="/">
                <Button
                  variant={isActive("/") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Tickets</span>
                </Button>
              </Link>
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
