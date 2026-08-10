import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export const MANAGER_PERMISSIONS: { key: string; label: string; hint: string }[] = [
  { key: "maintenance", label: "Mantenimiento (Tickets)", hint: "Gestionar incidencias y estados" },
  { key: "guests", label: "Visitas", hint: "Registrar y controlar visitas" },
  { key: "payments", label: "Pagos", hint: "Revisar comprobantes y recordatorios" },
  { key: "feed", label: "Live Feed", hint: "Publicar novedades y encuestas" },
];

interface BuildingOption { id: string; name: string; tier: string }

export function InviteManagerDialog({
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
  const [areas, setAreas] = useState<string[]>(["maintenance"]);
  const [busy, setBusy] = useState(false);

  const eligible = buildings.filter((b) => b.tier !== "starter");

  const toggle = (key: string) =>
    setAreas((prev) => (prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]));

  const submit = async () => {
    if (!email || !buildingId || areas.length === 0) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-invite", {
      body: { email, role: "manager", building_id: buildingId, resident_name: name || null, areas },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    onOpenChange(false);
    const sentEmail = email;
    const sentName = name;
    setEmail(""); setName(""); setAreas(["maintenance"]);
    onDone(data.activation_url, { email: sentEmail, name: sentName || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar manager</DialogTitle>
          <DialogDescription>
            Elige el edificio y marca las áreas que este manager podrá administrar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Edificio</Label>
            <Select value={buildingId} onValueChange={setBuildingId}>
              <SelectTrigger><SelectValue placeholder="Selecciona el edificio" /></SelectTrigger>
              <SelectContent>
                {eligible.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {eligible.length === 0 && (
              <p className="text-xs text-muted-foreground">Los managers están disponibles desde el plan Growth.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Correo</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="manager@edificio.com" />
          </div>
          <div className="space-y-2">
            <Label>Nombre (opcional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ana Torres" />
          </div>
          <div className="space-y-2">
            <Label>Áreas asignadas</Label>
            <div className="space-y-2 rounded-md border p-3">
              {MANAGER_PERMISSIONS.map((p) => (
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
          <Button onClick={submit} disabled={busy || !email || !buildingId || areas.length === 0}>Crear invitación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
