import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Amenity {
  id: string;
  name: string;
  description: string | null;
  rules: string | null;
  capacity: number | null;
  open_time: string;
  close_time: string;
  slot_minutes: number;
  image_url: string | null;
  building_id: string;
}

interface AmenitiesSectionProps {
  buildingId: string;
  buildingName: string;
}

export default function AmenitiesSection({ buildingId, buildingName }: AmenitiesSectionProps) {
  const { profile } = useAuth();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rules: "",
    capacity: "",
    openTime: "09:00",
    closeTime: "18:00",
    slotMinutes: "60",
    imageUrl: "",
  });

  useEffect(() => {
    loadAmenities();
  }, [buildingId]);

  const loadAmenities = async () => {
    try {
      const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .eq('building_id', buildingId)
        .order('name');

      if (error) throw error;
      setAmenities(data || []);
    } catch (error: any) {
      toast.error("Error loading amenities: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAmenity = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter an amenity name");
      return;
    }

    if (!profile?.building_id) {
      toast.error("Your profile is missing a building_id. Please contact support.");
      return;
    }

    setSubmitting(true);
    try {
      const amenityData = {
        building_id: buildingId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        rules: formData.rules.trim() || null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        open_time: formData.openTime,
        close_time: formData.closeTime,
        slot_minutes: parseInt(formData.slotMinutes),
        image_url: formData.imageUrl.trim() || null,
        created_by: profile?.id,
      };

      const { error } = await supabase
        .from('amenities')
        .insert(amenityData);

      if (error) {
        // Show debug info
        toast.error(`Error creating amenity: ${error.message}\n\nDebug Info:\nProfile Building: ${profile.building_id}\nSent Building: ${buildingId}\nCreated By: ${profile.id}`);
        throw error;
      }

      toast.success("Amenity created successfully");
      resetForm();
      loadAmenities();
    } catch (error: any) {
      console.error("Amenity creation error details:", {
        profileBuildingId: profile?.building_id,
        sentBuildingId: buildingId,
        createdBy: profile?.id,
        error: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAmenity = async (amenityId: string) => {
    if (!confirm("Are you sure you want to delete this amenity?")) return;

    try {
      const { error } = await supabase
        .from('amenities')
        .delete()
        .eq('id', amenityId);

      if (error) throw error;

      toast.success("Amenity deleted");
      loadAmenities();
    } catch (error: any) {
      toast.error("Error deleting amenity: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      rules: "",
      capacity: "",
      openTime: "09:00",
      closeTime: "18:00",
      slotMinutes: "60",
      imageUrl: "",
    });
    setDialogOpen(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading amenities...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Amenities - {buildingName}</CardTitle>
            <CardDescription>Manage amenities available for booking</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Amenity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Amenity</DialogTitle>
                <DialogDescription>
                  Add a new amenity that residents can book
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Amenity Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Gym, Pool, Party Room, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the amenity..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rules">Rules</Label>
                  <Textarea
                    id="rules"
                    value={formData.rules}
                    onChange={(e) => setFormData(prev => ({ ...prev, rules: e.target.value }))}
                    placeholder="Usage rules and guidelines..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity (optional)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    placeholder="Maximum number of people"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="openTime">Open Time</Label>
                    <Input
                      id="openTime"
                      type="time"
                      value={formData.openTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, openTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closeTime">Close Time</Label>
                    <Input
                      id="closeTime"
                      type="time"
                      value={formData.closeTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, closeTime: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slotMinutes">Booking Slot Duration (minutes)</Label>
                  <Input
                    id="slotMinutes"
                    type="number"
                    value={formData.slotMinutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, slotMinutes: e.target.value }))}
                    placeholder="60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL (optional)</Label>
                  <Input
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <Button onClick={handleCreateAmenity} className="w-full" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Amenity"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {amenities.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No amenities created yet. Add one to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {amenities.map((amenity) => (
              <Card key={amenity.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{amenity.name}</CardTitle>
                      {amenity.description && (
                        <CardDescription className="mt-1">{amenity.description}</CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAmenity(amenity.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Hours:</span>{" "}
                      {amenity.open_time} - {amenity.close_time}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Slot:</span>{" "}
                      {amenity.slot_minutes} minutes
                    </div>
                    {amenity.capacity && (
                      <div>
                        <span className="text-muted-foreground">Capacity:</span>{" "}
                        {amenity.capacity} people
                      </div>
                    )}
                  </div>
                  {amenity.rules && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm font-medium mb-1">Rules:</p>
                      <p className="text-sm text-muted-foreground">{amenity.rules}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
