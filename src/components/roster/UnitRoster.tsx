import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, Trash2, Plus, UserPlus, Home } from "lucide-react";
import { InviteResidentDialog } from "./InviteResidentDialog";
import type { Unit } from "./UnitsTable";
import type { ResidentRow } from "./ResidentsTable";

export function UnitRoster({
  units, residents, buildingId, onChange, onInvited,
}: {
  units: Unit[]; residents: ResidentRow[]; buildingId: string;
  onChange: () => void;
  onInvited: (url: string) => void;
}) {
  const { toast } = useToast();
  const [newUnit, setNewUnit] = useState("");
  const [invite, setInvite] = useState<{ unit: Unit; slot: "owner" | "tenant" } | null>(null);

  const byUnit = useMemo(() => {
    const m: Record<string, { owner?: ResidentRow; tenant?: ResidentRow }> = {};
    for (const u of units) m[u.id] = {};
    for (const r of residents) {
      if (!r.unit_id || !m[r.unit_id]) continue;
      const slot = (r.type as "owner" | "tenant") ?? undefined;
      if (slot === "owner" || slot === "tenant") m[r.unit_id][slot] = r;
    }
    return m;
  }, [units, residents]);

  const addUnit = async () => {
    if (!newUnit.trim()) return;
    const { error } = await supabase.from("units").insert({ building_id: buildingId, code: newUnit.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewUnit(""); onChange();
  };

  const removeUnit = async (u: Unit) => {
    const slots = byUnit[u.id] ?? {};
    if (slots.owner || slots.tenant) {
      toast({ title: "No se puede eliminar", description: "Elimina primero al owner/tenant de esta unidad.", variant: "destructive" });
      return;
    }
    if (!confirm(`¿Eliminar unidad ${u.code}?`)) return;
    const { error } = await supabase.from("units").delete().eq("id", u.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    onChange();
  };

  const removePerson = async (r: ResidentRow) => {
    if (!confirm(`¿Eliminar a ${r.email}? El historial del edificio se conserva.`)) return;
    const { error } = r.kind === "invite"
      ? await supabase.from("invites").delete().eq("id", r.id)
      : await supabase.from("memberships").delete().eq("id", r.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    onChange();
  };

  const copyLink = (token?: string) => {
    if (!token) return;
    navigator.clipboard.writeText(`${window.location.origin}/activate?token=${token}`);
    toast({ title: "Enlace copiado" });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Código de unidad (ej. 4B)" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="max-w-xs" />
        <Button onClick={addUnit}><Plus className="h-4 w-4 mr-1" /> Agregar unidad</Button>
      </div>

      {units.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Aún no hay unidades. Agrega una arriba o importa un archivo.
        </Card>
      )}

      <div className="grid gap-3">
        {units.map((u) => {
          const slots = byUnit[u.id] ?? {};
          return (
            <Card key={u.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold">Unidad {u.code}</h4>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeUnit(u)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className={`grid gap-2 ${slots.tenant ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
                <SlotCard
                  slot="owner"
                  row={slots.owner}
                  unit={u}
                  hasTenant={!!slots.tenant}
                  onInvite={() => setInvite({ unit: u, slot: "owner" })}
                  onInviteTenant={() => setInvite({ unit: u, slot: "tenant" })}
                  onCopy={copyLink}
                  onRemove={removePerson}
                />
                {slots.tenant && (
                  <SlotCard
                    slot="tenant"
                    row={slots.tenant}
                    unit={u}
                    hasTenant
                    onInvite={() => setInvite({ unit: u, slot: "tenant" })}
                    onCopy={copyLink}
                    onRemove={removePerson}
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {invite && (
        <InviteResidentDialog
          open
          onOpenChange={(o) => !o && setInvite(null)}
          buildingId={buildingId}
          units={units}
          lockedUnitId={invite.unit.id}
          lockedType={invite.slot}
          onCreated={(url) => { setInvite(null); onInvited(url); }}
        />
      )}
    </div>
  );
}

function SlotCard({
  slot, row, unit, onInvite, onCopy, onRemove,
}: {
  slot: "owner" | "tenant"; row?: ResidentRow; unit: Unit;
  onInvite: () => void; onCopy: (t?: string) => void; onRemove: (r: ResidentRow) => void;
}) {
  const label = slot === "owner" ? "Propietario" : "Inquilino";
  if (!row) {
    return (
      <div className="rounded border border-dashed p-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">Vacío</p>
        </div>
        <Button size="sm" variant="outline" onClick={onInvite}>
          <UserPlus className="h-4 w-4 mr-1" /> Invitar
        </Button>
      </div>
    );
  }
  return (
    <div className="rounded border p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Badge variant={row.status === "active" ? "secondary" : "outline"}>
          {row.status === "active" ? "Activo" : "Pendiente"}
        </Badge>
      </div>
      <p className="text-sm font-medium truncate">{row.name ?? "(sin nombre)"}</p>
      <p className="text-xs text-muted-foreground truncate">{row.email}</p>
      {row.phone && <p className="text-xs text-muted-foreground">{row.phone}</p>}
      <div className="mt-2 flex gap-1">
        {row.kind === "invite" && row.token && (
          <Button size="sm" variant="ghost" onClick={() => onCopy(row.token)}>
            <Copy className="h-3 w-3 mr-1" /> Copiar link
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onRemove(row)}>
          <Trash2 className="h-3 w-3 mr-1" /> Quitar
        </Button>
      </div>
    </div>
  );
}
