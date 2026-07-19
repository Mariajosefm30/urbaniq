import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, Pencil, Trash2, Mail } from "lucide-react";
import type { Unit } from "./UnitsTable";

export interface ResidentRow {
  kind: "invite" | "membership";
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  type: string | null;
  unit_id: string | null;
  status: "pending" | "active";
  token?: string;
}

export function ResidentsTable({
  rows, units, buildingId, onChange, onInvite,
}: {
  rows: ResidentRow[]; units: Unit[]; buildingId: string;
  onChange: () => void;
  onInvite: () => void;
}) {
  const { toast } = useToast();
  const [edit, setEdit] = useState<ResidentRow | null>(null);
  const [busy, setBusy] = useState(false);

  const unitCode = (id: string | null) => units.find((u) => u.id === id)?.code ?? "—";

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/activate?token=${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Enlace copiado" });
  };

  const remove = async (r: ResidentRow) => {
    if (!confirm(`¿Eliminar a ${r.email}? El historial del edificio se conserva.`)) return;
    const table = r.kind === "invite" ? "invites" : "memberships";
    const { error } = await supabase.from(table).delete().eq("id", r.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    onChange();
  };

  const save = async () => {
    if (!edit) return;
    setBusy(true);
    const table = edit.kind === "invite" ? "invites" : "memberships";
    const payload: Record<string, any> = {
      unit_id: edit.unit_id,
      resident_name: edit.name,
      phone: edit.phone,
      resident_type: edit.type,
    };
    const { error } = await supabase.from(table).update(payload).eq("id", edit.id);
    setBusy(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setEdit(null); onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onInvite} disabled={units.length === 0}><Mail className="h-4 w-4 mr-1" /> Invitar residente</Button>
      </div>
      <div className="rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right w-40">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Sin residentes.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={`${r.kind}-${r.id}`}>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.name ?? "—"}</TableCell>
                <TableCell>{unitCode(r.unit_id)}</TableCell>
                <TableCell>{r.type ?? "—"}</TableCell>
                <TableCell>{r.phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "active" ? "secondary" : "outline"}>
                    {r.status === "active" ? "Activo" : "Pendiente"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {r.kind === "invite" && r.token && (
                    <Button size="icon" variant="ghost" onClick={() => copyLink(r.token!)}><Copy className="h-4 w-4" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar residente</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select value={edit.unit_id ?? ""} onValueChange={(v) => setEdit({ ...edit, unit_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{units.map((u) => <SelectItem key={u.id} value={u.id}>{u.code}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={edit.type ?? ""} onValueChange={(v) => setEdit({ ...edit, type: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Propietario</SelectItem>
                    <SelectItem value="tenant">Inquilino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={edit.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={save} disabled={busy}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
