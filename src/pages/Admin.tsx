import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PortfolioTab from "@/components/admin/PortfolioTab";
import SetupTab from "@/components/admin/SetupTab";
import CreateOrganizationDialog from "@/components/admin/CreateOrganizationDialog";
import BuildingsSection from "@/components/admin/BuildingsSection";
import UnitsSection from "@/components/admin/UnitsSection";

export default function Admin() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<{ id: string; name: string } | null>(null);
  const [showOrgDialog, setShowOrgDialog] = useState(false);

  useEffect(() => {
    if (!loading && profile?.role !== 'admin') {
      navigate('/');
    }
  }, [loading, profile, navigate]);

  useEffect(() => {
    if (profile?.org_id) {
      loadOrganization();
    } else if (profile && !profile.org_id) {
      setShowOrgDialog(true);
    }
  }, [profile?.org_id, profile]);

  const loadOrganization = async () => {
    if (!profile?.org_id) return;

    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.org_id)
      .single();

    setOrganization(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  if (!profile?.org_id) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to Admin Portal</h1>
          <p className="text-muted-foreground">
            Let's get started by creating your organization
          </p>
        </div>
        <CreateOrganizationDialog 
          userId={profile!.id}
          onOrganizationCreated={() => {
            setShowOrgDialog(false);
            loadOrganization();
          }}
          open={showOrgDialog}
          onOpenChange={setShowOrgDialog}
        />
      </div>
    );
  }

  if (selectedBuilding) {
    return (
      <div className="container mx-auto py-8 px-4">
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
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Portal</h1>
        <p className="text-muted-foreground">
          {organization?.name || "Manage your organization"}
        </p>
      </div>

      <Tabs defaultValue="buildings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="buildings">Buildings</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="buildings" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <BuildingsSection 
                orgId={profile.org_id} 
                onBuildingSelect={(id: string, name: string) => setSelectedBuilding({ id, name })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <PortfolioTab orgId={profile.org_id} />
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <SetupTab 
            organization={organization} 
            onOrganizationUpdate={loadOrganization}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
