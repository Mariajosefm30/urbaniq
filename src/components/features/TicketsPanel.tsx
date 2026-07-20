import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Trash2 } from "lucide-react";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

type Ticket = {
  id: string; title: string; description: string | null;
  status: TicketStatus;
  unit_id: string | null; created_by: string; created_at: string;
  closed_at: string | null;
  unit_code?: string; author_name?: string;
};

type Comment = {
  id: string; ticket_id: string; author_id: string; body: string; created_at: string;
  author_name?: string;
};

const STATUS_META: Record<TicketStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  open: { label: "Abierto", variant: "default" },
  in_progress: { label: "En proceso", variant: "secondary" },
  resolved: { label: "Resuelto", variant: "outline" },
  closed: { label: "Cerrado", variant: "outline" },
};

export function TicketsPanel({ buildingId, isBoard, canCreate, myUnitId }: {
  buildingId: string; isBoard: boolean; canCreate: boolean; myUnitId?: string | null;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("id, title, description, status, unit_id, created_by, created_at, closed_at")
      .eq("building_id", buildingId)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Ticket[];
    const unitIds = Array.from(new Set(rows.map((r) => r.unit_id).filter(Boolean))) as string[];
    const userIds = Array.from(new Set(rows.map((r) => r.created_by)));
    const ticketIds = rows.map((r) => r.id);

    const [{ data: us }, { data: ms }, { data: cs }] = await Promise.all([
      unitIds.length ? supabase.from("units").select("id, code").in("id", unitIds) : Promise.resolve({ data: [] as any[] }),
      userIds.length ? supabase.from("memberships").select("user_id, resident_name, role").in("user_id", userIds) : Promise.resolve({ data: [] as any[] }),
      ticketIds.length ? supabase.from("ticket_comments").select("id, ticket_id, author_id, body, created_at").in("ticket_id", ticketIds).order("created_at", { ascending: true }) : Promise.resolve({ data: [] as any[] }),
    ]);
    const uMap = new Map((us ?? []).map((u: any) => [u.id, u.code]));
    const nMap = new Map<string, string>();
    (ms ?? []).forEach((m: any) => {
      if (!nMap.has(m.user_id))
        nMap.set(m.user_id, m.resident_name || (m.role === "admin_board" ? "Administración" : m.role === "manager" ? "Manager" : "Residente"));
    });
    rows.forEach((r) => { r.unit_code = r.unit_id ? uMap.get(r.unit_id) : undefined; r.author_name = nMap.get(r.created_by); });

    // Author names for comments — fetch any missing
    const commentRows = (cs ?? []) as Comment[];
    const missingIds = Array.from(new Set(commentRows.map((c) => c.author_id).filter((id) => !nMap.has(id))));
    if (missingIds.length) {
      const { data: extra } = await supabase.from("memberships").select("user_id, resident_name, role").in("user_id", missingIds);
      (extra ?? []).forEach((m: any) => {
        if (!nMap.has(m.user_id))
          nMap.set(m.user_id, m.resident_name || (m.role === "admin_board" ? "Administración" : m.role === "manager" ? "Manager" : "Usuario"));
      });
    }
    commentRows.forEach((c) => (c.author_name = nMap.get(c.author_id) || "Usuario"));
    const grouped: Record<string, Comment[]> = {};
    commentRows.forEach((c) => { (grouped[c.ticket_id] ||= []).push(c); });

    setTickets(rows);
    setComments(grouped);
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

  const setStatus = async (t: Ticket, status: TicketStatus) => {
    const { error } = await supabase.from("tickets").update({ status }).eq("id", t.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  const sendComment = async (ticketId: string) => {
    const text = (drafts[ticketId] || "").trim();
    if (!text || !user) return;
    const { error } = await supabase.from("ticket_comments").insert({
      ticket_id: ticketId, building_id: buildingId, author_id: user.id, body: text,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setDrafts((d) => ({ ...d, [ticketId]: "" }));
    load();
  };

  const removeComment = async (c: Comment) => {
    const { error } = await supabase.from("ticket_comments").delete().eq("id", c.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

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
        {tickets.map((t) => {
          const meta = STATUS_META[t.status] ?? STATUS_META.open;
          const list = comments[t.id] || [];
          const isOpen = openId === t.id;
          return (
            <Card key={t.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium">{t.title}</span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {t.unit_code && <Badge variant="outline">Unidad {t.unit_code}</Badge>}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      {t.author_name} · {new Date(t.created_at).toLocaleString("es-PE")}
                      {t.closed_at && ` · Cerrado ${new Date(t.closed_at).toLocaleString("es-PE")}`}
                    </p>
                  </div>
                  {isBoard && (
                    <div className="flex flex-col gap-1 items-end">
                      {t.status !== "in_progress" && t.status !== "closed" && t.status !== "resolved" && (
                        <Button variant="outline" size="sm" onClick={() => setStatus(t, "in_progress")}>En proceso</Button>
                      )}
                      {t.status !== "closed" && t.status !== "resolved" && (
                        <Button variant="outline" size="sm" onClick={() => setStatus(t, "closed")}>Cerrar</Button>
                      )}
                      {(t.status === "closed" || t.status === "resolved") && (
                        <Button variant="outline" size="sm" onClick={() => setStatus(t, "open")}>Reabrir</Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setOpenId(isOpen ? null : t.id)}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    {list.length} {list.length === 1 ? "comentario" : "comentarios"}
                  </Button>
                  {isOpen && (
                    <div className="mt-2 space-y-2">
                      {list.map((c) => (
                        <div key={c.id} className="flex items-start justify-between gap-2 rounded-md bg-muted/50 p-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{c.author_name}</span>
                              <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("es-PE")}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                          </div>
                          {(isBoard || c.author_id === user?.id) && (
                            <Button variant="ghost" size="icon" onClick={() => removeComment(c)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder={isBoard ? "Responder al residente..." : "Escribe un mensaje..."}
                          value={drafts[t.id] || ""}
                          onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(t.id); } }}
                        />
                        <Button size="sm" onClick={() => sendComment(t.id)} disabled={!(drafts[t.id] || "").trim()}>Enviar</Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
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
