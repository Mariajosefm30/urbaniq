import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Lock, Plus, Trash2 } from "lucide-react";

type Poll = {
  id: string; question: string; options: string[]; multi: boolean;
  closes_at: string | null; closed_at: string | null;
  created_by: string; created_at: string;
};

type Vote = { id: string; poll_id: string; unit_id: string; option_indexes: number[] };

export function PollsSection({
  buildingId, canCreate, canClose, ownerUnitIds, totalOwnerUnits,
}: {
  buildingId: string;
  canCreate: boolean;
  canClose: boolean;
  ownerUnitIds: string[];
  totalOwnerUnits: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<Record<string, Vote[]>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ question: "", options: ["", ""], multi: false, closes_at: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: ps } = await supabase.from("polls")
      .select("id, question, options, multi, closes_at, closed_at, created_by, created_at")
      .eq("building_id", buildingId)
      .order("created_at", { ascending: false });
    const rows = (ps ?? []) as any[];
    rows.forEach((r) => { r.options = Array.isArray(r.options) ? r.options : []; });
    const ids = rows.map((r) => r.id);
    const { data: vs } = ids.length
      ? await supabase.from("poll_votes").select("id, poll_id, unit_id, option_indexes").in("poll_id", ids)
      : { data: [] as any[] };
    const grouped: Record<string, Vote[]> = {};
    ((vs ?? []) as Vote[]).forEach((v) => { (grouped[v.poll_id] ||= []).push(v); });
    setPolls(rows as Poll[]);
    setVotes(grouped);
  };

  useEffect(() => { load(); }, [buildingId]);

  const create = async () => {
    const opts = form.options.map((o) => o.trim()).filter(Boolean);
    if (!form.question.trim() || opts.length < 2 || !user) {
      toast({ title: "Completa pregunta y al menos 2 opciones", variant: "destructive" }); return;
    }
    setBusy(true);
    const { error } = await supabase.from("polls").insert({
      building_id: buildingId, question: form.question.trim(),
      options: opts, multi: form.multi,
      closes_at: form.closes_at ? new Date(form.closes_at).toISOString() : null,
      created_by: user.id,
    });
    setBusy(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setOpen(false); setForm({ question: "", options: ["", ""], multi: false, closes_at: "" }); load(); }
  };

  const closePoll = async (p: Poll) => {
    if (!user) return;
    const { error } = await supabase.from("polls").update({ closed_at: new Date().toISOString(), closed_by: user.id }).eq("id", p.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  const removePoll = async (p: Poll) => {
    const { error } = await supabase.from("polls").delete().eq("id", p.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  const castVote = async (p: Poll, unitId: string, selected: number[]) => {
    if (!user || selected.length === 0) return;
    const { error } = await supabase.from("poll_votes").insert({
      poll_id: p.id, unit_id: unitId, voter_user_id: user.id, option_indexes: selected,
    });
    if (error) toast({ title: "No se pudo votar", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Encuestas</CardTitle>
          <CardDescription>Vota una vez por unidad (solo propietarios).</CardDescription>
        </div>
        {canCreate && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Nueva</Button>}
      </CardHeader>
      <CardContent className="space-y-3">
        {polls.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin encuestas.</p>}
        {polls.map((p) => {
          const pVotes = votes[p.id] || [];
          const isClosed = !!p.closed_at || (p.closes_at && new Date(p.closes_at) < new Date());
          const totalUnitsVoted = new Set(pVotes.map((v) => v.unit_id)).size;
          const counts = p.options.map((_, i) => pVotes.filter((v) => v.option_indexes.includes(i)).length);
          const totalPicks = counts.reduce((a, b) => a + b, 0) || 1;
          const remainingUnits = ownerUnitIds.filter((uid) => !pVotes.some((v) => v.unit_id === uid));

          return (
            <div key={p.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.question}</span>
                    {isClosed && <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Cerrada</Badge>}
                    {p.multi && <Badge variant="secondary">Multi-selección</Badge>}
                    {p.closes_at && !isClosed && (
                      <Badge variant="outline">Cierra {new Date(p.closes_at).toLocaleString("es-PE")}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalUnitsVoted} de {totalOwnerUnits} unidades han votado
                  </p>
                </div>
                {canClose && (
                  <div className="flex gap-1">
                    {!isClosed && <Button variant="outline" size="sm" onClick={() => closePoll(p)}>Cerrar</Button>}
                    <Button variant="ghost" size="icon" onClick={() => removePoll(p)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {p.options.map((opt, i) => {
                  const pct = Math.round((counts[i] / totalPicks) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{opt}</span>
                        <span className="text-muted-foreground">{counts[i]} · {pct}%</span>
                      </div>
                      <div className="h-2 rounded bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {!isClosed && remainingUnits.length > 0 && (
                <VoteControls poll={p} units={remainingUnits} onVote={castVote} />
              )}
            </div>
          );
        })}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva encuesta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Pregunta</Label><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
            <div>
              <Label>Opciones</Label>
              <div className="space-y-2">
                {form.options.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={o} onChange={(e) => {
                      const next = [...form.options]; next[i] = e.target.value; setForm({ ...form, options: next });
                    }} placeholder={`Opción ${i + 1}`} />
                    {form.options.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => {
                        const next = form.options.filter((_, idx) => idx !== i); setForm({ ...form, options: next });
                      }}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, options: [...form.options, ""] })}>
                  <Plus className="h-4 w-4 mr-1" />Agregar opción
                </Button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.multi} onChange={(e) => setForm({ ...form, multi: e.target.checked })} />
              Permitir selección múltiple
            </label>
            <div><Label>Fecha de cierre (opcional)</Label><Input type="datetime-local" value={form.closes_at} onChange={(e) => setForm({ ...form, closes_at: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create} disabled={busy}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function VoteControls({ poll, units, onVote }: {
  poll: Poll; units: string[]; onVote: (p: Poll, unitId: string, selected: number[]) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [unitId, setUnitId] = useState(units[0]);

  const toggle = (i: number) => {
    if (poll.multi) setSelected((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i]);
    else setSelected([i]);
  };

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      <p className="text-xs text-muted-foreground">Tu voto (como propietario de la unidad):</p>
      <div className="flex flex-wrap gap-1">
        {poll.options.map((opt, i) => (
          <Button key={i} size="sm" variant={selected.includes(i) ? "default" : "outline"} onClick={() => toggle(i)}>
            {opt}
          </Button>
        ))}
      </div>
      {units.length > 1 && (
        <select className="text-sm border rounded px-2 py-1" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          {units.map((u) => <option key={u} value={u}>Unidad {u.slice(0, 8)}</option>)}
        </select>
      )}
      <Button size="sm" disabled={selected.length === 0} onClick={() => { onVote(poll, unitId, selected); setSelected([]); }}>
        Enviar voto
      </Button>
    </div>
  );
}
