import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Shield, Building2, ArrowLeft, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Org { id: string; name: string; }
interface AdminRow { user_id: string; email: string | null; name: string | null; org_id: string | null; org_name: string | null; }

export default function Superadmin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { session, loading: sessionLoading, refreshSession } = useSession();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminOrgId, setNewAdminOrgId] = useState<string>("");
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  // Guard
  useEffect(() => {
    if (authLoading || sessionLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!session?.is_superadmin) {
      toast.error("Acceso restringido al superadministrador");
      navigate("/");
    }
  }, [authLoading, sessionLoading, user, session, navigate]);

  const load = async () => {
    setLoading(true);
    const [{ data: orgsData }, { data: rolesData }] = await Promise.all([
      supabase.from("organizations").select("id, name").order("name"),
      supabase.from("user_roles").select("user_id, role").eq("role", "admin" as any),
    ]);
    setOrgs(orgsData || []);

    const ids = (rolesData || []).map((r: any) => r.user_id);
    if (ids.length === 0) {
      setAdmins([]);
      setLoading(false);
      return;
    }

    const { data: profs } = await supabase
      .from("profiles")
      .select("id, email, name, org_id")
      .in("id", ids);

    const orgsById = Object.fromEntries((orgsData || []).map((o) => [o.id, o.name]));
    setAdmins(
      (profs || []).map((p: any) => ({
        user_id: p.id,
        email: p.email,
        name: p.name,
        org_id: p.org_id,
        org_name: p.org_id ? orgsById[p.org_id] || null : null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (session?.is_superadmin) load();
  }, [session?.is_superadmin]);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    const { data, error } = await supabase
      .from("organizations")
      .insert({ name: newOrgName.trim() } as any)
      .select("id, name")
      .single();
    if (error) {
      toast.error("No se pudo crear la organización");
      return;
    }
    toast.success("Organización creada");
    setNewOrgName("");
    setOrgs((prev) => [...prev, data as Org].sort((a, b) => a.name.localeCompare(b.name)));
    setNewAdminOrgId(data!.id);
  };

  const handleAssignAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminOrgId) {
      toast.error("Ingresa un correo y selecciona una organización");
      return;
    }
    setCreating(true);

    const { data, error } = await supabase.functions.invoke("invite-admin", {
      body: { email: newAdminEmail.trim().toLowerCase(), org_id: newAdminOrgId },
    });

    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "No se pudo enviar la invitación");
      setCreating(false);
      return;
    }

    if ((data as any)?.emailSent) {
      toast.success("Invitación enviada por correo");
    } else {
      toast.success("Invitación registrada", {
        description: (data as any)?.emailError
          ? `No se pudo enviar el correo: ${(data as any).emailError}`
          : "El usuario podrá registrarse y quedará vinculado automáticamente.",
      });
    }

    setNewAdminEmail("");
    setCreating(false);
    load();
  };

  const handleRevokeAdmin = async (userId: string) => {
    if (!confirm("¿Quitar el rol de administrador a este usuario?")) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin" as any);
    if (error) {
      toast.error("No se pudo revocar");
      return;
    }
    toast.success("Rol revocado");
    load();
  };

  if (authLoading || sessionLoading || !session?.is_superadmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Superadministrador</h1>
            <p className="text-muted-foreground">
              Gestiona organizaciones y asigna administradores de la plataforma
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refreshSession()}>
          Refrescar sesión
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Crear organización
          </CardTitle>
          <CardDescription>
            Crea una nueva organización (cliente) cuando firmen el contrato.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Nombre de la organización"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
          />
          <Button onClick={handleCreateOrg}>Crear</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Asignar administrador</CardTitle>
          <CardDescription>
            Envía una invitación por correo. El usuario podrá registrarse y quedará vinculado como administrador de la organización elegida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Correo del usuario</Label>
            <Input
              type="email"
              placeholder="admin@cliente.com"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Organización</Label>
            <Select value={newAdminOrgId} onValueChange={setNewAdminOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una organización" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAssignAdmin} disabled={creating} className="w-full">
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Enviar invitación
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Administradores actuales</CardTitle>
          <CardDescription>{admins.length} administrador(es) en la plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
          ) : admins.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No hay administradores asignados todavía.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Organización</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((a) => (
                  <TableRow key={a.user_id}>
                    <TableCell>
                      <div className="font-medium">{a.name || "—"}</div>
                      <div className="text-sm text-muted-foreground">{a.email}</div>
                    </TableCell>
                    <TableCell>
                      {a.org_name ? <Badge>{a.org_name}</Badge> : <span className="text-muted-foreground">Sin organización</span>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleRevokeAdmin(a.user_id)}>
                        Revocar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Button variant="ghost" onClick={() => navigate("/admin")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Ir al panel de administrador
      </Button>
    </div>
  );
}
