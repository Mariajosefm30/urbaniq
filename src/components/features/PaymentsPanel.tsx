import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";

type Charge = {
  id: string; unit_id: string | null; concept: string; amount: number;
  currency: string; due_date: string | null; period: string | null;
  status: string; method: string | null; operation_code: string | null;
  proof_url: string | null; uploaded_by: string | null; uploaded_at: string | null;
  confirmed_by: string | null; confirmed_at: string | null; rejection_reason: string | null;
  created_at: string; unit_code?: string;
};

type Building = {
  id: string; yape_phone: string | null; plin_phone: string | null;
  qr_image_url: string | null; bank_name: string | null;
  bank_account: string | null; bank_holder: string | null;
};

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendiente", variant: "outline" },
  pendiente: { label: "Pendiente", variant: "outline" },
  en_revision: { label: "En revisión", variant: "secondary" },
  paid: { label: "Pagado", variant: "default" },
  pagado: { label: "Pagado", variant: "default" },
  rechazado: { label: "Rechazado", variant: "destructive" },
  overdue: { label: "Vencido", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

function fmt(amount: number, currency: string) {
  const sym = currency === "PEN" ? "S/" : currency;
  return `${sym} ${Number(amount).toFixed(2)}`;
}

async function signedUrl(path: string | null, bucket: string) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// ------------- Board settings block -------------
function CollectionSettings({ building, onSaved }: { building: Building; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    yape_phone: building.yape_phone ?? "",
    plin_phone: building.plin_phone ?? "",
    bank_name: building.bank_name ?? "",
    bank_account: building.bank_account ?? "",
    bank_holder: building.bank_holder ?? "",
  });
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { signedUrl(building.qr_image_url, "building-qr").then(setQrPreview); }, [building.qr_image_url]);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("buildings").update(form).eq("id", building.id);
    setBusy(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Guardado" }); onSaved(); }
  };

  const uploadQr = async (file: File) => {
    setBusy(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${building.id}/qr-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("building-qr").upload(path, file, { upsert: true });
    if (error) { setBusy(false); toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    const { error: e2 } = await supabase.from("buildings").update({ qr_image_url: path }).eq("id", building.id);
    setBusy(false);
    if (e2) toast({ title: "Error", description: e2.message, variant: "destructive" });
    else { toast({ title: "QR actualizado" }); onSaved(); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de cobro del edificio</CardTitle>
        <CardDescription>Estos datos se muestran a los propietarios cuando pagan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Yape (celular)</Label><Input value={form.yape_phone} onChange={(e) => setForm({ ...form, yape_phone: e.target.value })} placeholder="999 999 999" /></div>
          <div><Label>Plin (celular)</Label><Input value={form.plin_phone} onChange={(e) => setForm({ ...form, plin_phone: e.target.value })} placeholder="999 999 999" /></div>
          <div><Label>Banco (opcional)</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
          <div><Label>Titular</Label><Input value={form.bank_holder} onChange={(e) => setForm({ ...form, bank_holder: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Cuenta / CCI</Label><Input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} /></div>
        </div>
        <div>
          <Label>QR de Yape/Plin</Label>
          <div className="flex items-center gap-3 mt-2">
            {qrPreview ? <img src={qrPreview} alt="QR" className="h-24 w-24 rounded border" /> : <div className="h-24 w-24 rounded border flex items-center justify-center text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>}
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])} />
          </div>
        </div>
        <Button onClick={save} disabled={busy}>Guardar datos</Button>
      </CardContent>
    </Card>
  );
}

// ------------- Board create charge dialog -------------
function CreateChargeDialog({ buildingId, units, open, onOpenChange, onCreated }: {
  buildingId: string; units: { id: string; code: string }[];
  open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ unit_id: "", concept: "", amount: "", due_date: "", period: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setForm({ unit_id: "", concept: "", amount: "", due_date: "", period: "" }); }, [open]);

  const submit = async () => {
    if (!form.unit_id || !form.concept.trim() || !form.amount) return;
    setBusy(true);
    const { error } = await supabase.from("charges").insert({
      building_id: buildingId, unit_id: form.unit_id, concept: form.concept.trim(),
      amount: Number(form.amount), currency: "PEN",
      due_date: form.due_date || null, period: form.period || null,
      status: "pending",
    });
    setBusy(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { onCreated(); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo cargo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Unidad</Label>
            <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>{units.map((u) => <SelectItem key={u.id} value={u.id}>{u.code}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Concepto</Label><Input value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} placeholder="Mantenimiento julio" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Monto (S/)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Vencimiento</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <div><Label>Período (ej. 2026-07)</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------- Board Payments panel -------------
export function PaymentsBoardPanel({ buildingId }: { buildingId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [building, setBuilding] = useState<Building | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [units, setUnits] = useState<{ id: string; code: string }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewing, setReviewing] = useState<Charge | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    const [{ data: b }, { data: c }, { data: u }] = await Promise.all([
      supabase.from("buildings").select("id, yape_phone, plin_phone, qr_image_url, bank_name, bank_account, bank_holder").eq("id", buildingId).maybeSingle(),
      supabase.from("charges").select("*").eq("building_id", buildingId).order("created_at", { ascending: false }),
      supabase.from("units").select("id, code").eq("building_id", buildingId).order("code"),
    ]);
    setBuilding(b as Building | null);
    const rows = (c ?? []) as Charge[];
    const uList = (u ?? []) as { id: string; code: string }[];
    setUnits(uList);
    const uMap = new Map(uList.map((x) => [x.id, x.code]));
    rows.forEach((r) => { r.unit_code = r.unit_id ? uMap.get(r.unit_id) : undefined; });
    setCharges(rows);
  };

  useEffect(() => { load(); }, [buildingId]);

  useEffect(() => {
    if (reviewing?.proof_url) signedUrl(reviewing.proof_url, "payment-receipts").then(setProofUrl);
    else setProofUrl(null);
    setRejectReason("");
  }, [reviewing]);

  const confirm = async (c: Charge) => {
    const { error } = await supabase.from("charges").update({
      status: "paid", confirmed_by: user?.id, confirmed_at: new Date().toISOString(), rejection_reason: null,
    }).eq("id", c.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setReviewing(null); load(); toast({ title: "Cargo confirmado" }); }
  };

  const reject = async (c: Charge) => {
    if (!rejectReason.trim()) { toast({ title: "Indica un motivo", variant: "destructive" }); return; }
    const { error } = await supabase.from("charges").update({
      status: "rechazado", rejection_reason: rejectReason.trim(),
      confirmed_by: user?.id, confirmed_at: new Date().toISOString(),
    }).eq("id", c.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setReviewing(null); load(); toast({ title: "Rechazado" }); }
  };

  const markPaidDirect = async (c: Charge) => {
    const { error } = await supabase.from("charges").update({
      status: "paid", method: "cash", confirmed_by: user?.id, confirmed_at: new Date().toISOString(),
    }).eq("id", c.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  if (!building) return null;

  return (
    <div className="space-y-6">
      <CollectionSettings building={building} onSaved={load} />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Cargos</CardTitle>
            <CardDescription>Crea cargos por unidad y confirma pagos recibidos.</CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)}>Nuevo cargo</Button>
        </CardHeader>
        <CardContent>
          {charges.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sin cargos.</p>}
          <div className="space-y-2">
            {charges.map((c) => {
              const meta = STATUS_META[c.status] ?? { label: c.status, variant: "outline" as const };
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{c.concept}</span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {c.unit_code && <Badge variant="outline">Unidad {c.unit_code}</Badge>}
                      {c.period && <Badge variant="outline">{c.period}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {fmt(c.amount, c.currency)} {c.due_date && `· Vence ${new Date(c.due_date).toLocaleDateString("es-PE")}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {c.proof_url && <Button size="sm" variant="outline" onClick={() => setReviewing(c)}>Revisar</Button>}
                    {c.status !== "paid" && !c.proof_url && (
                      <Button size="sm" variant="outline" onClick={() => markPaidDirect(c)}>Marcar pagado</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <CreateChargeDialog buildingId={buildingId} units={units} open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar comprobante</DialogTitle>
            <DialogDescription>{reviewing?.concept} · {reviewing && fmt(reviewing.amount, reviewing.currency)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {reviewing?.method && <p className="text-sm">Método: <span className="font-medium">{reviewing.method}</span></p>}
            {reviewing?.operation_code && <p className="text-sm">Código: <span className="font-medium">{reviewing.operation_code}</span></p>}
            {proofUrl ? <img src={proofUrl} alt="Comprobante" className="w-full rounded border" /> : <p className="text-sm text-muted-foreground">Cargando comprobante...</p>}
            <div>
              <Label>Motivo de rechazo (si aplica)</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => reviewing && reject(reviewing)}><XCircle className="h-4 w-4 mr-1" />Rechazar</Button>
            <Button onClick={() => reviewing && confirm(reviewing)}><CheckCircle2 className="h-4 w-4 mr-1" />Confirmar pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------- Owner payments panel -------------
export function PaymentsOwnerPanel({ buildingId, unitId }: { buildingId: string; unitId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [building, setBuilding] = useState<Building | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [paying, setPaying] = useState<Charge | null>(null);
  const [form, setForm] = useState({ method: "yape", operation_code: "", file: null as File | null });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from("buildings").select("id, yape_phone, plin_phone, qr_image_url, bank_name, bank_account, bank_holder").eq("id", buildingId).maybeSingle(),
      supabase.from("charges").select("*").eq("building_id", buildingId).eq("unit_id", unitId).order("created_at", { ascending: false }),
    ]);
    setBuilding(b as Building | null);
    setCharges((c ?? []) as Charge[]);
    if ((b as Building | null)?.qr_image_url) signedUrl((b as Building).qr_image_url, "building-qr").then(setQrUrl);
  };

  useEffect(() => { load(); }, [buildingId, unitId]);
  useEffect(() => { if (paying) setForm({ method: "yape", operation_code: "", file: null }); }, [paying]);

  const uploadProof = async () => {
    if (!paying || !form.file || !user) return;
    setBusy(true);
    const ext = form.file.name.split(".").pop() || "jpg";
    const path = `${buildingId}/${paying.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("payment-receipts").upload(path, form.file, { upsert: true });
    if (upErr) { setBusy(false); toast({ title: "Error", description: upErr.message, variant: "destructive" }); return; }
    const { error } = await supabase.from("charges").update({
      status: "en_revision",
      method: form.method,
      operation_code: form.operation_code.trim() || null,
      proof_url: path,
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
      rejection_reason: null,
    }).eq("id", paying.id);
    setBusy(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setPaying(null); load(); toast({ title: "Comprobante enviado" }); }
  };

  return (
    <div className="space-y-4">
      {building && (
        <Card>
          <CardHeader>
            <CardTitle>¿Cómo pagar?</CardTitle>
            <CardDescription>Paga por Yape/Plin o transferencia y sube tu comprobante.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 text-sm">
              {building.yape_phone && <p><strong>Yape:</strong> {building.yape_phone}</p>}
              {building.plin_phone && <p><strong>Plin:</strong> {building.plin_phone}</p>}
              {building.bank_name && <p><strong>{building.bank_name}:</strong> {building.bank_account} ({building.bank_holder})</p>}
              {!building.yape_phone && !building.plin_phone && !building.bank_name && (
                <p className="text-muted-foreground">La administración aún no ha configurado los datos de cobro.</p>
              )}
            </div>
            {qrUrl && <img src={qrUrl} alt="QR Yape/Plin" className="h-40 w-40 rounded border justify-self-end" />}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Mis cargos</CardTitle></CardHeader>
        <CardContent>
          {charges.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No tienes cargos.</p>}
          <div className="space-y-2">
            {charges.map((c) => {
              const meta = STATUS_META[c.status] ?? { label: c.status, variant: "outline" as const };
              const canPay = c.status === "pending" || c.status === "pendiente" || c.status === "rechazado" || c.status === "overdue";
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{c.concept}</span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {c.period && <Badge variant="outline">{c.period}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {fmt(c.amount, c.currency)} {c.due_date && `· Vence ${new Date(c.due_date).toLocaleDateString("es-PE")}`}
                    </p>
                    {c.status === "rechazado" && c.rejection_reason && (
                      <p className="text-xs text-destructive mt-1">Motivo: {c.rejection_reason}</p>
                    )}
                  </div>
                  {canPay && <Button size="sm" onClick={() => setPaying(c)}><Upload className="h-4 w-4 mr-1" />Subir comprobante</Button>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir comprobante</DialogTitle>
            <DialogDescription>{paying?.concept} · {paying && fmt(paying.amount, paying.currency)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Método</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yape">Yape</SelectItem>
                  <SelectItem value="plin">Plin</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Código de operación (opcional)</Label><Input value={form.operation_code} onChange={(e) => setForm({ ...form, operation_code: e.target.value })} /></div>
            <div><Label>Comprobante (imagen)</Label><Input type="file" accept="image/*" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(null)}>Cancelar</Button>
            <Button onClick={uploadProof} disabled={busy || !form.file}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
