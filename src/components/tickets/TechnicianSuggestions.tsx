import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Star, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Technician {
  name: string;
  rating: number;
  phone: string | null;
  maps_url: string;
  place_id: string;
}

interface TechnicianSuggestionsProps {
  category: string;
  ticketId: string;
  onAssign: (technicianName: string) => void;
}

export function TechnicianSuggestions({ category, ticketId, onAssign }: TechnicianSuggestionsProps) {
  const { profile } = useAuth();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTechnicians();
  }, [category]);

  const loadTechnicians = async () => {
    if (!profile?.building_address) {
      toast.error("Building address not set. Please update in Settings.");
      setLoading(false);
      return;
    }

    // Check for cached geocoding
    const cacheKey = `geocode_${profile.building_address}`;
    const cached = localStorage.getItem(cacheKey);
    
    try {
      const { data, error } = await supabase.functions.invoke('suggest-technicians', {
        body: {
          building_address: profile.building_address,
          category
        }
      });

      if (error) {
        console.error("Failed to load technicians:", error);
        toast.error("Failed to load technicians");
      } else if (data) {
        // Cache geocoding result
        if (data.coords && !cached) {
          localStorage.setItem(cacheKey, JSON.stringify(data.coords));
        }
        setTechnicians(data.technicians || []);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to load technicians");
    }
    setLoading(false);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading technicians...</p>;
  }

  if (technicians.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          {!profile?.building_address 
            ? "Set building address in Settings to see technician suggestions"
            : "No nearby technicians found for this category"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Suggested Technicians Nearby</h3>
      </div>
      <div className="grid gap-3">
        {technicians.map((tech) => (
          <Card key={tech.place_id} className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{tech.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current text-warning" />
                      {tech.rating}/5.0
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Via Google Maps
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onAssign(tech.name)}
                  className="flex-1"
                >
                  Assign
                </Button>
                {tech.phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="flex items-center gap-1"
                  >
                    <a href={`tel:${tech.phone}`}>
                      <Phone className="h-3 w-3" />
                      Call
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <a href={tech.maps_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
