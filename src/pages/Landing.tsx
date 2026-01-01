import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, Users, Wrench, Bell, CheckCircle2, CreditCard, MessageSquare, Package, BarChart3, UserCog, Home, Building, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { session, loading } = useSession();
  const [inviteCode, setInviteCode] = useState("");
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const [demoFormData, setDemoFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  const inviteOnly = false;

  useEffect(() => {
    if (loading || !user) return;

    if (user.email === "mfernandezmelgar@gmail.com") {
      navigate("/admin");
      return;
    }
    if (user.email === "manager@test.com") {
      navigate("/manager");
      return;
    }
    if (user.email === "mariajof@tepper.cmu.edu") {
      navigate("/feed");
      return;
    }

    if (session?.role === "admin") {
      navigate("/admin");
    } else if (session?.role === "manager") {
      navigate("/manager");
    } else if (session?.role === "resident") {
      navigate("/feed");
    }
  }, [user, session, loading, navigate]);

  const handleGetStarted = () => {
    if (inviteOnly && inviteCode) {
      navigate(`/auth?code=${inviteCode}`);
    } else {
      navigate("/auth");
    }
  };

  const handleBookDemo = () => {
    setDemoDialogOpen(true);
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    setTimeout(() => {
      toast({
        title: "¡Solicitud de Demo Recibida!",
        description: "Te contactaremos pronto para agendar tu demo.",
      });
      setDemoDialogOpen(false);
      setDemoFormData({ name: "", email: "", company: "", message: "" });
      setSubmitting(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Contact Dialog */}
      <Dialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agenda una Demo</DialogTitle>
            <DialogDescription>
              Completa el formulario y te contactaremos para agendar una demo personalizada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDemoSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demo-name">Nombre *</Label>
              <Input
                id="demo-name"
                value={demoFormData.name}
                onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                placeholder="Tu nombre completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-email">Correo electrónico *</Label>
              <Input
                id="demo-email"
                type="email"
                value={demoFormData.email}
                onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                placeholder="tu.correo@empresa.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-company">Empresa/Nombre del Edificio</Label>
              <Input
                id="demo-company"
                value={demoFormData.company}
                onChange={(e) => setDemoFormData({ ...demoFormData, company: e.target.value })}
                placeholder="Tu propiedad o empresa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-message">Mensaje</Label>
              <Textarea
                id="demo-message"
                value={demoFormData.message}
                onChange={(e) => setDemoFormData({ ...demoFormData, message: e.target.value })}
                placeholder="Cuéntanos sobre tus necesidades..."
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Enviando..." : "Solicitar Demo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">PropPass</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/auth?mode=signin")} variant="outline">
              Iniciar Sesión
            </Button>
            <Button onClick={() => navigate("/auth?mode=signup")}>
              Registrarse
            </Button>
          </div>
        </div>
      </header>

      {/* BLOQUE 1 — HERO */}
      <section className="container py-20 md:py-28">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl leading-tight">
            Todo tu edificio, en un solo lugar.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comunicación, pagos, mantenimiento y control del edificio<br />
            sin WhatsApp, sin Excel y sin desorden.
          </p>
          <p className="text-sm text-muted-foreground">
            Diseñado para edificios y condominios en Perú, desde 10 hasta más de 100 departamentos.
          </p>
          
          {inviteOnly && (
            <div className="max-w-md mx-auto space-y-3">
              <p className="text-sm text-muted-foreground">¿Tienes un código de invitación?</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Ingresa el código de invitación"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="text-lg px-8" onClick={handleGetStarted}>
              Empieza ahora
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
              Ver planes
            </Button>
          </div>
        </div>
      </section>

      {/* BLOQUE 2 — PROBLEMA */}
      <section className="container py-16 bg-muted/30">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">¿Te suena familiar?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm">Avisos importantes perdidos en WhatsApp</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm">Pagos y deudas llevados en Excel</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm">Reclamos sin seguimiento</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm">Nadie sabe qué se pagó, qué falta o qué sigue</p>
            </div>
          </div>
          <p className="text-center text-muted-foreground mt-8">
            Administrar un edificio así consume tiempo y genera conflictos.
          </p>
        </div>
      </section>

      {/* BLOQUE 3 — SOLUCIÓN */}
      <section className="container py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            PropPass centraliza todo lo que tu edificio necesita.
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <Bell className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Comunicación clara</p>
                <p className="text-sm text-muted-foreground">Avisos y mensajes en un solo feed</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <CreditCard className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Pagos ordenados</p>
                <p className="text-sm text-muted-foreground">Cobros, recordatorios y seguimiento</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <Wrench className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Mantenimiento organizado</p>
                <p className="text-sm text-muted-foreground">Solicitudes con estado y responsables</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <Package className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Visitas y entregas</p>
                <p className="text-sm text-muted-foreground">Registro simple y controlado</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <UserCog className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Roles claros</p>
                <p className="text-sm text-muted-foreground">Cada persona ve solo lo que le corresponde</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <BarChart3 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Datos en tiempo real</p>
                <p className="text-sm text-muted-foreground">Todo visible, todo claro</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOQUE 4 — PARA QUIÉN ES */}
      <section className="container py-16 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">¿Para quién es PropPass?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardHeader className="pb-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Condominios pequeños</CardTitle>
                <CardDescription>10–12 departamentos</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Para edificios autogestionados que quieren orden sin complicarse.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader className="pb-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Juntas de propietarios</CardTitle>
                <CardDescription>13–50 departamentos</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Para edificios con administrador que quieren verse más profesionales.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader className="pb-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Edificios grandes</CardTitle>
                <CardDescription>50+ departamentos</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Para quienes necesitan control, reportes y eficiencia a escala.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader className="pb-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Desarrolladores</CardTitle>
                <CardDescription>Proyectos inmobiliarios</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Entrega una experiencia moderna desde el primer día.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* BLOQUE 5 — FUNCIONALIDADES CLAVE */}
      <section className="container py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Funciones que realmente se usan en un edificio</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Bell className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Live Feed del edificio</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Avisos, comunicados y mensajes visibles para todos.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CreditCard className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Pagos y cobranza</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Registro de pagos, recordatorios y estado por departamento.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Wrench className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Solicitudes de mantenimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Reclamos con seguimiento y responsables asignados.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Package className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Gestión de visitas y entregas</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Control simple y ordenado, sin papeles.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <UserCog className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Roles y permisos</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Admins, junta, residentes, mantenimiento — cada uno con su acceso.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Analítica en tiempo real</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Pagos, morosidad, reclamos y actividad del edificio en un solo panel.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* BLOQUE 6 — PLANES Y PRECIOS */}
      <section id="pricing" className="container py-16 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Planes simples según el tamaño de tu edificio</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Plan Starter */}
            <Card className="relative flex flex-col border-2">
              <CardHeader className="text-center pb-2">
                <div className="inline-block px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium mb-2">
                  Starter
                </div>
                <CardTitle className="text-xl">Para edificios pequeños</CardTitle>
                <div className="mt-4">
                  <p className="text-3xl font-bold">$20 <span className="text-base font-normal text-muted-foreground">USD</span></p>
                  <p className="text-sm text-muted-foreground">/ edificio / mes</p>
                  <p className="text-xs text-muted-foreground mt-2">Hasta 12 departamentos</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 pt-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Live feed</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Mantenimiento básico</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Registro de visitas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Pagos (seguimiento)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">1 admin</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Analítica básica</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button className="w-full" onClick={handleGetStarted}>
                  Empezar con Starter
                </Button>
              </div>
            </Card>

            {/* Plan Growth */}
            <Card className="relative flex flex-col border-2 border-primary shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
              <CardHeader className="text-center pb-2">
                <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium mb-2">
                  Growth
                </div>
                <CardTitle className="text-xl">Para juntas y HOAs</CardTitle>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Desde</p>
                  <p className="text-3xl font-bold">$2 <span className="text-base font-normal text-muted-foreground">USD</span></p>
                  <p className="text-sm text-muted-foreground">/ departamento / mes</p>
                  <p className="text-xs text-muted-foreground mt-2">Mínimo $30/mes</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 pt-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Todo lo anterior</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Pagos con recordatorios</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Mantenimiento con estados</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Registro completo de visitas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Hasta 3 admins</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Analítica en tiempo real</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button className="w-full" onClick={handleGetStarted}>
                  Elegir Growth
                </Button>
              </div>
            </Card>

            {/* Plan Pro */}
            <Card className="relative flex flex-col border-2">
              <CardHeader className="text-center pb-2">
                <div className="inline-block px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 text-xs font-medium mb-2">
                  Pro
                </div>
                <CardTitle className="text-xl">Para edificios administrados</CardTitle>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Desde</p>
                  <p className="text-3xl font-bold">$1.25 <span className="text-base font-normal text-muted-foreground">USD</span></p>
                  <p className="text-sm text-muted-foreground">/ departamento / mes</p>
                  <p className="text-xs text-muted-foreground mt-2">Mínimo $75/mes</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 pt-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Todo lo anterior</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Flujos avanzados de mantenimiento</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Roles por área</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Conciliación de pagos</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Hasta 10 admins</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Analítica avanzada</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button className="w-full" variant="outline" onClick={handleBookDemo}>
                  Hablar con ventas
                </Button>
              </div>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            El precio escala según número de departamentos, admins y nivel de analítica.
          </p>
        </div>
      </section>

      {/* BLOQUE 7 — CTA FINAL */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center space-y-6">
          <h2 className="text-3xl font-bold">
            Empieza a administrar tu edificio de forma simple y ordenada.
          </h2>
          <p className="text-muted-foreground">
            Sin contratos largos. Sin complicaciones.
          </p>
          <Button size="lg" className="text-lg px-8" onClick={handleGetStarted}>
            Probar PropPass
          </Button>
        </div>
      </section>

      {/* BLOQUE 8 — FAQ */}
      <section className="container py-16 bg-muted/30">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Preguntas Frecuentes</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>¿Necesito que todos los vecinos usen la app?</AccordionTrigger>
              <AccordionContent>
                No. Cada edificio decide cómo usarla. Puedes empezar solo con el equipo de administración y gradualmente invitar a los residentes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>¿Se puede usar solo para pagos o avisos?</AccordionTrigger>
              <AccordionContent>
                Sí. Puedes empezar con lo básico y crecer luego. PropPass es modular y se adapta a las necesidades de tu edificio.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>¿Está pensado para Perú?</AccordionTrigger>
              <AccordionContent>
                Sí. PropPass está diseñado con flujos, lenguaje y casos reales de edificios peruanos. Entendemos cómo funcionan los condominios en Lima y otras ciudades del país.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>¿Cómo funciona el registro de visitas?</AccordionTrigger>
              <AccordionContent>
                Los residentes pueden generar códigos QR para sus invitados. El personal de seguridad escanea el código y la visita queda registrada automáticamente, sin papeles ni registros manuales.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>¿Puedo probar antes de pagar?</AccordionTrigger>
              <AccordionContent>
                Sí. Ofrecemos una demostración personalizada para que veas cómo funciona PropPass con las necesidades específicas de tu edificio. Contáctanos para agendar.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-bold">PropPass</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Administración de edificios moderna para Perú.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    Términos de Servicio
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Política de Privacidad
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Contacto</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:contact@proppass.com" className="text-muted-foreground hover:text-foreground transition-colors">
                    contact@proppass.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} PropPass. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
