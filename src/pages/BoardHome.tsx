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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

          {has("feed") && canArea("feed") && <TabsContent value="feed" className="pt-4"><FeedPanel buildingId={buildingId} isBoard={true} /></TabsContent>}
          {has("tickets_basic") && canArea("maintenance") && <TabsContent value="tickets" className="pt-4"><TicketsPanel buildingId={buildingId} isBoard={true} canCreate={false} /></TabsContent>}
          {has("guests") && canArea("guests") && <TabsContent value="guests" className="pt-4"><GuestsPanel buildingId={buildingId} isBoard={true} canCreate={false} /></TabsContent>}
          {has("payments_tracking") && canArea("payments") && <TabsContent value="payments" className="pt-4"><PaymentsBoardPanel buildingId={buildingId} /></TabsContent>}
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

        {isAdminBoard && (
          <ManagersSection
            buildingId={buildingId}
            tier={building.tier}
            onInvited={(url, meta) => setLinkDialog({ open: true, url, ...(meta ?? {}) })}
          />
        )}

        {isAdminBoard && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">Personal de seguridad</CardTitle>
              <CardDescription>Invita al guardia. Podrá marcar ingreso/salida de visitas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={() => setSecurityInvite({ open: true, email: "", name: "", busy: false })}>
                Invitar seguridad
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={securityInvite.open} onOpenChange={(o) => setSecurityInvite((s) => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar personal de seguridad</DialogTitle>
            <DialogDescription>Se generará un enlace de activación de un solo uso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Correo</label>
              <Input type="email" value={securityInvite.email} onChange={(e) => setSecurityInvite((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input value={securityInvite.name} onChange={(e) => setSecurityInvite((s) => ({ ...s, name: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={securityInvite.busy || !securityInvite.email}
              onClick={async () => {
                setSecurityInvite((s) => ({ ...s, busy: true }));
                const { data, error } = await supabase.functions.invoke("create-invite", {
                  body: { email: securityInvite.email, role: "security", building_id: buildingId, resident_name: securityInvite.name || null },
                });
                setSecurityInvite((s) => ({ ...s, busy: false }));
                if (error || !data?.ok) { toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" }); return; }
                setSecurityInvite({ open: false, email: "", name: "", busy: false });
                setLinkDialog({ open: true, url: data.activation_url, email: securityInvite.email, name: securityInvite.name });
              }}
            >
              Crear invitación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              const msg = `${saludo}, te invito a activar tu cuenta en ${building.name} (PropPass):\n${linkDialog.url}`;
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

const AREA_OPTIONS: { key: string; label: string }[] = [
  { key: "maintenance", label: "Mantenimiento (Tickets)" },
  { key: "guests", label: "Visitas" },
  { key: "payments", label: "Pagos" },
  { key: "feed", label: "Live Feed" },
];
const AREA_LABEL: Record<string, string> = Object.fromEntries(AREA_OPTIONS.map((a) => [a.key, a.label]));

function ManagersSection({ buildingId, tier, onInvited }: { buildingId: string; tier: Tier; onInvited: (url: string, meta?: { email?: string; name?: string; phone?: string }) => void }) {
  const { toast } = useToast();
  const [managers, setManagers] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", areas: [] as string[], busy: false });

  const featureAvailable = tier !== "starter";

  const load = async () => {
    const [{ data: mem }, { data: inv }] = await Promise.all([
      supabase.from("memberships").select("id, user_id, resident_name, areas, revoked_at").eq("building_id", buildingId).eq("role", "manager").is("revoked_at", null),
      supabase.from("invites").select("id, email, resident_name, areas, token, accepted_at, expires_at").eq("building_id", buildingId).eq("role", "manager").is("accepted_at", null),
    ]);
    const ids = ((mem ?? []) as any[]).map((m) => m.user_id).filter(Boolean);
    const emailById = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email").in("id", ids);
      ((profs ?? []) as any[]).forEach((p) => emailById.set(p.id, p.email));
    }
    setManagers(((mem ?? []) as any[]).map((m) => ({ ...m, email: emailById.get(m.user_id) ?? "—" })));
    setPending((inv ?? []) as any[]);
  };
  useEffect(() => { if (featureAvailable) load(); }, [buildingId, featureAvailable]);

  if (!featureAvailable) return null;

  const toggleArea = (k: string) =>
    setForm((s) => ({ ...s, areas: s.areas.includes(k) ? s.areas.filter((x) => x !== k) : [...s.areas, k] }));

  const submit = async () => {
    if (!form.email || form.areas.length === 0) {
      toast({ title: "Faltan datos", description: "Correo y al menos 1 área", variant: "destructive" });
      return;
    }
    setForm((s) => ({ ...s, busy: true }));
    const { data, error } = await supabase.functions.invoke("create-invite", {
      body: { email: form.email, role: "manager", building_id: buildingId, resident_name: form.name || null, areas: form.areas },
    });
    setForm((s) => ({ ...s, busy: false }));
    if (error || !data?.ok) { toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" }); return; }
    setOpen(false);
    onInvited(data.activation_url, { email: form.email, name: form.name });
    setForm({ email: "", name: "", areas: [], busy: false });
    load();
  };

  const revoke = async (id: string) => {
    if (!confirm("¿Revocar acceso de este manager?")) return;
    const { error } = await supabase.from("memberships").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Manager revocado" });
    load();
  };

  const cancelInvite = async (id: string) => {
    await supabase.from("invites").delete().eq("id", id);
    load();
  };

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Managers (sub-admins por área)</CardTitle>
          <CardDescription>Da acceso acotado a áreas específicas. No pueden administrar el roster ni ver otras áreas.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>Invitar manager</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {managers.length === 0 && pending.length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no hay managers.</p>
        )}
        {managers.map((m) => (
          <div key={m.id} className="flex items-center justify-between border rounded-md p-3">
            <div>
              <p className="text-sm font-medium">{m.resident_name || m.email}</p>
              <p className="text-xs text-muted-foreground">{m.email}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {(m.areas ?? []).map((a: string) => <Badge key={a} variant="secondary">{AREA_LABEL[a] ?? a}</Badge>)}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => revoke(m.id)}>Revocar</Button>
          </div>
        ))}
        {pending.map((i) => (
          <div key={i.id} className="flex items-center justify-between border rounded-md p-3 border-dashed">
            <div>
              <p className="text-sm font-medium">{i.resident_name || i.email} <Badge variant="outline">Pendiente</Badge></p>
              <p className="text-xs text-muted-foreground">{i.email}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {(i.areas ?? []).map((a: string) => <Badge key={a} variant="secondary">{AREA_LABEL[a] ?? a}</Badge>)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onInvited(`${window.location.origin}/activate?token=${i.token}`, { email: i.email, name: i.resident_name })}>
                Ver enlace
              </Button>
              <Button size="sm" variant="ghost" onClick={() => cancelInvite(i.id)}>Cancelar</Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar manager</DialogTitle>
            <DialogDescription>Selecciona las áreas que este manager podrá administrar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Correo</label>
              <Input type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Áreas asignadas</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {AREA_OPTIONS.map((a) => (
                  <label key={a.key} className={`border rounded-md p-2 text-sm cursor-pointer ${form.areas.includes(a.key) ? "bg-primary/10 border-primary" : ""}`}>
                    <input type="checkbox" className="mr-2" checked={form.areas.includes(a.key)} onChange={() => toggleArea(a.key)} />
                    {a.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={form.busy || !form.email || form.areas.length === 0}>Crear invitación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
