import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, LogOut, Copy, Plus, Mail, UserCog, ShieldCheck } from "lucide-react";
import { TIER_LABELS, TIER_SEATS, type Tier } from "@/lib/tiers";
import { Link } from "react-router-dom";
import { ReassignSeatDialog } from "@/components/platform/ReassignSeatDialog";
import { InviteSecurityDialog } from "@/components/platform/InviteSecurityDialog";
import { InviteManagerDialog } from "@/components/platform/InviteManagerDialog";


interface Building { id: string; name: string; tier: Tier; address: string | null; created_at: string; }
interface Invite { id: string; email: string; role: string; building_id: string | null; token: string; accepted_at: string | null; }
interface AdminMembership { id: string; user_id: string; building_id: string; }

export default function PlatformAdmin() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [adminMems, setAdminMems] = useState<AdminMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBuilding, setNewBuilding] = useState({ name: "", tier: "starter" as Tier, address: "" });
  const [creatingBuilding, setCreatingBuilding] = useState(false);
  const [inviteDialog, setInviteDialog] = useState<{ open: boolean; buildingId: string }>({ open: false, buildingId: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; url: string }>({ open: false, url: "" });
  const [reassign, setReassign] = useState<{ open: boolean; buildingId: string; membershipId: string | null }>({ open: false, buildingId: "", membershipId: null });
  const [securityOpen, setSecurityOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);


  const load = async () => {
    setLoading(true);
    const [bRes, iRes, mRes] = await Promise.all([
      supabase.from("buildings").select("*").order("created_at", { ascending: false }),
      supabase.from("invites").select("*").order("created_at", { ascending: false }),
      supabase.from("memberships").select("id, user_id, building_id").eq("role", "admin_board"),
    ]);
    if (bRes.data) setBuildings(bRes.data as Building[]);
    if (iRes.data) setInvites(iRes.data as Invite[]);
    if (mRes.data) setAdminMems(mRes.data as AdminMembership[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createBuilding = async () => {
    if (!newBuilding.name) return;
    setCreatingBuilding(true);
    const { error } = await supabase.from("buildings").insert({
      name: newBuilding.name, tier: newBuilding.tier, address: newBuilding.address || null,
    });
    setCreatingBuilding(false);
    if (error) { toast({ title: "Error creando edificio", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Edificio creado" });
    setNewBuilding({ name: "", tier: "starter", address: "" });
    load();
  };

  const inviteBoard = async () => {
    if (!inviteEmail || !inviteDialog.buildingId) return;
    setInviteBusy(true);
    const { data, error } = await supabase.functions.invoke("create-invite", {
      body: { email: inviteEmail, role: "admin_board", building_id: inviteDialog.buildingId },
    });
    setInviteBusy(false);
    if (error || !data?.ok) { toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" }); return; }
    setInviteDialog({ open: false, buildingId: "" });
    setInviteEmail("");
    setLinkDialog({ open: true, url: data.activation_url });
    load();
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copiado al portapapeles" }); };

  const seatStatus = (b: Building) => {
    const active = adminMems.filter((m) => m.building_id === b.id).length;
    const pending = invites.filter((i) => i.building_id === b.id && i.role === "admin_board" && !i.accepted_at).length;
    const cap = TIER_SEATS[b.tier];
    return { active, pending, cap };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-semibold">UrbanIQ · Platform Admin</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4 mr-2" /> Salir</Button>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal de seguridad</CardTitle>
            <CardDescription>
              Invita a la portería con un correo centralizado y define qué información puede ver.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setSecurityOpen(true)} disabled={buildings.length === 0}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Invitar seguridad
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Crear edificio</CardTitle>
            <CardDescription>Registra un edificio y elige su plan.</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nombre</Label>
              <Input value={newBuilding.name} onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })} placeholder="Torre Central" />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={newBuilding.tier} onValueChange={(v: Tier) => setNewBuilding({ ...newBuilding, tier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={createBuilding} disabled={creatingBuilding || !newBuilding.name} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Crear
              </Button>
            </div>
            <div className="space-y-2 sm:col-span-4">
              <Label>Dirección (opcional)</Label>
              <Input value={newBuilding.address} onChange={(e) => setNewBuilding({ ...newBuilding, address: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-semibold mb-4">Edificios ({buildings.length})</h2>
          {loading ? <p className="text-sm text-muted-foreground">Cargando...</p>
            : buildings.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay edificios.</p>
            : (
              <div className="grid gap-3">
                {buildings.map((b) => {
                  const s = seatStatus(b);
                  const seatFull = s.cap !== null && s.active + s.pending >= s.cap;
                  const currentAdmin = adminMems.find((m) => m.building_id === b.id) ?? null;
                  return (
                    <Card key={b.id}>
                      <CardContent className="flex items-center justify-between py-4 gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{b.name}</p>
                            <Badge variant="secondary">{TIER_LABELS[b.tier]}</Badge>
                            <Badge variant={seatFull ? "destructive" : "outline"}>
                              Admin: {s.active + s.pending}/{s.cap ?? "∞"}
                              {s.pending > 0 && ` · ${s.pending} pend.`}
                            </Badge>
                          </div>
                          {b.address && <p className="text-xs text-muted-foreground">{b.address}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={seatFull}
                            onClick={() => setInviteDialog({ open: true, buildingId: b.id })}>
                            <Mail className="h-4 w-4 mr-1" /> Invitar admin
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => setReassign({ open: true, buildingId: b.id, membershipId: currentAdmin?.id ?? null })}>
                            <UserCog className="h-4 w-4 mr-1" /> Reasignar
                          </Button>
                          <Button asChild size="sm" variant="ghost"><Link to={`/board/${b.id}`}>Abrir</Link></Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
        </div>

      </main>

      <Dialog open={inviteDialog.open} onOpenChange={(o) => setInviteDialog({ ...inviteDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar administrador del edificio</DialogTitle>
            <DialogDescription>Se generará un enlace de activación para copiar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2"><Label>Correo</Label><Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></div>
          <DialogFooter><Button onClick={inviteBoard} disabled={inviteBusy || !inviteEmail}>Crear invitación</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialog.open} onOpenChange={(o) => setLinkDialog({ ...linkDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enlace de activación</DialogTitle>
            <DialogDescription>Comparte este enlace. Es de un solo uso.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={linkDialog.url} />
            <Button onClick={() => copy(linkDialog.url)}><Copy className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReassignSeatDialog
        open={reassign.open}
        onOpenChange={(o) => setReassign({ ...reassign, open: o })}
        buildingId={reassign.buildingId}
        currentMembershipId={reassign.membershipId}
        onDone={(url) => { setLinkDialog({ open: true, url }); load(); }}
      />

      <InviteSecurityDialog
        open={securityOpen}
        onOpenChange={setSecurityOpen}
        buildings={buildings.map((b) => ({ id: b.id, name: b.name }))}
        onDone={(url) => { setLinkDialog({ open: true, url }); load(); }}
      />

    </div>
  );
}
