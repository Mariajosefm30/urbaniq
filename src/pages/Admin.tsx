import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import BuildingsSection from "@/components/admin/BuildingsSection";
import UnitsSection from "@/components/admin/UnitsSection";
import AdminLayout from "@/components/admin/AdminLayout";

export default function Admin() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedBuilding, setSelectedBuilding] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!loading && profile?.role !== 'admin') {
      navigate('/');
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

  if (selectedBuilding) {
    return (
      <AdminLayout>
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setSelectedBuilding(null)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Buildings
        </Button>
        <UnitsSection 
          buildingId={selectedBuilding.id} 
          buildingName={selectedBuilding.name}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Buildings</h1>
        <p className="text-muted-foreground">
          Manage all buildings in your portfolio
        </p>
      </div>

      <BuildingsSection 
        orgId={profile.org_id} 
        onBuildingSelect={(id: string, name: string) => setSelectedBuilding({ id, name })}
      />
    </AdminLayout>
  );
}
