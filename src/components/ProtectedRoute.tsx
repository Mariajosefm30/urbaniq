import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  roles?: AppRole[]; // any of these roles allowed
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, memberships, loading, isPlatformAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (memberships.length === 0) {
    return <Navigate to="/no-access" replace />;
  }

  if (roles && !isPlatformAdmin) {
    const has = memberships.some((m) => roles.includes(m.role));
    if (!has) return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
