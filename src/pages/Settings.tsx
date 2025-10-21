import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Building2 } from "lucide-react";

export default function Settings() {
  const { profile } = useAuth();
  const [buildingAddress, setBuildingAddress] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [profile]);

  const loadSettings = async () => {
    if (!profile) return;

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("building_address, building_id")
      .eq("id", profile.id)
      .single();

    if (profileError) {
      console.error("Failed to load settings:", profileError);
      setLoading(false);
      return;
    }

    setBuildingAddress(profileData.building_address || "");

    // Load building name if building_id exists
    if (profileData.building_id) {
      const { data: buildingData } = await supabase
        .from("buildings")
        .select("name")
        .eq("id", profileData.building_id)
        .single();

      if (buildingData) {
        setBuildingName(buildingData.name);
      }
    }

    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ building_address: buildingAddress })
      .eq("id", profile!.id);

    if (error) {
      toast.error("Failed to save settings");
      console.error("Save error:", error);
    } else {
      toast.success("Settings saved successfully");
      // Clear geocoding cache when address changes
      localStorage.removeItem("geocode_cache");
    }
    setSaving(false);
  };

  const isManager = profile?.role === "manager";

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your building and preferences
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading settings...</div>
        ) : (
          <>
            {!isManager && buildingName && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    My Building
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium">{buildingName}</p>
                </CardContent>
              </Card>
            )}

            {isManager && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Building Information
                  </CardTitle>
                  <CardDescription>
                    Set your building address to get nearby technician suggestions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="building_address">Building Address</Label>
                      <Input
                        id="building_address"
                        value={buildingAddress}
                        onChange={(e) => setBuildingAddress(e.target.value)}
                        placeholder="123 Main St, City, State, ZIP"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Used to find nearby technicians via Google Maps
                      </p>
                    </div>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save Settings"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
