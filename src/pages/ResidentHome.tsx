import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, LogOut } from "lucide-react";
import { TIER_FEATURES, TIER_LABELS, type Tier, type Feature } from "@/lib/tiers";

interface Building { id: string; name: string; tier: Tier; }

export default function ResidentHome() {
  const { buildingId = "" } = useParams();
  const { user, memberships, signOut } = useAuth();
  const [building, setBuilding] = useState<Building | null>(null);
  const [unitCode, setUnitCode] = useState<string | null>(null);

  const membership = memberships.find((m) => m.building_id === buildingId && m.role === "resident");

  useEffect(() => {
    (async () => {
      const { data: b } = await supabase.from("buildings").select("id, name, tier").eq("id", buildingId).maybeSingle();
      setBuilding(b as Building | null);
      if (membership?.unit_id) {
        const { data: u } = await supabase.from("units").select("code").eq("id", membership.unit_id).maybeSingle();
        setUnitCode((u as { code: string } | null)?.code ?? null);
      }
    })();
  }, [buildingId, membership?.unit_id]);

  if (!building) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando...</div>;

  const has = (f: Feature) => TIER_FEATURES[building.tier].includes(f);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                {building.name}
                {unitCode && <Badge variant="outline">Unidad {unitCode}</Badge>}
                <Badge variant="secondary">{TIER_LABELS[building.tier]}</Badge>
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Salir
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue={has("feed") ? "feed" : "tickets"}>
          <TabsList>
            {has("feed") && <TabsTrigger value="feed">Novedades</TabsTrigger>}
            {has("tickets_basic") && <TabsTrigger value="tickets">Mis tickets</TabsTrigger>}
            {has("guests") && <TabsTrigger value="guests">Mis visitas</TabsTrigger>}
            {has("payments_tracking") && <TabsTrigger value="payments">Mis pagos</TabsTrigger>}
          </TabsList>
          {has("feed") && <TabsContent value="feed" className="pt-4"><Placeholder title="Novedades del edificio" /></TabsContent>}
          {has("tickets_basic") && <TabsContent value="tickets" className="pt-4"><Placeholder title="Tickets de mantenimiento" /></TabsContent>}
          {has("guests") && <TabsContent value="guests" className="pt-4"><Placeholder title="Registro de visitas" /></TabsContent>}
          {has("payments_tracking") && <TabsContent value="payments" className="pt-4"><Placeholder title="Estado de pagos" /></TabsContent>}
        </Tabs>
      </main>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Próximamente en tu plan Starter.</CardDescription>
      </CardHeader>
      <CardContent><p className="text-sm text-muted-foreground">Esta sección se habilitará en la próxima iteración.</p></CardContent>
    </Card>
  );
}
