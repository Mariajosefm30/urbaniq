import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const { session, loading: sessionLoading } = useSession();
  const location = useLocation();
  const { buildingId } = useParams();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Check manager building access
  useEffect(() => {
    const checkAccess = async () => {
      if (!session || !buildingId || session.role !== 'manager') {
        setHasAccess(true);
        return;
      }

      const { data, error } = await supabase
        .from('manager_buildings')
        .select('building_id')
        .eq('user_id', session.user_id)
        .eq('building_id', buildingId)
        .single();

      const access = !error && !!data;
      setHasAccess(access);
      console.info('[guard]', location.pathname, { 
        role: session.role, 
        hasAccess: access, 
        buildingId 
      });
    };

    if (buildingId && session?.role === 'manager') {
      checkAccess();
    } else {
      setHasAccess(true);
    }
  }, [buildingId, session, location.pathname]);

  if (authLoading || sessionLoading || hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    console.info('[guard]', location.pathname, { decision: 'redirect to /auth (no user)' });
    return <Navigate to="/auth" replace />;
  }

  // Admin routes
  if (location.pathname.startsWith('/admin')) {
    if (session?.role !== 'admin') {
      console.info('[guard]', location.pathname, { 
        decision: 'forbidden (not admin)', 
        role: session?.role 
      });
      return <Navigate to="/" replace />;
    }

    if (!session.org_id && location.pathname !== '/admin/setup') {
      console.info('[route-decider]', { 
        role: session.role, 
        org_id: session.org_id, 
        last_building_id: session.last_building_id, 
        target: '/admin/setup' 
      });
      return <Navigate to="/admin/setup" replace />;
    }

    if (session.org_id && location.pathname === '/admin/setup' && !location.pathname.startsWith('/settings')) {
      console.info('[route-decider]', { 
        role: session.role, 
        org_id: session.org_id, 
        last_building_id: session.last_building_id, 
        target: '/admin' 
      });
      return <Navigate to="/admin" replace />;
    }
  }

  // Manager routes
  if (location.pathname.startsWith('/manager') || location.pathname.startsWith('/buildings')) {
    if (session?.role !== 'admin' && session?.role !== 'manager') {
      console.info('[guard]', location.pathname, { 
        decision: 'forbidden (not admin/manager)', 
        role: session?.role 
      });
      return <Navigate to="/" replace />;
    }

    // Check building access for managers
    if (buildingId && session?.role === 'manager' && !hasAccess) {
      console.info('[guard]', location.pathname, { 
        decision: 'no access to building', 
        role: session.role, 
        buildingId 
      });
      return <Navigate to="/manager" replace />;
    }
  }

  console.info('[guard]', location.pathname, { 
    role: session?.role, 
    hasAccess: true 
  });

  return <>{children}</>;
}
