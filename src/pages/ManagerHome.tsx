import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, AlertCircle, DollarSign, Users, Plus } from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
}

interface Building {
  id: string;
  name: string;
  address: string | null;
  org_id: string;
  ticketCounts: {
    open: number;
    in_progress: number;
  };
  paymentCounts: {
    due: number;
    overdue: number;
  };
  guestCount: number;
}

export default function ManagerHome() {
  const { profile } = useAuth();
  const { setCurrentBuildingId } = useBuilding();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  
  // Form states
  const [buildingName, setBuildingName] = useState("");
  const [buildingAddress, setBuildingAddress] = useState("");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (profile?.role === 'manager') {
      loadOrganizationAndBuildings();
    }
  }, [profile]);

  const loadOrganizationAndBuildings = async () => {
    setLoading(true);

    // First, check if user has an org_id
    if (!profile?.org_id) {
      // Check if any org exists for this user
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('*')
        .limit(1)
        .single();

      if (!orgsData) {
        setLoading(false);
        setOrgDialogOpen(true);
        return;
      }

      setOrganization(orgsData);
      // Update profile with org_id
      await supabase
        .from('profiles')
        .update({ org_id: orgsData.id })
        .eq('id', profile!.id);
    } else {
      // Fetch organization
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.org_id)
        .single();

      setOrganization(orgData);
    }

    // Now load buildings
    await loadBuildings();
  };

  const loadBuildings = async () => {
    const orgId = organization?.id || profile?.org_id;
    if (!orgId) {
      setLoading(false);
      return;
    }

    // Fetch buildings for the manager's org
    const { data: buildingsData, error: buildingsError } = await supabase
      .from('buildings_new')
      .select('*')
      .eq('org_id', orgId);

    if (buildingsError) {
      toast.error("Failed to load buildings");
      console.error(buildingsError);
      setLoading(false);
      return;
    }

    // For each building, fetch counts
    const buildingsWithCounts = await Promise.all(
      (buildingsData || []).map(async (building) => {
        // Ticket counts
        const { data: ticketsData } = await supabase
          .from('maintenance_tickets')
          .select('status')
          .or(`status.eq.open,status.eq.in_progress`);

        const ticketCounts = {
          open: ticketsData?.filter(t => t.status === 'open').length || 0,
          in_progress: ticketsData?.filter(t => t.status === 'in_progress').length || 0,
        };

        const paymentCounts = {
          due: 0,
          overdue: 0,
        };

        const { count: guestCount } = await supabase
          .from('guests')
          .select('*', { count: 'exact', head: true })
          .eq('demo_code_status', 'new');

        return {
          ...building,
          ticketCounts,
          paymentCounts,
          guestCount: guestCount || 0,
        };
      })
    );

    setBuildings(buildingsWithCounts);
    setLoading(false);
  };

  const createOrganization = async () => {
    if (!orgName.trim()) {
      toast.error("Please enter an organization name");
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase
      .from('organizations')
      .insert({ name: orgName })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create organization");
      console.error(error);
      setSubmitting(false);
      return;
    }

    // Update current user's profile with org_id
    await supabase
      .from('profiles')
      .update({ org_id: data.id })
      .eq('id', profile!.id);

    setOrganization(data);
    setOrgName("");
    setOrgDialogOpen(false);
    setSubmitting(false);
    toast.success("Organization created!");
    loadOrganizationAndBuildings();
  };

  const createBuilding = async () => {
    if (!buildingName.trim()) {
      toast.error("Please enter a building name");
      return;
    }

    const orgId = organization?.id || profile?.org_id;
    if (!orgId) {
      toast.error("No organization found");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('buildings_new')
      .insert({
        org_id: orgId,
        name: buildingName,
        address: buildingAddress || null,
      });

    if (error) {
      toast.error("Failed to create building");
      console.error(error);
      setSubmitting(false);
      return;
    }

    setBuildingName("");
    setBuildingAddress("");
    setDialogOpen(false);
    setSubmitting(false);
    toast.success("Building created!");
    loadBuildings();
  };

  const handleBuildingClick = (buildingId: string) => {
    setCurrentBuildingId(buildingId);
    navigate(`/buildings/${buildingId}/tickets`);
  };

  if (profile?.role !== 'manager') {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">This page is only accessible to managers.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Organization Creation Dialog */}
      <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              First, create your organization to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Property Management"
                required
              />
            </div>
            <Button onClick={createOrganization} className="w-full" disabled={submitting}>
              {submitting ? "Creating..." : "Create Organization"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Buildings</h1>
            <p className="text-muted-foreground">
              {organization ? `${organization.name} - Manage all your properties` : "Manage all buildings in your organization"}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Building
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Building</DialogTitle>
                <DialogDescription>
                  Add a new property to your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="building-name">Building Name *</Label>
                  <Input
                    id="building-name"
                    value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)}
                    placeholder="Sunset Apartments"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="building-address">Address</Label>
                  <Input
                    id="building-address"
                    value={buildingAddress}
                    onChange={(e) => setBuildingAddress(e.target.value)}
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <Button onClick={createBuilding} className="w-full" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Building"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading buildings...</p>
          </div>
        ) : buildings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No buildings found. Contact your administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buildings.map((building) => (
              <Card
                key={building.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleBuildingClick(building.id)}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Building2 className="h-8 w-8 text-primary mt-1" />
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{building.name}</CardTitle>
                      {building.address && (
                        <CardDescription className="text-sm">{building.address}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Tickets Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Tickets</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {building.ticketCounts.open} Open
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {building.ticketCounts.in_progress} In Progress
                      </Badge>
                    </div>
                  </div>

                  {/* Payments Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Payments</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {building.paymentCounts.due} Due
                      </Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {building.paymentCounts.overdue} Overdue
                      </Badge>
                    </div>
                  </div>

                  {/* Guests Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">New Guests</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {building.guestCount}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
