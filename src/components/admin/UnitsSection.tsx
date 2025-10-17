import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MessageSquare } from "lucide-react";

interface UnitsSectionProps {
  buildingId: string;
  buildingName: string;
}

export default function UnitsSection({ buildingId, buildingName }: UnitsSectionProps) {
  const [units, setUnits] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    residentName: "",
    contactInformation: "",
  });

  useEffect(() => {
    loadUnits();
  }, [buildingId]);

  const loadUnits = async () => {
    const { data } = await supabase
      .from('units')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false });

    setUnits(data || []);
  };

  const handleAddRow = () => {
    setUnits([...units, { 
      id: `temp-${Date.now()}`,
      code: "",
      resident_name: "",
      contact_information: "",
      isNew: true 
    }]);
    setEditingIndex(units.length);
  };

  const handleSave = async (index: number) => {
    const unit = units[index];
    
    if (!unit.resident_name?.trim()) {
      toast.error("Resident name is required");
      return;
    }

    if (unit.isNew) {
      const { error, data } = await supabase
        .from('units')
        .insert([{
          building_id: buildingId,
          code: unit.code?.trim() || undefined, // Let DB generate if empty
          resident_name: unit.resident_name?.trim() || null,
          contact_information: unit.contact_information?.trim() || null,
        }])
        .select()
        .single();

      if (error) {
        toast.error("Failed to create unit");
        console.error(error);
        return;
      }

      const newUnits = [...units];
      newUnits[index] = data;
      setUnits(newUnits);
      toast.success("Unit created");
    } else {
      const { error } = await supabase
        .from('units')
        .update({
          code: unit.code?.trim() || null,
          resident_name: unit.resident_name?.trim() || null,
          contact_information: unit.contact_information?.trim() || null,
        })
        .eq('id', unit.id);

      if (error) {
        toast.error("Failed to update unit");
        console.error(error);
        return;
      }
      
      toast.success("Unit updated");
    }

    setEditingIndex(null);
  };

  const handleDelete = async (index: number) => {
    const unit = units[index];
    
    if (unit.isNew) {
      setUnits(units.filter((_, i) => i !== index));
      setEditingIndex(null);
      return;
    }

    if (!confirm("Are you sure you want to delete this unit?")) return;

    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', unit.id);

    if (error) {
      toast.error("Failed to delete unit");
      console.error(error);
    } else {
      toast.success("Unit deleted");
      setUnits(units.filter((_, i) => i !== index));
      setEditingIndex(null);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleCancel = (index: number) => {
    const unit = units[index];
    if (unit.isNew) {
      setUnits(units.filter((_, i) => i !== index));
    } else {
      loadUnits();
    }
    setEditingIndex(null);
  };

  const handleFieldChange = (index: number, field: string, value: string) => {
    const newUnits = [...units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setUnits(newUnits);
  };

  const handleSendMessage = (unit: any) => {
    // TODO: Implement messaging functionality
    toast.info("Messaging functionality coming soon");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Units - {buildingName}</CardTitle>
            <CardDescription>Manage units and residents in this building</CardDescription>
          </div>
          <Button onClick={handleAddRow} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Unit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {units.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No units yet. Click "Add Unit" to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit Code</TableHead>
                <TableHead>Resident Name</TableHead>
                <TableHead>Contact Information</TableHead>
                <TableHead className="w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((unit, index) => (
                <TableRow key={unit.id}>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        value={unit.code || ""}
                        onChange={(e) => handleFieldChange(index, 'code', e.target.value)}
                        placeholder="101 (optional)"
                      />
                    ) : (
                      unit.code || "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        value={unit.resident_name || ""}
                        onChange={(e) => handleFieldChange(index, 'resident_name', e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    ) : (
                      unit.resident_name || "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        value={unit.contact_information || ""}
                        onChange={(e) => handleFieldChange(index, 'contact_information', e.target.value)}
                        placeholder="email@example.com or phone"
                      />
                    ) : (
                      unit.contact_information || "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {editingIndex === index ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSave(index)}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(index)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(index)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendMessage(unit)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
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
