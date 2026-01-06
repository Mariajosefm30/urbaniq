import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Users, Home, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UserRole = "admin" | "manager" | "resident";

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const ROLE_OPTIONS: RoleOption[] = [
  { 
    value: "admin", 
    label: "Administrador", 
    description: "Encargado de todos los permisos del edificio y contacto principal con los propietarios. Puede crear edificios y asignar gerentes.",
    icon: <Shield className="h-6 w-6" />
  },
  { 
    value: "manager", 
    label: "Gerente / Encargado", 
    description: "Encargado de las operaciones del edificio. No puede crear edificios ni modificar permisos.",
    icon: <Users className="h-6 w-6" />
  },
  { 
    value: "resident", 
    label: "Residente", 
    description: "Propietario o inquilino. Acceso a amenidades, pagos y comunicación con la administración.",
    icon: <Home className="h-6 w-6" />
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  // Check if user already has a role
  useEffect(() => {
    const checkExistingRole = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          // User already has a role, redirect appropriately
          const role = data.role;
          if (role === 'admin') {
            navigate('/admin', { replace: true });
          } else if (role === 'manager') {
            navigate('/manager', { replace: true });
          } else {
            navigate('/feed', { replace: true });
          }
          return;
        }
      } catch (error) {
        console.error('Error checking role:', error);
      }
      
      setCheckingRole(false);
    };

    if (!authLoading) {
      checkExistingRole();
    }
  }, [user, authLoading, navigate]);

  const handleContinue = async () => {
    if (!selectedRole || !user) return;

    setSaving(true);
    try {
      // Insert role into user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: selectedRole,
        });

      if (roleError) throw roleError;

      // Update profile role for backwards compatibility
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', user.id);

      if (profileError) {
        console.warn('Failed to update profile role:', profileError);
      }

      toast({
        title: "¡Bienvenido!",
        description: `Tu rol ha sido configurado como ${ROLE_OPTIONS.find(r => r.value === selectedRole)?.label}.`,
      });

      // Redirect based on role
      if (selectedRole === 'admin') {
        navigate('/admin/setup', { replace: true });
      } else if (selectedRole === 'manager') {
        navigate('/manager', { replace: true });
      } else {
        navigate('/feed', { replace: true });
      }
    } catch (error) {
      console.error('Failed to save role:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar tu rol. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">¿Cuál es tu rol?</CardTitle>
            <CardDescription className="text-base">
              Selecciona el rol que mejor describe tu función en el edificio o condominio.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <RadioGroup
              value={selectedRole || ""}
              onValueChange={(value) => setSelectedRole(value as UserRole)}
              className="space-y-4"
            >
              {ROLE_OPTIONS.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={option.value}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRole === option.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                  <div className={`p-3 rounded-lg shrink-0 ${
                    selectedRole === option.value 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  }`}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <span className="text-lg font-medium block">{option.label}</span>
                    <span className="text-sm text-muted-foreground mt-1 block">
                      {option.description}
                    </span>
                  </div>
                </Label>
              ))}
            </RadioGroup>

            <div className="flex justify-end mt-8">
              <Button 
                onClick={handleContinue} 
                disabled={!selectedRole || saving}
                className="gap-2"
                size="lg"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
