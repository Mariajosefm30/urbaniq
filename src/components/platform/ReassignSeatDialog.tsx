import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

export function ReassignSeatDialog({
  open, onOpenChange, buildingId, currentMembershipId, onDone,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  buildingId: string; currentMembershipId: string | null;
  onDone: (activation_url: string) => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email) return;
    setBusy(true);
    if (currentMembershipId) {
      const { error: delErr } = await supabase.from("memberships").delete().eq("id", currentMembershipId);
      if (delErr) { setBusy(false); toast({ title: "Error", description: delErr.message, variant: "destructive" }); return; }
    }
    const { data, error } = await supabase.functions.invoke("create-invite", {
      body: { email, role: "admin_board", building_id: buildingId, reassign: true },
    });
    setBusy(false);
    if (error || !data?.ok) { toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" }); return; }
    setEmail("");
    onOpenChange(false);
    onDone(data.activation_url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reasignar asiento de admin</DialogTitle>
          <DialogDescription>
            Se revoca el acceso del admin actual y sus invitaciones pendientes; se genera una nueva invitación para la persona indicada.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>Todos los datos del edificio (unidades, residentes, tickets, visitas, pagos, posts) permanecen intactos. Solo cambia quién es admin.</div>
        </div>
        <div className="space-y-2">
          <Label>Correo del nuevo admin</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <DialogFooter><Button onClick={submit} disabled={busy || !email}>Confirmar reasignación</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
