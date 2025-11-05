import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Building, Dumbbell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BuildingsSection from "@/components/admin/BuildingsSection";
import UnitsSection from "@/components/admin/UnitsSection";
import AmenitiesSection from "@/components/admin/AmenitiesSection";
import AdminLayout from "@/components/admin/AdminLayout";
import { useBuilding } from "@/contexts/BuildingContext";

export default function Admin() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedBuilding, setSelectedBuilding] = useState<{ id: string; name: string } | null>(null);

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
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{selectedBuilding.name}</h2>
          <p className="text-muted-foreground">Manage units and amenities</p>
        </div>

        <Tabs defaultValue="units" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="units" className="gap-2">
              <Building className="h-4 w-4" />
              Units
            </TabsTrigger>
            <TabsTrigger value="amenities" className="gap-2">
              <Dumbbell className="h-4 w-4" />
              Amenities
            </TabsTrigger>
          </TabsList>
          <TabsContent value="units" className="mt-6">
            <UnitsSection 
              buildingId={selectedBuilding.id} 
              buildingName={selectedBuilding.name}
            />
          </TabsContent>
          <TabsContent value="amenities" className="mt-6">
            <AmenitiesSection 
              buildingId={selectedBuilding.id} 
              buildingName={selectedBuilding.name}
            />
          </TabsContent>
        </Tabs>
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
