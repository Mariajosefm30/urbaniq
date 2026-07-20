import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Shield, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Visit = {
  id: string; guest_name: string; expected_at: string | null;
  status: "expected" | "arrived" | "left";
  unit_id: string | null; host_id: string;
  needs_parking: boolean; created_at: string;
  unit_code?: string; host_name?: string;
};

const STATUS_LABEL: Record<string, string> = { expected: "Esperado", arrived: "Ingresó", left: "Salió" };

export default function SecurityHome() {
  const { buildingId = "" } = useParams();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [buildingName, setBuildingName] = useState("");
  const [visits, setVisits] = useState<Visit[]>([]);

  const load = async () => {
    const [{ data: b }, { data }] = await Promise.all([
      supabase.from("buildings").select("name").eq("id", buildingId).maybeSingle(),
      supabase.from("visits")
        .select("id, guest_name, expected_at, status, unit_id, host_id, needs_parking, created_at")
        .eq("building_id", buildingId)
        .order("created_at", { ascending: false }),
    ]);
    setBuildingName((b as any)?.name ?? "");
    const rows = (data ?? []) as Visit[];
    const unitIds = Array.from(new Set(rows.map((r) => r.unit_id).filter(Boolean))) as string[];
    const userIds = Array.from(new Set(rows.map((r) => r.host_id)));
    const [{ data: us }, { data: ms }] = await Promise.all([
      unitIds.length ? supabase.from("units").select("id, code").in("id", unitIds) : Promise.resolve({ data: [] as any[] }),
      userIds.length ? supabase.from("memberships").select("user_id, resident_name").in("user_id", userIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const uMap = new Map((us ?? []).map((u: any) => [u.id, u.code]));
    const nMap = new Map<string, string>();
    (ms ?? []).forEach((m: any) => { if (!nMap.has(m.user_id)) nMap.set(m.user_id, m.resident_name || "Residente"); });
    rows.forEach((r) => { r.unit_code = r.unit_id ? uMap.get(r.unit_id) : undefined; r.host_name = nMap.get(r.host_id); });
    setVisits(rows);
  };

  useEffect(() => { if (buildingId) load(); }, [buildingId]);

  const setStatus = async (v: Visit, status: "expected" | "arrived" | "left") => {
    const { error } = await supabase.from("visits").update({ status }).eq("id", v.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                {buildingName}<Badge variant="secondary">Seguridad</Badge>
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4 mr-2" /> Salir</Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-4">
        <div>
          <h1 className="text-lg font-semibold">Control de acceso</h1>
          <p className="text-sm text-muted-foreground">Marca el ingreso y la salida de cada visita.</p>
        </div>

        {visits.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sin visitas registradas.</p>}
        {visits.map((v) => (
          <Card key={v.id}>
            <CardContent className="pt-6 flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium">{v.guest_name}</span>
                  <Badge>{STATUS_LABEL[v.status]}</Badge>
                  {v.unit_code && <Badge variant="outline">Unidad {v.unit_code}</Badge>}
                  {v.needs_parking && <Badge variant="secondary">Estac.</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {v.expected_at ? `Esperado: ${new Date(v.expected_at).toLocaleString("es-PE")}` : "Sin hora"} · Anfitrión: {v.host_name}
                </p>
              </div>
              <div className="flex gap-1">
                {v.status !== "arrived" && <Button size="sm" onClick={() => setStatus(v, "arrived")}>Ingresó</Button>}
                {v.status !== "left" && <Button size="sm" variant="outline" onClick={() => setStatus(v, "left")}>Salió</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
