import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Ticket = {
  id: string; title: string; description: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  unit_id: string | null; created_by: string; created_at: string;
  unit_code?: string; author_name?: string;
};

export function TicketsPanel({ buildingId, isBoard, canCreate, myUnitId }: {
  buildingId: string; isBoard: boolean; canCreate: boolean; myUnitId?: string | null;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("id, title, description, status, unit_id, created_by, created_at")
      .eq("building_id", buildingId)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Ticket[];
    const unitIds = Array.from(new Set(rows.map((r) => r.unit_id).filter(Boolean))) as string[];
    const userIds = Array.from(new Set(rows.map((r) => r.created_by)));
    const [{ data: us }, { data: ms }] = await Promise.all([
      unitIds.length ? supabase.from("units").select("id, code").in("id", unitIds) : Promise.resolve({ data: [] as any[] }),
      userIds.length ? supabase.from("memberships").select("user_id, resident_name").in("user_id", userIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const uMap = new Map((us ?? []).map((u: any) => [u.id, u.code]));
    const nMap = new Map<string, string>();
    (ms ?? []).forEach((m: any) => { if (!nMap.has(m.user_id)) nMap.set(m.user_id, m.resident_name || "Residente"); });
    rows.forEach((r) => { r.unit_code = r.unit_id ? uMap.get(r.unit_id) : undefined; r.author_name = nMap.get(r.created_by); });
    setTickets(rows);
  };

  useEffect(() => { load(); }, [buildingId]);

  const submit = async () => {
    if (!form.title.trim() || !user || !myUnitId) return;
    setBusy(true);
    const { error } = await supabase.from("tickets").insert({
      building_id: buildingId, unit_id: myUnitId, created_by: user.id,
      title: form.title.trim(), description: form.description.trim() || null,
      status: "open",
    });
    setBusy(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setForm({ title: "", description: "" }); setOpen(false); load();
  };

  const setStatus = async (t: Ticket, status: "open" | "closed") => {
    const { error } = await supabase.from("tickets").update({ status }).eq("id", t.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  const isClosed = (s: string) => s === "closed" || s === "resolved";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{isBoard ? "Tickets del edificio" : "Mis tickets"}</h2>
          <p className="text-sm text-muted-foreground">{isBoard ? "Todos los tickets de mantenimiento" : "Tickets de tu unidad"}</p>
        </div>
        {canCreate && <Button onClick={() => setOpen(true)}>Nuevo ticket</Button>}
      </div>

      <div className="space-y-3">
        {tickets.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sin tickets.</p>}
        {tickets.map((t) => (
          <Card key={t.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{t.title}</span>
                    <Badge variant={isClosed(t.status) ? "secondary" : "default"}>
                      {isClosed(t.status) ? "Cerrado" : "Abierto"}
                    </Badge>
                    {t.unit_code && <Badge variant="outline">Unidad {t.unit_code}</Badge>}
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    {t.author_name} · {new Date(t.created_at).toLocaleString("es-PE")}
                  </p>
                </div>
                {isBoard && (
                  <Button variant="outline" size="sm" onClick={() => setStatus(t, isClosed(t.status) ? "open" : "closed")}>
                    {isClosed(t.status) ? "Reabrir" : "Cerrar"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Descripción</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={busy || !form.title.trim()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
