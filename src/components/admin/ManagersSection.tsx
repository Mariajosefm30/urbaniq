import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserCog } from "lucide-react";

export default function ManagersSection({ orgId }: { orgId: string }) {
  const [managers, setManagers] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<any>(null);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadManagers();
    loadBuildings();
  }, [orgId]);

  const loadManagers = async () => {
    // Get all users with manager role in this org
    const { data: profiles } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!inner(role)
      `)
      .eq('org_id', orgId)
      .eq('user_roles.role', 'manager');

    setManagers(profiles || []);
  };

  const loadBuildings = async () => {
    const { data } = await supabase
      .from('buildings_new')
      .select('*')
      .eq('org_id', orgId)
      .order('name');

    setBuildings(data || []);
  };

  const handleAssignBuildings = async (manager: any) => {
    setSelectedManager(manager);

    // Load current assignments
    const { data } = await supabase
      .from('manager_buildings')
      .select('building_id')
      .eq('user_id', manager.id);

    setSelectedBuildings(data?.map(mb => mb.building_id) || []);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedManager) return;

    setSubmitting(true);

    // Delete all current assignments
    await supabase
      .from('manager_buildings')
      .delete()
      .eq('user_id', selectedManager.id);

    // Insert new assignments
    if (selectedBuildings.length > 0) {
      const { error } = await supabase
        .from('manager_buildings')
        .insert(
          selectedBuildings.map(buildingId => ({
            user_id: selectedManager.id,
            building_id: buildingId,
          }))
        );

      if (error) {
        toast.error("Failed to assign buildings");
        console.error(error);
        setSubmitting(false);
        return;
      }
    }

    toast.success("Buildings assigned");
    setDialogOpen(false);
    setSubmitting(false);
  };

  const toggleBuilding = (buildingId: string) => {
    setSelectedBuildings(prev =>
      prev.includes(buildingId)
        ? prev.filter(id => id !== buildingId)
        : [...prev, buildingId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Managers</CardTitle>
        <CardDescription>Assign managers to buildings</CardDescription>
      </CardHeader>
      <CardContent>
        {managers.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No managers in this organization</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers.map((manager) => (
                <TableRow key={manager.id}>
                  <TableCell className="font-medium">{manager.full_name || manager.name || "—"}</TableCell>
                  <TableCell>{manager.email || "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleAssignBuildings(manager)}
                    >
                      <UserCog className="h-4 w-4" />
                      Assign buildings
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign buildings</DialogTitle>
              <DialogDescription>
                Select which buildings {selectedManager?.full_name || selectedManager?.name} can manage
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {buildings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No buildings available</p>
              ) : (
                <div className="space-y-3">
                  {buildings.map((building) => (
                    <div key={building.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={building.id}
                        checked={selectedBuildings.includes(building.id)}
                        onCheckedChange={() => toggleBuilding(building.id)}
                      />
                      <Label
                        htmlFor={building.id}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {building.name}
                        {building.address && (
                          <span className="text-muted-foreground ml-2">• {building.address}</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={handleSave} className="w-full" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
