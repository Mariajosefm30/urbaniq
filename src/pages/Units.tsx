import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, UserPlus, MessageSquare, Trash2, Check, Loader2 } from "lucide-react";
import { z } from "zod";

const assignSchema = z.object({
  name: z.string().trim().min(1, "Resident name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
});

interface Unit {
  id: string;
  code: string;
  resident_user_id: string | null;
  resident_name: string | null;
  contact_information: string | null;
  notes: string | null;
  residentName?: string;
  residentEmail?: string;
  saving?: boolean;
  justSaved?: boolean;
}

export default function Units() {
  const { buildingId } = useParams();
  const { profile } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [search, setSearch] = useState("");
  
  // Modals
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  
  // Form states
  const [residentName, setResidentName] = useState("");
  const [residentEmail, setResidentEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (buildingId) {
      loadUnits();
    }
  }, [buildingId]);

  useEffect(() => {
    applyFilters();
  }, [units, filter, search]);

  const loadUnits = async () => {
    setLoading(true);
    const { data: unitsData } = await supabase
      .from('units')
      .select('*')
      .eq('building_id', buildingId!)
      .order('code');

    if (!unitsData) {
      setLoading(false);
      return;
    }

    // Load resident info separately
    const processedUnits: Unit[] = await Promise.all(
      unitsData.map(async (unit: any) => {
        let residentName = unit.resident_name || null;
        let residentEmail = unit.contact_information || null;

        // If there's a linked profile, use that instead
        if (unit.resident_user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', unit.resident_user_id)
            .single();

          if (profileData) {
            residentName = profileData.name || residentName;
            residentEmail = profileData.email || residentEmail;
          }
        }

        return {
          id: unit.id,
          code: unit.code,
          resident_user_id: unit.resident_user_id,
          resident_name: unit.resident_name,
          contact_information: unit.contact_information,
          notes: unit.notes,
          residentName,
          residentEmail,
        };
      })
    );

    setUnits(processedUnits);
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...units];

    if (filter === "assigned") {
      filtered = filtered.filter(u => u.resident_user_id);
    } else if (filter === "unassigned") {
      filtered = filtered.filter(u => !u.resident_user_id);
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        u => 
          u.code.toLowerCase().includes(searchLower) ||
          u.residentName?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredUnits(filtered);
  };

  const addUnit = async () => {
    const { data, error } = await supabase
      .from('units')
      .insert({
        building_id: buildingId!,
        code: '',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error("Unit code already exists in this building");
      } else {
        toast.error("Failed to add unit");
      }
      return;
    }

    const newUnit: Unit = {
      id: data.id,
      code: data.code,
      resident_user_id: data.resident_user_id,
      notes: (data as any).notes || null,
    };

    setUnits([newUnit, ...units]);
  };

  const updateUnitField = async (unitId: string, field: 'code' | 'notes', value: string) => {
    // Show saving state
    setUnits(prev => prev.map(u => 
      u.id === unitId ? { ...u, saving: true, justSaved: false } : u
    ));

    const updateData: any = { [field]: value };

    const { error } = await supabase
      .from('units')
      .update(updateData)
      .eq('id', unitId);

    if (error) {
      if (error.code === '23505') {
        toast.error("Unit code already exists in this building");
      } else {
        toast.error(`Failed to update ${field}`);
      }
      setUnits(prev => prev.map(u => 
        u.id === unitId ? { ...u, saving: false } : u
      ));
      return;
    }

    // Show saved state briefly
    setUnits(prev => prev.map(u => 
      u.id === unitId ? { ...u, [field]: value, saving: false, justSaved: true } : u
    ));

    setTimeout(() => {
      setUnits(prev => prev.map(u => 
        u.id === unitId ? { ...u, justSaved: false } : u
      ));
    }, 2000);
  };

  const handleAssignResident = async () => {
    if (!selectedUnit) return;

    setErrors({});

    const result = assignSchema.safeParse({ name: residentName, email: residentEmail });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    // Check if email already assigned to another unit in this building
    const { data: existing } = await supabase
      .from('units')
      .select(`
        id,
        profiles!units_resident_user_id_fkey(email)
      `)
      .eq('building_id', buildingId!)
      .neq('id', selectedUnit.id);

    if (existing?.some((u: any) => u.profiles?.email === result.data.email)) {
      setErrors({ email: "Email already assigned to another unit in this building" });
      setSubmitting(false);
      return;
    }

    // Check if user exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', result.data.email)
      .single();

    let userId = existingProfile?.id;

    if (!existingProfile) {
      // Note: In production, you'd create the auth user via an edge function
      // For now, we skip creating the profile since we can't create auth users from client
      toast.error("Resident must be created by admin first");
      setSubmitting(false);
      return;
    }

    userId = existingProfile.id;

    // Assign to unit
    const { error: updateError } = await supabase
      .from('units')
      .update({ resident_user_id: userId })
      .eq('id', selectedUnit.id);

    if (updateError) {
      toast.error("Could not assign resident");
      setSubmitting(false);
      return;
    }

    toast.success("Resident assigned");
    setAssignDialogOpen(false);
    setResidentName("");
    setResidentEmail("");
    setSubmitting(false);
    loadUnits();
  };

  const handleSendMessage = async () => {
    if (!selectedUnit || !message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSubmitting(true);

    const currentNotes = selectedUnit.notes || "";
    const newNote = `[${new Date().toLocaleString()}] ${message}`;
    const updatedNotes = currentNotes ? `${currentNotes}\n\n${newNote}` : newNote;

    const { error } = await supabase
      .from('units')
      .update({ notes: updatedNotes } as any)
      .eq('id', selectedUnit.id);

    if (error) {
      toast.error("Failed to save message");
      setSubmitting(false);
      return;
    }

    toast.success("Message saved");
    setMessageDialogOpen(false);
    setMessage("");
    setSubmitting(false);
    loadUnits();
  };

  const handleDelete = async (unit: Unit) => {
    if (!confirm(`Delete unit ${unit.code}? This won't remove the resident account.`)) return;

    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', unit.id);

    if (error) {
      toast.error("Failed to delete unit");
      return;
    }

    setUnits(prev => prev.filter(u => u.id !== unit.id));
    toast.success("Unit deleted");
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

  if (!buildingId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
            <p className="text-blue-900 dark:text-blue-100">Select a building to continue.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Units</CardTitle>
                <CardDescription>Manage units and residents in this building</CardDescription>
              </div>
              <Button onClick={addUnit} className="gap-2">
                <Plus className="h-4 w-4" />
                Add unit
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <div className="flex gap-2">
                <Badge
                  variant={filter === "all" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFilter("all")}
                >
                  All
                </Badge>
                <Badge
                  variant={filter === "assigned" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFilter("assigned")}
                >
                  Assigned
                </Badge>
                <Badge
                  variant={filter === "unassigned" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFilter("unassigned")}
                >
                  Unassigned
                </Badge>
              </div>
              <Input
                placeholder="Search by unit or resident..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sm:max-w-xs"
              />
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading units...</p>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold mb-2">No units yet</h3>
                <p className="text-muted-foreground mb-6">
                  Add units one by one. You can assign residents as you go.
                </p>
                <Button onClick={addUnit}>Add unit</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Unit</TableHead>
                    <TableHead>Resident Name</TableHead>
                    <TableHead>Resident Email</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            value={unit.code}
                            onChange={(e) => {
                              const newCode = e.target.value;
                              setUnits(prev => prev.map(u => 
                                u.id === unit.id ? { ...u, code: newCode } : u
                              ));
                            }}
                            onBlur={(e) => {
                              if (e.target.value !== unit.code) {
                                updateUnitField(unit.id, 'code', e.target.value);
                              }
                            }}
                            placeholder="e.g., A-302"
                            className="w-32"
                          />
                          {unit.saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                          {unit.justSaved && <Check className="h-4 w-4 text-green-600" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {unit.residentName || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {unit.residentEmail || "—"}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={unit.notes || ""}
                          onChange={(e) => {
                            const newNotes = e.target.value;
                            setUnits(prev => prev.map(u => 
                              u.id === unit.id ? { ...u, notes: newNotes } : u
                            ));
                          }}
                          onBlur={(e) => {
                            if (e.target.value !== unit.notes) {
                              updateUnitField(unit.id, 'notes', e.target.value);
                            }
                          }}
                          placeholder="Add notes..."
                          className="max-w-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUnit(unit);
                              setResidentName(unit.residentName || "");
                              setResidentEmail(unit.residentEmail || "");
                              setAssignDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUnit(unit);
                              setMessageDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(unit)}
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

        {/* Assign Resident Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign resident</DialogTitle>
              <DialogDescription>
                Assign a resident to unit {selectedUnit?.code}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resident-name">Resident name</Label>
                <Input
                  id="resident-name"
                  value={residentName}
                  onChange={(e) => {
                    setResidentName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
                  }}
                  placeholder="John Doe"
                  maxLength={100}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="resident-email">Resident email</Label>
                <Input
                  id="resident-email"
                  type="email"
                  value={residentEmail}
                  onChange={(e) => {
                    setResidentEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                  }}
                  placeholder="john@example.com"
                  maxLength={255}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <Button onClick={handleAssignResident} className="w-full" disabled={submitting}>
                {submitting ? "Assigning..." : "Assign resident"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Send Message Dialog */}
        <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send message</DialogTitle>
              <DialogDescription>
                Add a message for unit {selectedUnit?.code}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message..."
                  rows={4}
                />
              </div>
              <Button onClick={handleSendMessage} className="w-full" disabled={submitting}>
                {submitting ? "Saving..." : "Save message"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
