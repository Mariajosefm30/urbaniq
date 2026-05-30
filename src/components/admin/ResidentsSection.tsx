import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Home } from "lucide-react";
import { toast } from "sonner";

interface PendingResident {
  id: string;
  email: string;
  unit_id: string | null;
  claimed_at: string | null;
  created_at: string;
  unit_code?: string | null;
}

interface Unit { id: string; code: string; }

interface Props {
  buildingId: string;
  orgId: string | null;
}

export default function ResidentsSection({ buildingId, orgId }: Props) {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingResident[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [unitId, setUnitId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: prs }, { data: us }] = await Promise.all([
      (supabase as any)
        .from("pending_residents")
        .select("id, email, unit_id, claimed_at, created_at")
        .eq("building_id", buildingId)
        .order("created_at", { ascending: false }),
      supabase.from("units").select("id, code").eq("building_id", buildingId).order("code"),
    ]);
    const unitsById = Object.fromEntries((us || []).map((u: any) => [u.id, u.code]));
    setUnits(us || []);
    setPending(
      (prs || []).map((p: any) => ({ ...p, unit_code: p.unit_id ? unitsById[p.unit_id] : null }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (buildingId) load();
  }, [buildingId]);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error("Ingresa un correo");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    const { error } = await (supabase as any).from("pending_residents").insert({
      email: email.trim().toLowerCase(),
      building_id: buildingId,
      unit_id: unitId || null,
      org_id: orgId,
      invited_by: user.id,
    });
    if (error) {
      if (error.code === "23505") {
        toast.error("Ya invitaste a este correo en este edificio");
      } else {
        toast.error("No se pudo crear la invitación");
        console.error(error);
      }
      setSubmitting(false);
      return;
    }
    toast.success("Residente pre-cargado. Cuando se registre con este correo entrará directo a su edificio.");
    setEmail("");
    setUnitId("");
    setSubmitting(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta invitación?")) return;
    const { error } = await (supabase as any).from("pending_residents").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" /> Residentes pre-cargados
        </CardTitle>
        <CardDescription>
          Crea los residentes (correo + unidad). Cuando se registren con ese correo, el sistema los enlazará automáticamente con su edificio y unidad.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <div className="space-y-1">
            <Label>Correo del residente</Label>
            <Input
              type="email"
              placeholder="residente@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Unidad</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleInvite} disabled={submitting} className="w-full md:w-auto">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Agregar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-6 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aún no hay residentes pre-cargados.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>{p.unit_code || "—"}</TableCell>
                  <TableCell>
                    {p.claimed_at ? (
                      <Badge variant="secondary">Registrado</Badge>
                    ) : (
                      <Badge>Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!p.claimed_at && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
