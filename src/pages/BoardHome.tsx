import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, LogOut, ArrowLeft } from "lucide-react";
import { TIER_FEATURES, TIER_LABELS, type Tier, type Feature } from "@/lib/tiers";
import type { Unit } from "@/components/roster/UnitsTable";
import { ResidentsTable, type ResidentRow } from "@/components/roster/ResidentsTable";
import { BulkImport } from "@/components/roster/BulkImport";
import { InviteResidentDialog } from "@/components/roster/InviteResidentDialog";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { FeedPanel } from "@/components/features/FeedPanel";
import { TicketsPanel } from "@/components/features/TicketsPanel";
import { GuestsPanel } from "@/components/features/GuestsPanel";
import { PaymentsBoardPanel } from "@/components/features/PaymentsPanel";


interface Building { id: string; name: string; tier: Tier; address: string | null; }

export default function BoardHome() {
  const { buildingId = "" } = useParams();
  const { user, signOut, isPlatformAdmin, memberships } = useAuth();
  const { toast } = useToast();
  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [counts, setCounts] = useState({ units: 0, activeResidents: 0, openTickets: 0, upcomingVisits: 0, pendingCharges: 0, paidCharges: 0, avgResolutionHours: 0 });
  const [securityInvite, setSecurityInvite] = useState<{ open: boolean; email: string; name: string; busy: boolean }>({ open: false, email: "", name: "", busy: false });
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; url: string }>({ open: false, url: "" });
  const [inviteOpen, setInviteOpen] = useState(false);

  const myMembership = memberships.find((m) => m.building_id === buildingId);
  const isBoard = isPlatformAdmin || myMembership?.role === "admin_board" || myMembership?.role === "manager";

  const load = async () => {
    const [{ data: b }, { data: u }, { data: mem }, { data: inv }] = await Promise.all([
      supabase.from("buildings").select("*").eq("id", buildingId).maybeSingle(),
      supabase.from("units").select("id, code").eq("building_id", buildingId).order("code"),
      supabase.from("memberships").select("id, user_id, role, unit_id, resident_name, phone, resident_type").eq("building_id", buildingId).eq("role", "resident"),
      supabase.from("invites").select("id, email, role, unit_id, token, accepted_at, resident_name, phone, resident_type").eq("building_id", buildingId).eq("role", "resident").is("accepted_at", null),
    ]);
    setBuilding((b as Building) ?? null);
    const uList = (u ?? []) as Unit[];
    setUnits(uList);
    const rows: ResidentRow[] = [
      ...((mem ?? []) as any[]).map((m) => ({
        kind: "membership" as const, id: m.id, email: m.user_id, name: m.resident_name, phone: m.phone,
        type: m.resident_type, unit_id: m.unit_id, status: "active" as const,
      })),
      ...((inv ?? []) as any[]).map((i) => ({
        kind: "invite" as const, id: i.id, email: i.email, name: i.resident_name, phone: i.phone,
        type: i.resident_type, unit_id: i.unit_id, status: "pending" as const, token: i.token,
      })),
    ];
    setResidents(rows);

    const [tk, vs, ch] = await Promise.all([
      supabase.from("tickets").select("id, status", { count: "exact" }).eq("building_id", buildingId),
      supabase.from("visits").select("id, expected_at", { count: "exact" }).eq("building_id", buildingId).eq("status", "expected"),
      supabase.from("charges").select("id, status", { count: "exact" }).eq("building_id", buildingId),
    ]);
    setCounts({
      units: uList.length,
      activeResidents: (mem ?? []).length,
      openTickets: ((tk.data ?? []) as any[]).filter((t) => t.status === "open" || t.status === "in_progress").length,
      upcomingVisits: ((vs.data ?? []) as any[]).filter((v) => !v.expected_at || new Date(v.expected_at) >= new Date()).length,
      pendingCharges: ((ch.data ?? []) as any[]).filter((c) => c.status === "pending" || c.status === "overdue").length,
      paidCharges: ((ch.data ?? []) as any[]).filter((c) => c.status === "paid").length,
    });
  };

  useEffect(() => { if (buildingId) load(); }, [buildingId]);

  if (!building) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando...</div>;

  const tierFeatures = TIER_FEATURES[building.tier];
  const has = (f: Feature) => tierFeatures.includes(f);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {isPlatformAdmin && (
              <Button variant="ghost" size="icon" asChild><Link to="/platform"><ArrowLeft className="h-4 w-4" /></Link></Button>
            )}
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                {building.name}<Badge variant="secondary">{TIER_LABELS[building.tier]}</Badge>
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4 mr-2" /> Salir</Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="roster">
          <TabsList>
            <TabsTrigger value="roster">Residentes</TabsTrigger>
            {has("feed") && <TabsTrigger value="feed">Live Feed</TabsTrigger>}
            {has("tickets_basic") && <TabsTrigger value="tickets">Tickets</TabsTrigger>}
            {has("guests") && <TabsTrigger value="guests">Visitas</TabsTrigger>}
            {has("payments_tracking") && <TabsTrigger value="payments">Pagos</TabsTrigger>}
            {has("analytics_basic") && <TabsTrigger value="analytics">Analítica</TabsTrigger>}
          </TabsList>

          <TabsContent value="roster" className="space-y-6 pt-4">
            {isBoard ? (
              <>
                <BulkImport buildingId={buildingId} onDone={load} />
                <Card>
                  <CardHeader>
                    <CardTitle>Residentes</CardTitle>
                    <CardDescription>Un representante por unidad. Si hay inquilino, se muestra junto al propietario.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResidentsTable
                      rows={residents} units={units} buildingId={buildingId}
                      onChange={load}
                      onInviteRow={(r) => r.token && setLinkDialog({ open: true, url: `${window.location.origin}/activate?token=${r.token}` })}
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card><CardHeader><CardTitle>Sin permiso</CardTitle><CardDescription>No puedes administrar el roster.</CardDescription></CardHeader></Card>
            )}
          </TabsContent>

          {has("feed") && <TabsContent value="feed" className="pt-4"><FeedPanel buildingId={buildingId} isBoard={isBoard} /></TabsContent>}
          {has("tickets_basic") && <TabsContent value="tickets" className="pt-4"><TicketsPanel buildingId={buildingId} isBoard={isBoard} canCreate={false} /></TabsContent>}
          {has("guests") && <TabsContent value="guests" className="pt-4"><GuestsPanel buildingId={buildingId} isBoard={isBoard} canCreate={false} /></TabsContent>}
          {has("payments_tracking") && <TabsContent value="payments" className="pt-4"><PaymentsBoardPanel buildingId={buildingId} /></TabsContent>}
          {has("analytics_basic") && (
            <TabsContent value="analytics" className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <Stat label="Unidades" value={counts.units} />
                <Stat label="Residentes activos" value={counts.activeResidents} />
                <Stat label="Tickets abiertos" value={counts.openTickets} />
                <Stat label="Visitas próximas" value={counts.upcomingVisits} />
                <Stat label="Cargos pendientes" value={counts.pendingCharges} />
                <Stat label="Cargos pagados" value={counts.paidCharges} />
              </div>
            </TabsContent>
          )}

        </Tabs>
      </main>

      <InviteResidentDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        buildingId={buildingId}
        units={units}
        onCreated={(url) => { setInviteOpen(false); load(); setLinkDialog({ open: true, url }); }}
      />

      <Dialog open={linkDialog.open} onOpenChange={(o) => setLinkDialog({ ...linkDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enlace de activación</DialogTitle>
            <DialogDescription>Compártelo con la persona. Es de un solo uso.</DialogDescription>
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




function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-3xl font-semibold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
