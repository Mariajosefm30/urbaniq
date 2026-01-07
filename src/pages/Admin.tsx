import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import BuildingsSection from "@/components/admin/BuildingsSection";
import AdminLayout from "@/components/admin/AdminLayout";

export default function Admin() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  // Admin-only access guard
  useEffect(() => {
    if (loading) return;
    
    if (!profile) {
      navigate('/auth');
      return;
    }
    
    if (profile.role !== 'admin') {
      // Redirect based on their actual role
      if (profile.role === 'manager') {
        navigate('/manager');
      } else if (profile.role === 'resident') {
        navigate('/feed');
      } else {
        navigate('/auth');
      }
    }
  }, [loading, profile, navigate]);

  useEffect(() => {
    if (profile && !profile.org_id && !loading) {
      navigate('/admin/setup');
    }
  }, [profile?.org_id, profile, loading, navigate]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  // If no org, redirect to setup
  if (!profile?.org_id) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Buildings</h1>
        <p className="text-muted-foreground">
          Manage all buildings in your portfolio. Click a building to access management options.
        </p>
      </div>

      <BuildingsSection orgId={profile.org_id} />
    </AdminLayout>
  );
}
