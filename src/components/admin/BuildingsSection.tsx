import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function BuildingsSection({ orgId }: { orgId: string }) {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    managerName: "",
    streetAddress: "",
    city: "",
    country: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBuildings();
  }, [orgId]);

  const loadBuildings = async () => {
    const { data } = await supabase
      .from('buildings_new')
      .select('*')
      .eq('org_id', orgId)
      .order('name');

    setBuildings(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a building name");
      return;
    }

    setSubmitting(true);

    const buildingData = {
      name: formData.name,
      manager_name: formData.managerName || null,
      street_address: formData.streetAddress || null,
      city: formData.city || null,
      country: formData.country || null,
    };

    if (editingBuilding) {
      const { error } = await supabase
        .from('buildings_new')
        .update(buildingData)
        .eq('id', editingBuilding.id);

      if (error) {
        toast.error("Failed to update building");
        console.error(error);
      } else {
        toast.success("Building updated");
        loadBuildings();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('buildings_new')
        .insert({ org_id: orgId, ...buildingData });

      if (error) {
        toast.error("Failed to create building");
        console.error(error);
      } else {
        toast.success("Building created");
        loadBuildings();
        resetForm();
      }
    }

    setSubmitting(false);
  };

  const handleEdit = (building: any) => {
    setEditingBuilding(building);
    setFormData({
      name: building.name,
      managerName: building.manager_name || "",
      streetAddress: building.street_address || "",
      city: building.city || "",
      country: building.country || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this building?")) return;

    const { error } = await supabase
      .from('buildings_new')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete building");
      console.error(error);
    } else {
      toast.success("Building deleted");
      loadBuildings();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      managerName: "",
      streetAddress: "",
      city: "",
      country: "",
    });
    setEditingBuilding(null);
    setDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Buildings</CardTitle>
            <CardDescription>Manage buildings in your organization</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create building
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBuilding ? "Edit building" : "Create building"}</DialogTitle>
                <DialogDescription>
                  {editingBuilding ? "Update building details" : "Add a new building to your organization"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="building-name">Building Name *</Label>
                  <Input
                    id="building-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Sunset Apartments"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager-name">Manager Name</Label>
                  <Input
                    id="manager-name"
                    value={formData.managerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, managerName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street-address">Street Address</Label>
                  <Input
                    id="street-address"
                    value={formData.streetAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, streetAddress: e.target.value }))}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="San Francisco"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="USA"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
                  {submitting ? "Saving..." : editingBuilding ? "Save" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {buildings.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No buildings yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map((building) => (
                <TableRow key={building.id}>
                  <TableCell className="font-medium">{building.name}</TableCell>
                  <TableCell>{building.manager_name || "—"}</TableCell>
                  <TableCell>
                    {[building.street_address, building.city, building.country].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(building)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(building.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
