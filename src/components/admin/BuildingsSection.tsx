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
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
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
    if (!name.trim()) {
      toast.error("Please enter a building name");
      return;
    }

    setSubmitting(true);

    if (editingBuilding) {
      const { error } = await supabase
        .from('buildings_new')
        .update({ name, address: address || null })
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
        .insert({ org_id: orgId, name, address: address || null });

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
    setName(building.name);
    setAddress(building.address || "");
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
    setName("");
    setAddress("");
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
                  <Label htmlFor="building-name">Name</Label>
                  <Input
                    id="building-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sunset Apartments"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="building-address">Address</Label>
                  <Input
                    id="building-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
                  {submitting ? "Saving..." : editingBuilding ? "Save" : "Create building"}
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
                <TableHead>Address</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map((building) => (
                <TableRow key={building.id}>
                  <TableCell className="font-medium">{building.name}</TableCell>
                  <TableCell>{building.address || "—"}</TableCell>
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
