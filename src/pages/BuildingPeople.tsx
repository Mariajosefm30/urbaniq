import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Shield, User, Home, AlertTriangle } from "lucide-react";

interface Membership {
  id: string;
  building_id: string;
  user_id: string;
  role: "admin" | "manager" | "resident";
  unit_id: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
  unit_code?: string;
}

interface Unit {
  id: string;
  code: string;
}

export default function BuildingPeople() {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { setCurrentBuildingId } = useBuilding();
  
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [buildingName, setBuildingName] = useState("");
  
  // Add member dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "manager" | "resident">("resident");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (buildingId) {
      setCurrentBuildingId(buildingId);
      checkAccess();
      loadBuilding();
      loadMemberships();
      loadUnits();
    }
  }, [buildingId]);

  const checkAccess = async () => {
    if (!user || !buildingId) return;

    // Check if user is admin for this building
    const { data } = await supabase
      .rpc('is_building_admin', { _building_id: buildingId, _user_id: user.id });

    setIsAdmin(data === true);
  };

  const loadBuilding = async () => {
    if (!buildingId) return;

    const { data } = await supabase
      .from('buildings_new')
      .select('name')
      .eq('id', buildingId)
      .single();

    if (data) {
      setBuildingName(data.name);
    }
  };

  const loadMemberships = async () => {
    if (!buildingId) return;

    const { data, error } = await supabase
      .from('building_memberships')
      .select(`
        id,
        building_id,
        user_id,
        role,
        unit_id,
        created_at
      `)
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load memberships:', error);
      setLoading(false);
      return;
    }

    // Load user profiles for each membership
    const membershipsWithUsers = await Promise.all(
      (data || []).map(async (membership) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('id', membership.user_id)
          .single();

        let unitCode = null;
        if (membership.unit_id) {
          const { data: unitData } = await supabase
            .from('units')
            .select('code')
            .eq('id', membership.unit_id)
            .single();
          unitCode = unitData?.code;
        }

        return {
          ...membership,
          user_email: profileData?.email,
          user_name: profileData?.name,
          unit_code: unitCode,
        } as Membership;
      })
    );

    setMemberships(membershipsWithUsers);
    setLoading(false);
  };

  const loadUnits = async () => {
    if (!buildingId) return;

    const { data } = await supabase
      .from('units')
      .select('id, code')
      .eq('building_id', buildingId)
      .order('code');

    setUnits(data || []);
  };

  const handleAddMember = async () => {
    if (!email.trim()) {
      toast.error("Ingresa un correo");
      return;
    }

    if (selectedRole === "resident" && !selectedUnitId) {
      toast.error("Selecciona una unidad para el residente");
      return;
    }

    setSubmitting(true);

    // Residents: create a pending invitation (they may not have an account yet)
    if (selectedRole === "resident") {
      // Get org_id of the building so the trigger can link it on signup
      const { data: bldg } = await supabase
        .from("buildings_new")
        .select("org_id")
        .eq("id", buildingId!)
        .single();

      const { error: pendErr } = await (supabase as any)
        .from("pending_residents")
        .insert({
          email: email.trim().toLowerCase(),
          building_id: buildingId!,
          unit_id: selectedUnitId,
          org_id: bldg?.org_id ?? null,
          invited_by: user?.id,
        });

      if (pendErr) {
        if (pendErr.code === "23505") {
          toast.error("Ya invitaste a este correo en este edificio");
        } else {
          console.error(pendErr);
          toast.error("No se pudo crear la invitación");
        }
        setSubmitting(false);
        return;
      }

      toast.success("Residente pre-cargado. Al registrarse con ese correo entrará directo a su edificio.");
      setDialogOpen(false);
      setEmail("");
      setSelectedRole("resident");
      setSelectedUnitId(null);
      setSubmitting(false);
      loadMemberships();
      return;
    }

    // Admin / Manager: must already have an account
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (profileError) {
      toast.error("Error al buscar el usuario");
      setSubmitting(false);
      return;
    }

    if (!profileData) {
      toast.error("Ese usuario aún no tiene cuenta. Pídele que se registre primero.");
      setSubmitting(false);
      return;
    }

    const { data: existingMembership } = await supabase
      .from('building_memberships')
      .select('id')
      .eq('building_id', buildingId!)
      .eq('user_id', profileData.id)
      .maybeSingle();

    if (existingMembership) {
      toast.error("Este usuario ya tiene un rol en este edificio");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('building_memberships')
      .insert({
        building_id: buildingId!,
        user_id: profileData.id,
        role: selectedRole,
        unit_id: null,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      toast.error("No se pudo agregar el miembro");
      setSubmitting(false);
      return;
    }

    toast.success("Miembro agregado");
    setDialogOpen(false);
    setEmail("");
    setSelectedRole("resident");
    setSelectedUnitId(null);
    setSubmitting(false);
    loadMemberships();
  };

  const handleRoleChange = async (membershipId: string, newRole: "admin" | "manager" | "resident", currentUnitId: string | null) => {
    // If changing to resident, need to select unit
    if (newRole === "resident" && !currentUnitId) {
      toast.error("Select a unit when assigning resident role");
      return;
    }

    const { error } = await supabase
      .from('building_memberships')
      .update({
        role: newRole,
        unit_id: newRole === "resident" ? currentUnitId : null,
      })
      .eq('id', membershipId);

    if (error) {
      toast.error("Failed to update role");
      return;
    }

    toast.success("Role updated");
    loadMemberships();
  };

  const handleUnitChange = async (membershipId: string, unitId: string) => {
    const { error } = await supabase
      .from('building_memberships')
      .update({ unit_id: unitId })
      .eq('id', membershipId);

    if (error) {
      toast.error("Failed to update unit");
      return;
    }

    toast.success("Unit updated");
    loadMemberships();
  };

  const handleRemoveMember = async (membership: Membership) => {
    // Prevent removing yourself if you're the only admin
    if (membership.user_id === user?.id && membership.role === "admin") {
      const otherAdmins = memberships.filter(m => m.role === "admin" && m.id !== membership.id);
      if (otherAdmins.length === 0) {
        toast.error("Cannot remove the only admin. Add another admin first.");
        return;
      }
    }

    if (!confirm(`Remove ${membership.user_email || 'this user'} from the building?`)) return;

    const { error } = await supabase
      .from('building_memberships')
      .delete()
      .eq('id', membership.id);

    if (error) {
      toast.error("Failed to remove member");
      return;
    }

    toast.success("Member removed");
    loadMemberships();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="gap-1 bg-primary"><Shield className="h-3 w-3" />Admin</Badge>;
      case "manager":
        return <Badge variant="secondary" className="gap-1"><User className="h-3 w-3" />Manager</Badge>;
      case "resident":
        return <Badge variant="outline" className="gap-1"><Home className="h-3 w-3" />Resident</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  if (!isAdmin && !loading) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              Only building admins can manage people and roles.
            </p>
            <Button onClick={() => navigate(`/buildings/${buildingId}/dashboard`)}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">People & Roles</h2>
            <p className="text-muted-foreground">
              Manage who has access to {buildingName || 'this building'}
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Person
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Person to Building</DialogTitle>
                <DialogDescription>
                  Add a new admin, manager, or resident to this building.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The user must have an account to be added.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Full access</SelectItem>
                      <SelectItem value="manager">Manager - Operational access</SelectItem>
                      <SelectItem value="resident">Resident - Unit access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedRole === "resident" && (
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={selectedUnitId || ""} onValueChange={setSelectedUnitId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {units.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Create units first before adding residents.
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleAddMember}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Person"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Building Members</CardTitle>
            <CardDescription>
              {memberships.length} {memberships.length === 1 ? 'person' : 'people'} have access
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <p className="text-muted-foreground mt-2">Loading members...</p>
              </div>
            ) : memberships.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No members yet</p>
                <p className="text-muted-foreground">Add your first member to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.map((membership) => (
                    <TableRow key={membership.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{membership.user_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{membership.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={membership.role}
                          onValueChange={(v) => handleRoleChange(membership.id, v as any, membership.unit_id)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue>{getRoleBadge(membership.role)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="resident">Resident</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {membership.role === "resident" ? (
                          <Select
                            value={membership.unit_id || ""}
                            onValueChange={(v) => handleUnitChange(membership.id, v)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Select unit">
                                {membership.unit_code || "—"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {units.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  {unit.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(membership)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
