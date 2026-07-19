import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/lib/tiers";

export interface BuildingRow {
  id: string;
  name: string;
  tier: Tier;
  address: string | null;
}

export function useBuilding(buildingId?: string) {
  const [building, setBuilding] = useState<BuildingRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!buildingId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("buildings").select("id, name, tier, address").eq("id", buildingId).maybeSingle();
      if (!cancelled) { setBuilding((data as BuildingRow | null) ?? null); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [buildingId]);

  return { building, loading };
}
