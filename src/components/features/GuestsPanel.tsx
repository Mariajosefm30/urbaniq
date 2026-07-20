import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Car } from "lucide-react";

type Visit = {
  id: string; guest_name: string; expected_at: string | null;
  status: "expected" | "arrived" | "left";
  unit_id: string | null; host_id: string;
  vehicle_plate: string | null; needs_parking: boolean;
  created_at: string; unit_code?: string; host_name?: string;
};

const STATUS_LABEL: Record<string, string> = { expected: "Esperado", arrived: "Ingresó", left: "Salió" };

export function GuestsPanel({ buildingId, isBoard, canCreate, myUnitId }: {
  buildingId: string; isBoard: boolean; canCreate: boolean; myUnitId?: string | null;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ guest_name: "", expected_at: "", vehicle_plate: "", needs_parking: false });

  const load = async () => {
    const { data } = await supabase
      .from("visits")
      .select("id, guest_name, expected_at, status, unit_id, host_id, vehicle_plate, needs_parking, created_at")
      .eq("building_id", buildingId)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Visit[];
    const unitIds = Array.from(new Set(rows.map((r) => r.unit_id).filter(Boolean))) as string[];
    const userIds = Array.from(new Set(rows.map((r) => r.host_id)));
    const [{ data: us }, { data: ms }] = await Promise.all([
      unitIds.length ? supabase.from("units").select("id, code").in("id", unitIds) : Promise.resolve({ data: [] as any[] }),
      userIds.length ? supabase.from("memberships").select("user_id, resident_name").in("user_id", userIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const uMap = new Map((us ?? []).map((u: any) => [u.id, u.code]));
    const nMap = new Map<string, string>();
    (ms ?? []).forEach((m: any) => { if (!nMap.has(m.user_id)) nMap.set(m.user_id, m.resident_name || "Residente"); });
    rows.forEach((r) => { r.unit_code = r.unit_id ? uMap.get(r.unit_id) : undefined; r.host_name = nMap.get(r.host_id); });
    setVisits(rows);
  };

  useEffect(() => { load(); }, [buildingId]);

  const submit = async () => {
    if (!form.guest_name.trim() || !user || !myUnitId) return;
    setBusy(true);
    const { error } = await supabase.from("visits").insert({
      building_id: buildingId, unit_id: myUnitId, host_id: user.id,
      guest_name: form.guest_name.trim(),
      expected_at: form.expected_at ? new Date(form.expected_at).toISOString() : null,
      vehicle_plate: form.vehicle_plate.trim() || null,
      needs_parking: form.needs_parking,
      status: "expected",
    });
    setBusy(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setForm({ guest_name: "", expected_at: "", vehicle_plate: "", needs_parking: false });
    setOpen(false); load();
  };

  const setStatus = async (v: Visit, status: "expected" | "arrived" | "left") => {
    const { error } = await supabase.from("visits").update({ status }).eq("id", v.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{isBoard ? "Registro de visitas" : "Mis visitas"}</h2>
          <p className="text-sm text-muted-foreground">Incluye información de estacionamiento de visita.</p>
        </div>
        {canCreate && <Button onClick={() => setOpen(true)}>Registrar visita</Button>}
      </div>

      <div className="space-y-3">
        {visits.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sin visitas registradas.</p>}
        {visits.map((v) => (
          <Card key={v.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium">{v.guest_name}</span>
                    <Badge>{STATUS_LABEL[v.status]}</Badge>
                    {v.unit_code && <Badge variant="outline">Unidad {v.unit_code}</Badge>}
                    {v.needs_parking && <Badge variant="secondary"><Car className="h-3 w-3 mr-1" />Estac.</Badge>}
                    {v.vehicle_plate && <Badge variant="outline">{v.vehicle_plate}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {v.expected_at ? `Esperado: ${new Date(v.expected_at).toLocaleString("es-PE")}` : "Sin hora"} · Anfitrión: {v.host_name}
                  </p>
                </div>
                {isBoard && (
                  <div className="flex gap-1">
                    {v.status !== "arrived" && <Button size="sm" variant="outline" onClick={() => setStatus(v, "arrived")}>Ingresó</Button>}
                    {v.status !== "left" && <Button size="sm" variant="outline" onClick={() => setStatus(v, "left")}>Salió</Button>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar visita</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre del invitado</Label><Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} /></div>
            <div><Label>Fecha/hora esperada</Label><Input type="datetime-local" value={form.expected_at} onChange={(e) => setForm({ ...form, expected_at: e.target.value })} /></div>
            <div><Label>Placa del vehículo (opcional)</Label><Input value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} placeholder="ABC-123" /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.needs_parking} onChange={(e) => setForm({ ...form, needs_parking: e.target.checked })} />
              Necesita estacionamiento de visita
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={busy || !form.guest_name.trim()}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
