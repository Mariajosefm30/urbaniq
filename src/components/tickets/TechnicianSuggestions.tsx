import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Star, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Technician {
  id: string;
  name: string;
  category: string;
  phone: string;
  rating: number;
  distance: number | null;
  maps_url: string | null;
}

interface TechnicianSuggestionsProps {
  category: string;
  ticketId: string;
  onAssign: (technicianId: string) => void;
}

export function TechnicianSuggestions({ category, ticketId, onAssign }: TechnicianSuggestionsProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTechnicians();
  }, [category]);

  const loadTechnicians = async () => {
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .eq("category", category)
      .order("rating", { ascending: false });

    if (error) {
      toast.error("Failed to load technicians");
    } else {
      setTechnicians(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading technicians...</p>;
  }

  if (technicians.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No technicians available for this category</p>
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
          <Card key={tech.id} className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{tech.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current text-warning" />
                      {tech.rating}/5.0
                    </span>
                    {tech.distance && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {tech.distance} mi
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onAssign(tech.id)}
                  className="flex-1"
                >
                  Assign
                </Button>
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
                {tech.maps_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a href={tech.maps_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
