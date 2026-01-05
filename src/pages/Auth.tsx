import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  name: z.string().trim().min(1, "El nombre es requerido").max(100),
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { session, loading: sessionLoading } = useSession();

  // Role-based redirects when already logged in
  useEffect(() => {
    if (sessionLoading || !user || !session) return;

    // Route based on role
    if (session.role === "admin") {
      if (!session.org_id) {
        navigate("/admin/setup", { replace: true });
      } else if (session.org_onboarding_completed === false) {
        navigate("/admin/onboarding", { replace: true });
      } else {
        navigate("/admin", { replace: true });
      }
    } else if (session.role === "manager") {
      navigate("/manager", { replace: true });
    } else if (session.role === "resident") {
      navigate("/feed", { replace: true });
    }
  }, [user, session, sessionLoading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        toast.success("¡Bienvenido de vuelta!");
        // AuthContext handles routing based on role
      } else {
        const validation = signupSchema.safeParse({ email, password, name });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const redirectUrl = `${window.location.origin}/auth`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { name }
          }
        });
        
        if (error) throw error;
        toast.success("¡Cuenta creada! Ya puedes iniciar sesión.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        toast.error("Este email ya está registrado. Intenta iniciar sesión.");
      } else {
        toast.error(error.message || "Error de autenticación");
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (sessionLoading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">PropPass</CardTitle>
          <CardDescription>
            {isLogin ? "Inicia sesión en tu cuenta" : "Crea tu cuenta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cargando...
                </>
              ) : isLogin ? (
                "Iniciar sesión"
              ) : (
                "Crear cuenta"
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </div>
          
          {!isLogin && (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              Tu rol será asignado por el administrador de tu edificio.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
