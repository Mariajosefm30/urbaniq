import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";

export interface Unit { id: string; code: string; }

export function UnitsTable({ units, buildingId, residentCountByUnit, onChange }: {
  units: Unit[]; buildingId: string;
  residentCountByUnit: Record<string, number>;
  onChange: () => void;
}) {
  const { toast } = useToast();
  const [newCode, setNewCode] = useState("");
  const [editing, setEditing] = useState<{ id: string; code: string } | null>(null);

  const add = async () => {
    if (!newCode.trim()) return;
    const { error } = await supabase.from("units").insert({ building_id: buildingId, code: newCode.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewCode(""); onChange();
  };

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from("units").update({ code: editing.code.trim() }).eq("id", editing.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setEditing(null); onChange();
  };

  const remove = async (u: Unit) => {
    const count = residentCountByUnit[u.id] ?? 0;
    if (count > 0) {
      toast({ title: "No se puede eliminar", description: `Tiene ${count} residente(s). Reasígnalos o elimínalos primero.`, variant: "destructive" });
      return;
    }
    if (!confirm(`¿Eliminar unidad ${u.code}?`)) return;
    const { error } = await supabase.from("units").delete().eq("id", u.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="4B" value={newCode} onChange={(e) => setNewCode(e.target.value)} className="max-w-xs" />
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Agregar unidad</Button>
      </div>
      <div className="rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Residentes</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sin unidades.</TableCell></TableRow>
            )}
            {units.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  {editing?.id === u.id
                    ? <Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} className="max-w-xs" />
                    : u.code}
                </TableCell>
                <TableCell>{residentCountByUnit[u.id] ?? 0}</TableCell>
                <TableCell className="text-right space-x-1">
                  {editing?.id === u.id ? (
                    <>
                      <Button size="icon" variant="ghost" onClick={save}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => setEditing({ id: u.id, code: u.code })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(u)}><Trash2 className="h-4 w-4" /></Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
