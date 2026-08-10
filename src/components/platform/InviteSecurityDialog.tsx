import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export const SECURITY_PERMISSIONS: { key: string; label: string; hint: string }[] = [
  { key: "guests", label: "Visitas e invitados", hint: "Marcar ingreso y salida" },
  { key: "residents", label: "Directorio de residentes", hint: "Ver nombres y unidades" },
  { key: "feed", label: "Novedades del edificio", hint: "Leer comunicados" },
  { key: "maintenance", label: "Tickets de mantenimiento", hint: "Ver incidencias" },
  { key: "payments", label: "Pagos", hint: "No recomendado para seguridad" },
];

interface BuildingOption { id: string; name: string }

export function InviteSecurityDialog({
  open, onOpenChange, buildings, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  buildings: BuildingOption[];
  onDone: (url: string, meta: { email: string; name?: string }) => void;
}) {
  const { toast } = useToast();
  const [buildingId, setBuildingId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [areas, setAreas] = useState<string[]>(["guests"]);
  const [busy, setBusy] = useState(false);

  const toggle = (key: string) =>
    setAreas((prev) => (prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]));

  const submit = async () => {
    if (!email || !buildingId) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-invite", {
      body: { email, role: "security", building_id: buildingId, resident_name: name || null, areas },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    onOpenChange(false);
    const sentEmail = email;
    const sentName = name;
    setEmail(""); setName(""); setAreas(["guests"]);
    onDone(data.activation_url, { email: sentEmail, name: sentName || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar personal de seguridad</DialogTitle>
          <DialogDescription>
            Usa un correo centralizado de portería (ej. seguridad@edificio.com) y elige qué puede ver.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Edificio</Label>
            <Select value={buildingId} onValueChange={setBuildingId}>
              <SelectTrigger><SelectValue placeholder="Selecciona el edificio" /></SelectTrigger>
              <SelectContent>
                {buildings.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Correo de seguridad</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seguridad@edificio.com" />
          </div>
          <div className="space-y-2">
            <Label>Nombre o turno (opcional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Portería · Turno noche" />
          </div>
          <div className="space-y-2">
            <Label>Permisos de visualización</Label>
            <div className="space-y-2 rounded-md border p-3">
              {SECURITY_PERMISSIONS.map((p) => (
                <label key={p.key} className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={areas.includes(p.key)} onCheckedChange={() => toggle(p.key)} className="mt-0.5" />
                  <span className="text-sm leading-tight">
                    {p.label}
                    <span className="block text-xs text-muted-foreground">{p.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={busy || !email || !buildingId}>Crear invitación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
