import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/admin" className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Admin Portal</h1>
                  {profile && (
                    <p className="text-xs text-muted-foreground">
                      {profile.name || profile.email}
                    </p>
                  )}
                </div>
              </Link>
            </div>
            <nav className="flex items-center gap-2">
              <Link to="/admin">
                <Button
                  variant={isActive("/admin") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Buildings</span>
                </Button>
              </Link>
              <Link to="/admin/profile">
                <Button
                  variant={isActive("/admin/profile") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Profile</span>
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
