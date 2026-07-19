import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface InviteInfo {
  email: string;
  role: string;
  building_id: string | null;
  building_name?: string | null;
}

export default function Activate() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) {
        setError("Token faltante");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("activate-invite", {
        body: { action: "lookup", token },
      });
      if (error || !data?.ok) {
        setError(data?.error || "Invitación inválida o expirada");
      } else {
        setInfo(data.invite);
      }
      setLoading(false);
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Contraseña muy corta", description: "Mínimo 8 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("activate-invite", {
      body: { action: "activate", token, password },
    });
    if (error || !data?.ok) {
      toast({ title: "Error al activar", description: data?.error || error?.message || "Intenta de nuevo", variant: "destructive" });
      setSubmitting(false);
      return;
    }
    // Sign in with the new password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: info!.email,
      password,
    });
    setSubmitting(false);
    if (signInErr) {
      toast({ title: "Cuenta creada", description: "Inicia sesión con tu contraseña." });
      navigate("/auth");
      return;
    }
    navigate("/home", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enlace no válido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Activa tu cuenta</CardTitle>
          <CardDescription>
            Bienvenido a PropPass. Crea una contraseña para <strong>{info?.email}</strong>.
            <br />
            Rol: <strong>{info?.role}</strong>
            {info?.building_name && <> — {info.building_name}</>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Contraseña</Label>
              <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Confirma contraseña</Label>
              <Input id="pw2" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Activando..." : "Crear cuenta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
