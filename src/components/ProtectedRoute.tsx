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

  // Wait for both auth and session to be ready
  if (authLoading || sessionLoading || hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.info('[guard]', location.pathname, { decision: 'redirect to /auth (no user)' });
    return <Navigate to="/auth" replace />;
  }

  // Admin routes - only admins allowed
  if (location.pathname.startsWith('/admin')) {
    if (session?.role !== 'admin') {
      console.info('[guard]', location.pathname, { 
        decision: 'forbidden (not admin)', 
        role: session?.role 
      });
      // Redirect non-admins to their home
      if (session?.role === 'manager') {
        return <Navigate to="/manager" replace />;
      } else if (session?.role === 'resident') {
        const buildingId = profile?.building_id || profile?.last_building_id;
        return <Navigate to={buildingId ? `/buildings/${buildingId}/feed` : '/feed'} replace />;
      }
      return <Navigate to="/auth" replace />;
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

    if (session.org_id && location.pathname === '/admin/setup') {
      console.info('[route-decider]', { 
        role: session.role, 
        org_id: session.org_id, 
        last_building_id: session.last_building_id, 
        target: '/admin' 
      });
      return <Navigate to="/admin" replace />;
    }
  }

  // Manager routes - managers and admins allowed
  if (location.pathname.startsWith('/manager') || location.pathname.startsWith('/buildings')) {
    // Resident-allowed building routes
    const residentPaths = ['/feed', '/amenities', '/guests', '/tickets', '/payments'];
    const isResidentAllowedPath = buildingId && residentPaths.some(path => 
      location.pathname.includes(path)
    );

    if (isResidentAllowedPath) {
      // Allow resident, manager, and admin
      const allowedRoles = ['resident', 'manager', 'admin'];
      if (session?.role && !allowedRoles.includes(session.role)) {
        console.info('[guard]', location.pathname, { 
          decision: 'forbidden (not allowed role)', 
          role: session?.role 
        });
        return <Navigate to="/auth" replace />;
      }
    } else {
      // Manager/admin only paths
      if (session?.role !== 'admin' && session?.role !== 'manager') {
        console.info('[guard]', location.pathname, { 
          decision: 'forbidden (not admin/manager)', 
          role: session?.role 
        });
        // Redirect residents to their building feed
        if (session?.role === 'resident') {
          const buildingId = profile?.building_id || profile?.last_building_id;
          return <Navigate to={buildingId ? `/buildings/${buildingId}/feed` : '/feed'} replace />;
        }
        return <Navigate to="/auth" replace />;
      }
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
