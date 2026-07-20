import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Building2, LogOut, UserPlus, Copy } from "lucide-react";
import { TIER_FEATURES, TIER_LABELS, type Tier, type Feature } from "@/lib/tiers";
import { InviteResidentDialog } from "@/components/roster/InviteResidentDialog";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useToast } from "@/hooks/use-toast";
import type { Unit } from "@/components/roster/UnitsTable";
import { FeedPanel } from "@/components/features/FeedPanel";
import { TicketsPanel } from "@/components/features/TicketsPanel";
import { GuestsPanel } from "@/components/features/GuestsPanel";
import { PaymentsOwnerPanel } from "@/components/features/PaymentsPanel";


interface Building { id: string; name: string; tier: Tier; }

export default function ResidentHome() {
  const { buildingId = "" } = useParams();
  const { user, memberships, signOut } = useAuth();
  const { toast } = useToast();
  const [building, setBuilding] = useState<Building | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; url: string }>({ open: false, url: "" });

  const membership = memberships.find((m) => m.building_id === buildingId && m.role === "resident");
  const isOwner = (membership as any)?.resident_type === "owner";

  useEffect(() => {
    (async () => {
      const { data: b } = await supabase.from("buildings").select("id, name, tier").eq("id", buildingId).maybeSingle();
      setBuilding(b as Building | null);
      if (membership?.unit_id) {
        const { data: u } = await supabase.from("units").select("id, code").eq("id", membership.unit_id).maybeSingle();
        setUnit((u as Unit | null) ?? null);
      }
    })();
  }, [buildingId, membership?.unit_id]);

  if (!building) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando...</div>;

  const has = (f: Feature) => TIER_FEATURES[building.tier].includes(f);
  const residentType = (membership as any)?.resident_type as "owner" | "tenant" | undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                {building.name}
                {unit && <Badge variant="outline">Unidad {unit.code}</Badge>}
                <Badge variant="secondary">{TIER_LABELS[building.tier]}</Badge>
                {residentType && <Badge>{residentType === "owner" ? "Propietario" : "Inquilino"}</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isOwner && unit && (
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1" /> Invitar inquilino
              </Button>
            )}
            <NotificationsBell />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue={has("feed") ? "feed" : "tickets"}>
          <TabsList>
            {has("feed") && <TabsTrigger value="feed">Novedades</TabsTrigger>}
            {has("tickets_basic") && <TabsTrigger value="tickets">Mis tickets</TabsTrigger>}
            {has("guests") && <TabsTrigger value="guests">Mis visitas</TabsTrigger>}
            {has("payments_tracking") && isOwner && <TabsTrigger value="payments">Mis pagos</TabsTrigger>}
          </TabsList>
          {has("feed") && <TabsContent value="feed" className="pt-4"><FeedPanel buildingId={buildingId} isBoard={false} /></TabsContent>}
          {has("tickets_basic") && <TabsContent value="tickets" className="pt-4"><TicketsPanel buildingId={buildingId} isBoard={false} canCreate={!!unit} myUnitId={unit?.id ?? null} /></TabsContent>}
          {has("guests") && <TabsContent value="guests" className="pt-4"><GuestsPanel buildingId={buildingId} isBoard={false} canCreate={!!unit} myUnitId={unit?.id ?? null} /></TabsContent>}
          {has("payments_tracking") && isOwner && unit && <TabsContent value="payments" className="pt-4"><PaymentsOwnerPanel buildingId={buildingId} unitId={unit.id} /></TabsContent>}

        </Tabs>
      </main>

      {unit && (
        <InviteResidentDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          buildingId={buildingId}
          units={[unit]}
          lockedUnitId={unit.id}
          lockedType="tenant"
          onCreated={(url) => { setInviteOpen(false); setLinkDialog({ open: true, url }); }}
        />
      )}

      <Dialog open={linkDialog.open} onOpenChange={(o) => setLinkDialog({ ...linkDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enlace de activación para tu inquilino</DialogTitle>
            <DialogDescription>Compártelo con tu inquilino. Es de un solo uso.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={linkDialog.url} />
            <Button onClick={() => { navigator.clipboard.writeText(linkDialog.url); toast({ title: "Copiado" }); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
