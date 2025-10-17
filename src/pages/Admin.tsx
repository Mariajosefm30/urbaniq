import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import PortfolioTab from "@/components/admin/PortfolioTab";
import SetupTab from "@/components/admin/SetupTab";

export default function Admin() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);

  useEffect(() => {
    if (!loading && profile?.role !== 'admin') {
      navigate('/');
    }
  }, [loading, profile, navigate]);

  useEffect(() => {
    if (profile?.org_id) {
      loadOrganization();
    }
  }, [profile?.org_id]);

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
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <Building2 className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              You need to be assigned to an organization to access the admin portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please contact your system administrator.
            </p>
          </CardContent>
        </Card>
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

      <Tabs defaultValue="portfolio" className="space-y-6">
        <TabsList>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>

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
