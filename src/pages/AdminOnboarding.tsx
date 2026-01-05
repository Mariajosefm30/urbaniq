import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, Home, Wrench, CreditCard, MessageSquare, Layers, ArrowRight, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OrgType = "small_condo" | "hoa" | "large_admin" | "developer";
type Intent = "maintenance" | "payments" | "communication" | "all";
type CurrentTool = "whatsapp_excel" | "other_software" | "manual";

interface OnboardingData {
  org_type: OrgType | null;
  primary_intent: Intent[];
  unit_count: number | null;
  current_tool: CurrentTool | null;
}

const ORG_TYPE_OPTIONS: { value: OrgType; label: string; icon: React.ReactNode }[] = [
  { value: "small_condo", label: "Condominio pequeño (hasta 12 departamentos)", icon: <Home className="h-5 w-5" /> },
  { value: "hoa", label: "Junta / HOA (13–50 departamentos)", icon: <Building2 className="h-5 w-5" /> },
  { value: "large_admin", label: "Administrador de edificios (50+)", icon: <Layers className="h-5 w-5" /> },
  { value: "developer", label: "Desarrollador inmobiliario", icon: <Sparkles className="h-5 w-5" /> },
];

const INTENT_OPTIONS: { value: Intent; label: string; icon: React.ReactNode }[] = [
  { value: "maintenance", label: "Mantenimiento y solicitudes", icon: <Wrench className="h-5 w-5" /> },
  { value: "payments", label: "Pagos y cobranza", icon: <CreditCard className="h-5 w-5" /> },
  { value: "communication", label: "Comunicación con residentes", icon: <MessageSquare className="h-5 w-5" /> },
  { value: "all", label: "Orden general (todo en un solo lugar)", icon: <Layers className="h-5 w-5" /> },
];

const CURRENT_TOOL_OPTIONS: { value: CurrentTool; label: string }[] = [
  { value: "whatsapp_excel", label: "WhatsApp / Excel" },
  { value: "other_software", label: "Otro software" },
  { value: "manual", label: "Nada (todo manual)" },
];

