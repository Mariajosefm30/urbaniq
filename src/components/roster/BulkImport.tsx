import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Copy, Loader2 } from "lucide-react";

interface Row { unit: string; role: string; name?: string; email: string; phone?: string; }
interface ParsedRow extends Row { _row: number; _errors: string[]; _include: boolean; }

const HEADERS = ["unit", "role", "name", "email", "phone"];

function validate(rows: Row[]): ParsedRow[] {
  const slotSeen = new Set<string>();
  return rows.map((r, i) => {
    const errors: string[] = [];
    if (!r.unit) errors.push("unit requerido");
    if (!r.email) errors.push("email requerido");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errors.push("email inválido");
    if (!r.role) errors.push("role requerido (owner|tenant)");
    else if (!["owner", "tenant"].includes(r.role)) errors.push("role debe ser owner|tenant");
    const slot = `${r.unit}|${r.role}`;
    if (r.unit && r.role) {
      if (slotSeen.has(slot)) errors.push(`ya hay un ${r.role} para ${r.unit} en el archivo`);
      slotSeen.add(slot);
    }
    return { ...r, _row: i + 2, _errors: errors, _include: errors.length === 0 };
  });
}

export function BulkImport({ buildingId, onDone }: { buildingId: string; onDone: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ created: number; failed: number; results: any[] } | null>(null);

  const downloadTemplate = () => {
    const csv = "unit,role,name,email,phone\n4B,owner,Ana Torres,ana@example.com,+51999999999\n4B,tenant,Luis Perez,luis@example.com,+51988888888\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "roster_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (f: File) => {
    setReport(null);
    const buf = await f.arrayBuffer();
    let raw: any[] = [];
    if (f.name.toLowerCase().endsWith(".xlsx")) {
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
    } else {
      const text = new TextDecoder().decode(buf);
      const res = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      raw = res.data;
    }
    const rows: Row[] = raw.map((r) => ({
      unit: String(r.unit ?? "").trim(),
      role: String(r.role ?? r.type ?? "").trim().toLowerCase(),
      name: String(r.name ?? r.resident_name ?? "").trim() || undefined,
      email: String(r.email ?? "").trim(),
      phone: String(r.phone ?? "").trim() || undefined,
    }));
    setPreview(validate(rows));
  };

  const commit = async () => {
    const rows = preview.filter((r) => r._include && r._errors.length === 0)
      .map(({ _row, _errors, _include, ...r }) => r);
    if (rows.length === 0) { toast({ title: "Nada para importar", variant: "destructive" }); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("roster-bulk-import", { body: { building_id: buildingId, rows } });
    setBusy(false);
    if (error || !data?.ok) { toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" }); return; }
    setReport({ created: data.created, failed: data.failed, results: data.results });
    setPreview([]);
    if (fileRef.current) fileRef.current.value = "";
    onDone();
  };

  const copyAllLinks = () => {
    if (!report) return;
    const lines = report.results.filter((r) => r.ok && r.activation_url).map((r) => `${r.email}: ${r.activation_url}`);
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: `Copiados ${lines.length} enlaces` });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Importar unidades y residentes</CardTitle>
          <CardDescription>Un solo archivo (CSV o Excel). Columnas: {HEADERS.join(", ")}. Una fila por persona (owner o tenant).</CardDescription>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" /> Plantilla</Button>
          <Button size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> Elegir archivo</Button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {preview.length > 0 && (
          <>
            <div className="rounded border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Fila</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, idx) => (
                    <TableRow key={idx} className={r._errors.length ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <Checkbox checked={r._include} disabled={r._errors.length > 0}
                          onCheckedChange={(v) => setPreview((p) => p.map((x, i) => i === idx ? { ...x, _include: !!v } : x))} />
                      </TableCell>
                      <TableCell>{r._row}</TableCell>
                      <TableCell>{r.unit}</TableCell>
                      <TableCell>{r.role}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>{r.phone}</TableCell>
                      <TableCell>
                        {r._errors.length === 0
                          ? <Badge variant="secondary">Listo</Badge>
                          : <Badge variant="destructive">{r._errors.join(", ")}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {preview.filter((r) => r._include).length} de {preview.length} se importarán.
              </p>
              <Button onClick={commit} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Importar
              </Button>
            </div>
          </>
        )}

        {report && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Resultado</CardTitle>
                <CardDescription>{report.created} creados · {report.failed} con error</CardDescription>
              </div>
              {report.created > 0 && (
                <Button size="sm" variant="outline" onClick={copyAllLinks}><Copy className="h-4 w-4 mr-1" /> Copiar enlaces</Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="max-h-72 overflow-auto space-y-1 text-sm">
                {report.results.map((r, i) => (
                  <div key={i} className="flex justify-between border-b py-1">
                    <span>{r.email}</span>
                    <span className={r.ok ? "text-primary" : "text-destructive"}>{r.ok ? "OK" : r.error}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
