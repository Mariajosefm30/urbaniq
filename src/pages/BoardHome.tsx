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
import { UnitRoster } from "@/components/roster/UnitRoster";
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
  const [ownerUnits, setOwnerUnits] = useState<{ owned: string[]; total: number }>({ owned: [], total: 0 });
  
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; url: string; email?: string; phone?: string; name?: string }>({ open: false, url: "" });
  const [inviteOpen, setInviteOpen] = useState(false);

  const myMembership = memberships.find((m) => m.building_id === buildingId);
  const isAdminBoard = isPlatformAdmin || myMembership?.role === "admin_board";
  const isManager = myMembership?.role === "manager";
  const managerAreas = (myMembership?.areas ?? []) as string[];
  const isBoard = isAdminBoard; // full board privileges (roster, seats, settings)
  const canArea = (a: string) => isAdminBoard || (isManager && managerAreas.includes(a));

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

    const memberIds = ((mem ?? []) as any[]).map((m) => m.user_id).filter(Boolean);
    const emailById = new Map<string, string>();
    if (memberIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email").in("id", memberIds);
      ((profs ?? []) as any[]).forEach((p) => emailById.set(p.id, p.email));
    }

    const rows: ResidentRow[] = [
      ...((mem ?? []) as any[]).map((m) => ({
        kind: "membership" as const, id: m.id, email: emailById.get(m.user_id) ?? "—", name: m.resident_name, phone: m.phone,
        type: m.resident_type, unit_id: m.unit_id, status: "active" as const,
      })),
      ...((inv ?? []) as any[]).map((i) => ({
        kind: "invite" as const, id: i.id, email: i.email, name: i.resident_name, phone: i.phone,
        type: i.resident_type, unit_id: i.unit_id, status: "pending" as const, token: i.token,
      })),
    ];
    setResidents(rows);

    const [tk, vs, ch] = await Promise.all([
      supabase.from("tickets").select("id, status, created_at, closed_at").eq("building_id", buildingId),
      supabase.from("visits").select("id, expected_at").eq("building_id", buildingId).eq("status", "expected"),
      supabase.from("charges").select("id, status").eq("building_id", buildingId),
    ]);
    const ticketRows = (tk.data ?? []) as any[];
    const closed = ticketRows.filter((t) => (t.status === "closed" || t.status === "resolved") && t.closed_at);
    const avgMs = closed.length
      ? closed.reduce((s, t) => s + (new Date(t.closed_at).getTime() - new Date(t.created_at).getTime()), 0) / closed.length
      : 0;
    setCounts({
      units: uList.length,
      activeResidents: (mem ?? []).length,
      openTickets: ticketRows.filter((t) => t.status === "open" || t.status === "in_progress").length,
      upcomingVisits: ((vs.data ?? []) as any[]).filter((v) => !v.expected_at || new Date(v.expected_at) >= new Date()).length,
      pendingCharges: ((ch.data ?? []) as any[]).filter((c) => c.status === "pending" || c.status === "overdue" || c.status === "en_revision").length,
      paidCharges: ((ch.data ?? []) as any[]).filter((c) => c.status === "paid" || c.status === "pagado").length,
      avgResolutionHours: avgMs ? Math.round((avgMs / 3600000) * 10) / 10 : 0,
    });

    // owners for polls tally
    const owners = ((mem ?? []) as any[]).filter((m) => m.resident_type === "owner" && m.unit_id);
    const ownedByMe = owners.filter((m) => m.user_id === user?.id).map((m) => m.unit_id) as string[];
    const totalOwnerUnits = new Set(owners.map((m) => m.unit_id)).size;
    setOwnerUnits({ owned: ownedByMe, total: totalOwnerUnits });
  };

  useEffect(() => { if (buildingId) load(); }, [buildingId]);

  // Realtime analytics (Growth+): re-fetch on relevant table changes
  useEffect(() => {
    if (!buildingId || !building) return;
    if (!TIER_FEATURES[building.tier].includes("analytics_realtime")) return;
    const ch = supabase
      .channel(`board-live-${buildingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `building_id=eq.${buildingId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "charges", filter: `building_id=eq.${buildingId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "visits", filter: `building_id=eq.${buildingId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "polls", filter: `building_id=eq.${buildingId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [buildingId, building?.tier]);

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
        <Tabs defaultValue={isAdminBoard ? "roster" : (canArea("feed") ? "feed" : canArea("maintenance") ? "tickets" : canArea("guests") ? "guests" : "payments")}>
          <TabsList>
            {isAdminBoard && <TabsTrigger value="roster">Residentes</TabsTrigger>}
            {has("feed") && canArea("feed") && <TabsTrigger value="feed">Live Feed</TabsTrigger>}
            {has("tickets_basic") && canArea("maintenance") && <TabsTrigger value="tickets">Tickets</TabsTrigger>}
            {has("guests") && canArea("guests") && <TabsTrigger value="guests">Visitas</TabsTrigger>}
            {has("payments_tracking") && canArea("payments") && <TabsTrigger value="payments">Pagos</TabsTrigger>}
            {isAdminBoard && has("analytics_basic") && <TabsTrigger value="analytics">Analítica</TabsTrigger>}
          </TabsList>

          {isAdminBoard && (
            <TabsContent value="roster" className="space-y-6 pt-4">
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
                    onInviteRow={(r) => r.token && setLinkDialog({ open: true, url: `${window.location.origin}/activate?token=${r.token}`, email: r.email, phone: r.phone ?? undefined, name: r.name ?? undefined })}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {has("feed") && canArea("feed") && (
            <TabsContent value="feed" className="pt-4">
              <FeedPanel
                buildingId={buildingId}
                isBoard={true}
                polls={has("polls") ? {
                  enabled: true,
                  canCreate: isAdminBoard || (isManager && managerAreas.includes("feed")),
                  canClose: isAdminBoard || (isManager && managerAreas.includes("feed")),
                  ownerUnitIds: ownerUnits.owned,
                  totalOwnerUnits: ownerUnits.total,
                } : undefined}
              />
            </TabsContent>
          )}
          {has("tickets_basic") && canArea("maintenance") && <TabsContent value="tickets" className="pt-4"><TicketsPanel buildingId={buildingId} isBoard={true} canCreate={false} advancedStates={has("tickets_states")} /></TabsContent>}
          {has("guests") && canArea("guests") && <TabsContent value="guests" className="pt-4"><GuestsPanel buildingId={buildingId} isBoard={true} canCreate={false} /></TabsContent>}
          {has("payments_tracking") && canArea("payments") && <TabsContent value="payments" className="pt-4"><PaymentsBoardPanel buildingId={buildingId} canRemind={has("payments_reminders")} /></TabsContent>}
          {isAdminBoard && has("analytics_basic") && (
            <TabsContent value="analytics" className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <Stat label="Unidades" value={counts.units} />
                <Stat label="Residentes activos" value={counts.activeResidents} />
                <Stat label="Tickets abiertos" value={counts.openTickets} />
                <Stat label="Tiempo prom. resolución (h)" value={counts.avgResolutionHours} />
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
        onCreated={(url, meta) => { setInviteOpen(false); load(); setLinkDialog({ open: true, url, ...(meta ?? {}) }); }}
      />

      <Dialog open={linkDialog.open} onOpenChange={(o) => setLinkDialog({ ...linkDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartir invitación</DialogTitle>
            <DialogDescription>Envíala por WhatsApp o correo. Es un enlace de un solo uso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={linkDialog.url} />
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(linkDialog.url); toast({ title: "Copiado" }); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {(() => {
              const nombre = linkDialog.name?.trim().split(/\s+/)[0] || "";
              const saludo = nombre ? `Hola ${nombre}` : "Hola";
              const msg = `${saludo}, te invito a activar tu cuenta en ${building.name} (UrbanIQ):\n${linkDialog.url}`;
              const phone = (linkDialog.phone ?? "").replace(/[^\d]/g, "");
              const waUrl = phone
                ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
                : `https://wa.me/?text=${encodeURIComponent(msg)}`;
              const mailUrl = `mailto:${linkDialog.email ?? ""}?subject=${encodeURIComponent(`Activa tu cuenta en ${building.name}`)}&body=${encodeURIComponent(msg)}`;
              return (
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild className="bg-[#25D366] hover:bg-[#1ebe5d] text-white">
                    <a href={waUrl} target="_blank" rel="noreferrer">WhatsApp</a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={mailUrl}>Correo</a>
                  </Button>
                </div>
              );
            })()}
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

