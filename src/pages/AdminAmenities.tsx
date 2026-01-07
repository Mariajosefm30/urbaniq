import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock, Edit, Trash2 } from "lucide-react";

interface Amenity {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rules: string | null;
  capacity: number | null;
  open_time: string | null;
  close_time: string | null;
  slot_minutes: number;
  building_id: string;
}

export default function AdminAmenities() {
  const { profile } = useAuth();
  const { session, loading: sessionLoading } = useSession();
  const { currentBuildingId } = useBuilding();
  const { buildingId: routeBuildingId } = useParams<{ buildingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Prioritize route param, fallback to context
  const buildingId = routeBuildingId || currentBuildingId;
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [capacity, setCapacity] = useState("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [slotMinutes, setSlotMinutes] = useState("60");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Access guard: admin and manager only
  useEffect(() => {
    if (sessionLoading) return;
    
    if (!session) {
      navigate('/auth');
      return;
    }
    
    if (session.role !== 'admin' && session.role !== 'manager') {
      navigate('/feed');
      return;
    }
  }, [session, sessionLoading, navigate]);

  useEffect(() => {
    if (buildingId) {
      loadAmenities();
    }
  }, [buildingId]);

  const loadAmenities = async () => {
    try {
      const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .eq('building_id', buildingId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAmenities(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading amenities",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAmenity = async () => {
    if (!name.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in the amenity name",
        variant: "destructive",
      });
      return;
    }

    if (!buildingId) {
      toast({
        title: "No building selected",
        description: "Please open Amenities from a specific building.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const amenityData = {
        building_id: buildingId,
        name: name.trim(),
        description: description.trim() || null,
        rules: rules.trim() || null,
        capacity: capacity ? parseInt(capacity) : null,
        open_time: openTime,
        close_time: closeTime,
        slot_minutes: parseInt(slotMinutes),
        image_url: imageUrl.trim() || null,
        created_by: profile?.id || null,
      };

      const { error } = await supabase
        .from('amenities')
        .insert(amenityData);

      if (error) {
        toast({
          title: "Error creating amenity",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Amenity created",
        description: "The amenity has been added successfully",
      });

      setName("");
      setDescription("");
      setRules("");
      setCapacity("");
      setOpenTime("09:00");
      setCloseTime("18:00");
      setSlotMinutes("60");
      setImageUrl("");
      setDialogOpen(false);
      loadAmenities();
    } catch (error: any) {
      console.error("Amenity creation error:", error.message);
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

      toast({
        title: "Amenity deleted",
        description: "The amenity has been removed",
      });

      loadAmenities();
    } catch (error: any) {
      toast({
        title: "Error deleting amenity",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!buildingId) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>No Building Selected</CardTitle>
              <CardDescription>
                Please open Amenities from a specific Building.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/admin')}>
                Back to Buildings
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Amenities</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage building amenities
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Amenity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Amenity</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Swimming Pool, Gym, Party Room"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the amenity..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="rules">Rules</Label>
                  <Textarea
                    id="rules"
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    placeholder="Any rules or regulations..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="Maximum number of people"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="openTime">Open Time</Label>
                    <Input
                      id="openTime"
                      type="time"
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="closeTime">Close Time</Label>
                    <Input
                      id="closeTime"
                      type="time"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="slotMinutes">Slot Duration (min)</Label>
                    <Input
                      id="slotMinutes"
                      type="number"
                      value={slotMinutes}
                      onChange={(e) => setSlotMinutes(e.target.value)}
                      placeholder="60"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="imageUrl">Image URL (optional)</Label>
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <Button
                  onClick={handleCreateAmenity}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? "Creating..." : "Create Amenity"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading amenities...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {amenities.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No amenities yet. Create your first amenity to get started!
                  </p>
                </CardContent>
              </Card>
            ) : (
              amenities.map((amenity) => (
                <Card key={amenity.id}>
                  {amenity.image_url && (
                    <div className="h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={amenity.image_url}
                        alt={amenity.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {amenity.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAmenity(amenity.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardTitle>
                    <CardDescription>{amenity.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      {amenity.open_time} - {amenity.close_time}
                    </div>
                    {amenity.capacity && (
                      <div className="text-sm text-muted-foreground">
                        Capacity: {amenity.capacity} people
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Slot: {amenity.slot_minutes} minutes
                    </div>
                    {amenity.rules && (
                      <div className="pt-2 border-t text-sm">
                        <strong>Rules:</strong>
                        <p className="text-muted-foreground mt-1">{amenity.rules}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