export default function AdminOnboarding() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading, refreshSession } = useSession();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    org_type: null,
    primary_intent: [],
    unit_count: null,
    current_tool: null,
  });

  // Load saved progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("onboarding_progress");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed.data || data);
        setStep(parsed.step || 1);
      } catch (e) {
        console.error("Failed to parse onboarding progress:", e);
      }
    }
  }, []);

  // Save progress to localStorage on changes
  useEffect(() => {
    localStorage.setItem("onboarding_progress", JSON.stringify({ step, data }));
  }, [step, data]);

  // Redirect non-admins
  useEffect(() => {
    if (!sessionLoading && session) {
      if (session.role !== "admin") {
        if (session.role === "manager") {
          navigate("/manager", { replace: true });
        } else {
          navigate("/feed", { replace: true });
        }
      }
    }
  }, [session, sessionLoading, navigate]);

  const saveOnboardingData = async (completed: boolean = false) => {
    if (!session?.org_id) return false;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          org_type: data.org_type,
          primary_intent: data.primary_intent,
          unit_count: data.unit_count,
          current_tool: data.current_tool,
          org_onboarding_completed: completed,
        })
        .eq("id", session.org_id);

      if (error) throw error;
      
      if (completed) {
        localStorage.removeItem("onboarding_progress");
        await refreshSession();
      }
      
      return true;
    } catch (error) {
      console.error("Failed to save onboarding data:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración. Intenta de nuevo.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    await saveOnboardingData(true);
    navigate("/admin", { replace: true });
  };

  const handleContinue = async () => {
    if (step < 4) {
      await saveOnboardingData(false);
      setStep(step + 1);
    }
  };

  const handlePrimaryAction = async () => {
    const success = await saveOnboardingData(true);
    if (!success) return;

    // Determine target based on primary_intent
    const intents = data.primary_intent;
    
    if (intents.includes("maintenance")) {
      navigate("/admin", { replace: true });
    } else if (intents.includes("payments") && !intents.includes("all") && !intents.includes("communication")) {
      navigate("/admin", { replace: true });
    } else {
      navigate("/admin", { replace: true });
    }
  };

  const handleExplore = async () => {
    await saveOnboardingData(true);
    navigate("/admin", { replace: true });
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || session.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Organization Type */}
        {step === 1 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Configuremos tu organización</CardTitle>
              <CardDescription className="text-base">
                Esta configuración se hace una sola vez.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <RadioGroup
                value={data.org_type || ""}
                onValueChange={(value) => setData({ ...data, org_type: value as OrgType })}
                className="space-y-3"
              >
                {ORG_TYPE_OPTIONS.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={option.value}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      data.org_type === option.value
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                    <div className={`p-2 rounded-lg ${data.org_type === option.value ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {option.icon}
                    </div>
                    <span className="text-base">{option.label}</span>
                  </Label>
                ))}
              </RadioGroup>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={handleSkip} disabled={saving}>
                  Omitir
                </Button>
                <Button 
                  onClick={handleContinue} 
                  disabled={!data.org_type || saving}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Main Priority */}
        {step === 2 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">¿Qué necesitas organizar primero?</CardTitle>
              <CardDescription className="text-base">
                Puedes seleccionar más de una opción.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {INTENT_OPTIONS.map((option) => {
                  const isChecked = data.primary_intent.includes(option.value);
                  return (
                    <Label
                      key={option.value}
                      htmlFor={`intent-${option.value}`}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isChecked
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        id={`intent-${option.value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setData({ ...data, primary_intent: [...data.primary_intent, option.value] });
                          } else {
                            setData({ ...data, primary_intent: data.primary_intent.filter((i) => i !== option.value) });
                          }
                        }}
                      />
                      <div className={`p-2 rounded-lg ${isChecked ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {option.icon}
                      </div>
                      <span className="text-base">{option.label}</span>
                    </Label>
                  );
                })}
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button 
                  onClick={handleContinue} 
                  disabled={data.primary_intent.length === 0 || saving}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Context */}
        {step === 3 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Un poco más de contexto</CardTitle>
              <CardDescription className="text-base">
                Esta información nos ayuda a personalizar tu experiencia.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="unit_count">Número de departamentos</Label>
                <Input
                  id="unit_count"
                  type="number"
                  placeholder="Ej: 24"
                  value={data.unit_count || ""}
                  onChange={(e) => setData({ ...data, unit_count: e.target.value ? parseInt(e.target.value) : null })}
                  className="text-lg"
                />
              </div>

              <div className="space-y-3">
                <Label>¿Cómo gestionan hoy?</Label>
                <RadioGroup
                  value={data.current_tool || ""}
                  onValueChange={(value) => setData({ ...data, current_tool: value as CurrentTool })}
                  className="space-y-2"
                >
                  {CURRENT_TOOL_OPTIONS.map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`tool-${option.value}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        data.current_tool === option.value
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value={option.value} id={`tool-${option.value}`} />
                      <span>{option.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Atrás
                </Button>
                <Button onClick={handleContinue} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Recommended Action */}
        {step === 4 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              {data.primary_intent.includes("maintenance") ? (
                <>
                  <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
                    <Wrench className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Empecemos por mantenimiento</CardTitle>
                  <CardDescription className="text-base">
                    Centraliza solicitudes y deja atrás los mensajes dispersos.
                  </CardDescription>
                </>
              ) : data.primary_intent.includes("payments") && 
                  !data.primary_intent.includes("all") && 
                  !data.primary_intent.includes("communication") ? (
                <>
                  <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
                    <CreditCard className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Configuremos los pagos</CardTitle>
                  <CardDescription className="text-base">
                    Define el monto mensual y visualiza quién paga y quién no.
                  </CardDescription>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Configuremos tu primer edificio</CardTitle>
                  <CardDescription className="text-base">
                    Te tomará menos de 5 minutos.
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3">
                <Button 
                  size="lg" 
                  onClick={handlePrimaryAction} 
                  disabled={saving}
                  className="w-full gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {data.primary_intent.includes("maintenance") ? (
                    <>
                      <Wrench className="h-5 w-5" />
                      Crear primer ticket de mantenimiento
                    </>
                  ) : data.primary_intent.includes("payments") && 
                      !data.primary_intent.includes("all") && 
                      !data.primary_intent.includes("communication") ? (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Configurar monto mensual
                    </>
                  ) : (
                    <>
                      <Building2 className="h-5 w-5" />
                      Crear edificio
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleExplore} 
                  disabled={saving}
                  className="w-full"
                >
                  Explorar la plataforma
                </Button>
              </div>

              <Button 
                variant="ghost" 
                onClick={() => setStep(3)} 
                className="mt-4 w-full"
              >
                Atrás
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
