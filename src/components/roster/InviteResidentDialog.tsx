import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Unit } from "./UnitsTable";

export function InviteResidentDialog({
  open, onOpenChange, buildingId, units, onCreated,
  lockedUnitId, lockedType,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  buildingId: string; units: Unit[];
  onCreated: (url: string, meta?: { email?: string; phone?: string; name?: string }) => void;
  lockedUnitId?: string;
  lockedType?: "owner" | "tenant";
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ email: "", name: "", phone: "", type: "", unit_id: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        email: "", name: "", phone: "",
        type: lockedType ?? "",
        unit_id: lockedUnitId ?? "",
      });
    }
  }, [open, lockedUnitId, lockedType]);

  const submit = async () => {
    if (!form.email || !form.unit_id || !form.type) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-invite", {
      body: {
        email: form.email, role: "resident", building_id: buildingId,
        unit_id: form.unit_id, resident_name: form.name || null,
        phone: form.phone || null, resident_type: form.type,
      },
    });
    setBusy(false);
    if (error || !data?.ok) { toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" }); return; }
    onOpenChange(false);
    onCreated(data.activation_url);
  };

  const unitLabel = lockedUnitId ? units.find((u) => u.id === lockedUnitId)?.code : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Invitar {lockedType === "owner" ? "propietario" : lockedType === "tenant" ? "inquilino" : "residente"}
            {unitLabel && ` — Unidad ${unitLabel}`}
          </DialogTitle>
          <DialogDescription>Se generará un enlace de activación de un solo uso.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Correo *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-2"><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unidad *</Label>
              <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v })} disabled={!!lockedUnitId}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>{units.map((u) => <SelectItem key={u.id} value={u.id}>{u.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })} disabled={!!lockedType}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Propietario</SelectItem>
                  <SelectItem value="tenant">Inquilino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={busy || !form.email || !form.unit_id || !form.type}>Crear invitación</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
