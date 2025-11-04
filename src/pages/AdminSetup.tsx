import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";

export default function AdminSetup() {
  const { profile } = useAuth();
  const { session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [orgName, setOrgName] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [buildingAddress, setBuildingAddress] = useState("");

  // Role guard - only admins allowed
  useEffect(() => {
    if (sessionLoading) return;
    
    if (session?.role !== 'admin') {
      if (session?.role === 'manager') {
        navigate('/manager');
      } else if (session?.role === 'resident') {
        navigate('/feed');
      } else {
        navigate('/auth');
      }
    }
  }, [session, sessionLoading, navigate]);

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      toast.error("Please enter an organization name");
      return;
    }

    setLoading(true);
    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: orgName })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update profile with org_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ org_id: org.id })
        .eq("id", profile!.id);

      if (profileError) throw profileError;

      toast.success("Organization created successfully!");
      setStep(2);
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast.error(error.message || "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBuilding = async () => {
    if (!buildingName.trim()) {
      toast.error("Please enter a building name");
      return;
    }

    setLoading(true);
    try {
      // Get the org_id
      const { data: profileData } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", profile!.id)
        .single();

      if (!profileData?.org_id) {
        toast.error("Organization not found");
        return;
      }

      // Create building
      const { error: buildingError } = await supabase
        .from("buildings")
        .insert({
          name: buildingName,
          address: buildingAddress,
          org_id: profileData.org_id
        });

      if (buildingError) throw buildingError;

      toast.success("Building created successfully!");
      navigate("/admin");
    } catch (error: any) {
      console.error("Error creating building:", error);
      toast.error(error.message || "Failed to create building");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Setup</h1>
        <p className="text-muted-foreground">
          Let's get your organization set up
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            1
          </div>
          <div className="flex-1 h-1 bg-muted">
            <div className={`h-full ${step >= 2 ? 'bg-primary' : 'bg-muted'} transition-all`} />
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            2
          </div>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Create Organization</CardTitle>
            <CardDescription>
              Enter your organization name to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                placeholder="e.g., Acme Properties"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateOrganization()}
              />
            </div>
            <Button 
              onClick={handleCreateOrganization} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Create Your First Building</CardTitle>
            <CardDescription>
              Add a building to your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buildingName">Building Name</Label>
              <Input
                id="buildingName"
                placeholder="e.g., Main Tower"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buildingAddress">Address (optional)</Label>
              <Input
                id="buildingAddress"
                placeholder="e.g., 123 Main St, City"
                value={buildingAddress}
                onChange={(e) => setBuildingAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateBuilding()}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </Button>
              <Button 
                onClick={handleCreateBuilding} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Finish Setup
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
