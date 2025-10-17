import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect admins based on org setup status
  if (profile?.role === 'admin') {
    if (!profile.org_id && location.pathname !== '/admin/setup' && !location.pathname.startsWith('/settings')) {
      return <Navigate to="/admin/setup" replace />;
    }
    if (profile.org_id && location.pathname !== '/admin' && location.pathname !== '/admin/setup' && !location.pathname.startsWith('/settings')) {
      return <Navigate to="/admin" replace />;
    }
  }

  // Redirect managers to /manager if not on a valid manager route
  if (profile?.role === 'manager' && !location.pathname.startsWith('/manager') && !location.pathname.startsWith('/buildings') && !location.pathname.startsWith('/settings')) {
    return <Navigate to="/manager" replace />;
  }

  return <>{children}</>;
}
