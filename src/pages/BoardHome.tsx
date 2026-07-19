import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, LogOut, Copy, Plus, Mail, ArrowLeft } from "lucide-react";
import { TIER_FEATURES, TIER_LABELS, type Tier, type Feature } from "@/lib/tiers";

interface Building { id: string; name: string; tier: Tier; address: string | null; }
interface Unit { id: string; code: string; }
interface Membership { id: string; user_id: string; role: string; unit_id: string | null; }
interface Invite { id: string; email: string; role: string; unit_id: string | null; token: string; accepted_at: string | null; }

export default function BoardHome() {
  const { buildingId = "" } = useParams();
  const { user, signOut, isPlatformAdmin, memberships } = useAuth();
  const { toast } = useToast();
  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [newUnit, setNewUnit] = useState("");
  const [inviteResident, setInviteResident] = useState({ open: false, email: "", unitId: "" });
  const [linkDialog, setLinkDialog] = useState({ open: false, url: "" });

  const myMembership = memberships.find((m) => m.building_id === buildingId);
  const isBoard = isPlatformAdmin || myMembership?.role === "admin_board";

  const load = async () => {
    const { data: b } = await supabase.from("buildings").select("*").eq("id", buildingId).maybeSingle();
    setBuilding(b as Building | null);
    const { data: u } = await supabase.from("units").select("id, code").eq("building_id", buildingId).order("code");
    setUnits((u ?? []) as Unit[]);
    const { data: m } = await supabase.from("memberships").select("id, user_id, role, unit_id").eq("building_id", buildingId);
    setMembers((m ?? []) as Membership[]);
    const { data: i } = await supabase.from("invites").select("id, email, role, unit_id, token, accepted_at").eq("building_id", buildingId).order("created_at", { ascending: false });
    setInvites((i ?? []) as Invite[]);
  };

  useEffect(() => { if (buildingId) load(); }, [buildingId]);

  const addUnit = async () => {
    if (!newUnit.trim()) return;
    const { error } = await supabase.from("units").insert({ building_id: buildingId, code: newUnit.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewUnit("");
    load();
  };

  const sendInvite = async () => {
    if (!inviteResident.email || !inviteResident.unitId) return;
    const { data, error } = await supabase.functions.invoke("create-invite", {
      body: { email: inviteResident.email, role: "resident", building_id: buildingId, unit_id: inviteResident.unitId },
    });
    if (error || !data?.ok) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    setInviteResident({ open: false, email: "", unitId: "" });
    setLinkDialog({ open: true, url: data.activation_url });
    load();
  };

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast({ title: "Copiado" }); };

  if (!building) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando...</div>;
  }

  const tierFeatures = TIER_FEATURES[building.tier];
  const has = (f: Feature) => tierFeatures.includes(f);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {isPlatformAdmin && (
              <Button variant="ghost" size="icon" asChild>
                <Link to="/platform"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
            )}
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                {building.name}
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
        <Tabs defaultValue="people">
          <TabsList>
            <TabsTrigger value="people">Personas y unidades</TabsTrigger>
            {has("feed") && <TabsTrigger value="feed">Live Feed</TabsTrigger>}
            {has("tickets_basic") && <TabsTrigger value="tickets">Tickets</TabsTrigger>}
            {has("guests") && <TabsTrigger value="guests">Visitas</TabsTrigger>}
            {has("payments_tracking") && <TabsTrigger value="payments">Pagos</TabsTrigger>}
            {has("analytics_basic") && <TabsTrigger value="analytics">Analítica</TabsTrigger>}
          </TabsList>

          <TabsContent value="people" className="space-y-6 pt-4">
            {isBoard && (
              <Card>
                <CardHeader>
                  <CardTitle>Unidades</CardTitle>
                  <CardDescription>Crea las unidades (ej. "4B") del edificio.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input placeholder="4B" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} />
                    <Button onClick={addUnit}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {units.map((u) => <Badge key={u.id} variant="outline">{u.code}</Badge>)}
                    {units.length === 0 && <p className="text-sm text-muted-foreground">Sin unidades aún.</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {isBoard && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Residentes</CardTitle>
                    <CardDescription>Invita residentes; recibirán un enlace de activación.</CardDescription>
                  </div>
                  <Button onClick={() => setInviteResident({ ...inviteResident, open: true })} disabled={units.length === 0}>
                    <Mail className="h-4 w-4 mr-1" /> Invitar residente
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {invites.filter((i) => i.role === "resident").map((i) => {
                    const url = `${window.location.origin}/activate?token=${i.token}`;
                    const unit = units.find((u) => u.id === i.unit_id)?.code ?? "?";
                    return (
                      <div key={i.id} className="flex items-center justify-between border rounded p-2">
                        <div>
                          <p className="text-sm font-medium">{i.email} · Unidad {unit}</p>
                          <p className="text-xs text-muted-foreground">{i.accepted_at ? "Activo" : "Pendiente"}</p>
                        </div>
                        {!i.accepted_at && (
                          <Button size="sm" variant="outline" onClick={() => copy(url)}>
                            <Copy className="h-4 w-4 mr-1" /> Copiar link
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {invites.filter((i) => i.role === "resident").length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin residentes invitados.</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Miembros activos ({members.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {members.map((m) => (
                  <p key={m.id} className="text-sm">
                    <Badge variant="secondary" className="mr-2">{m.role}</Badge>
                    {m.unit_id ? `Unidad ${units.find((u) => u.id === m.unit_id)?.code ?? "?"}` : "—"}
                  </p>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {has("feed") && <TabsContent value="feed" className="pt-4"><ComingSoon feature="Live Feed" /></TabsContent>}
          {has("tickets_basic") && <TabsContent value="tickets" className="pt-4"><ComingSoon feature="Tickets" /></TabsContent>}
          {has("guests") && <TabsContent value="guests" className="pt-4"><ComingSoon feature="Registro de visitas" /></TabsContent>}
          {has("payments_tracking") && <TabsContent value="payments" className="pt-4"><ComingSoon feature="Pagos" /></TabsContent>}
          {has("analytics_basic") && <TabsContent value="analytics" className="pt-4"><ComingSoon feature="Analítica" /></TabsContent>}
        </Tabs>
      </main>

      <Dialog open={inviteResident.open} onOpenChange={(o) => setInviteResident({ ...inviteResident, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar residente</DialogTitle>
            <DialogDescription>Se generará un enlace de activación de un solo uso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Correo</Label>
              <Input type="email" value={inviteResident.email} onChange={(e) => setInviteResident({ ...inviteResident, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Select value={inviteResident.unitId} onValueChange={(v) => setInviteResident({ ...inviteResident, unitId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecciona una unidad" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={sendInvite} disabled={!inviteResident.email || !inviteResident.unitId}>Crear invitación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialog.open} onOpenChange={(o) => setLinkDialog({ ...linkDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enlace de activación</DialogTitle>
            <DialogDescription>Compártelo con el residente. Es de un solo uso.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={linkDialog.url} />
            <Button onClick={() => copy(linkDialog.url)}><Copy className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComingSoon({ feature }: { feature: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{feature}</CardTitle>
        <CardDescription>Disponible en tu plan. La UI de esta sección se habilitará próximamente.</CardDescription>
      </CardHeader>
    </Card>
  );
}
