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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, Users, Wrench, MapPin, QrCode, Bell, ClipboardList, UserCheck, CheckCircle2, CreditCard, Quote, Sparkles, Layers, Home, Building, Warehouse, Check, X } from "lucide-react";
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
  
  // Check if INVITE_ONLY mode is enabled (you can set this via environment or config)
  const inviteOnly = false; // Set to true to enable invite-only mode

  // Role-based redirects on page load with email overrides
  useEffect(() => {
    if (loading || !user) return;

    // Email override - specific emails always go to their designated routes
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

    // Role-based redirects
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
    
    // Here you would typically send this to your backend
    // For now, we'll just show a success message
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
      {/* Debug Info (only show if authenticated) */}
      {user && (
        <div className="fixed top-20 right-4 z-50 p-3 bg-background border rounded-md shadow-lg text-xs font-mono space-y-1 max-w-xs">
          <div><strong>Email:</strong> {user.email || 'N/A'}</div>
          <div><strong>Role:</strong> {session?.role || 'N/A'}</div>
        </div>
      )}

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

      {/* Hero Section */}
      <section className="container py-20 md:py-28">
        <div className="mx-auto max-w-4xl text-center space-y-8">
          <p className="text-sm font-medium text-primary uppercase tracking-wider">Así se ve el verdadero rendimiento</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl leading-tight">
            Residentes Felices.<br />
            Propietarios Impresionados.<br />
            Equipos Exitosos.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            La administración de propiedades tradicional puede resolver la eficiencia, pero ejecutar tareas más rápido no equivale a valor. PropPass entrega resultados reales con datos unificados, automatización inteligente y operaciones optimizadas.
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

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8" onClick={handleGetStarted}>
              Unirse a la Lista de Espera
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={handleBookDemo}>
              Agendar Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="container py-16 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">¿Para Quién Es?</h2>
          <Tabs defaultValue="managers" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="managers">Para Edificios (Administradores)</TabsTrigger>
              <TabsTrigger value="residents">Para Residentes</TabsTrigger>
            </TabsList>
            <TabsContent value="managers" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Administradores y Equipos de Propiedad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Optimiza las operaciones con gestión centralizada de tickets, sugerencias automáticas de técnicos y actualizaciones en tiempo real. Mantén a los residentes felices y el mantenimiento funcionando sin problemas.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Rastrea todas las solicitudes de mantenimiento en un solo panel</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Sugerencias de técnicos con IA basadas en ubicación y calificaciones</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Genera pases de invitado seguros al instante</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="residents" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Residentes e Inquilinos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Reporta problemas rápidamente, rastrea el progreso en tiempo real y gestiona el acceso de invitados con facilidad. Mantente informado en cada paso con notificaciones automáticas.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Envía tickets de mantenimiento en segundos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Recibe actualizaciones en tiempo real por correo y notificaciones en la app</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Crea pases QR para invitados válidos por 24 horas</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="container py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Funcionalidades Principales</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardHeader>
                <Wrench className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Seguimiento de Mantenimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Crea, asigna y monitorea tickets de mantenimiento de principio a fin. Nunca pierdas de vista los problemas del edificio.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MapPin className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Sugerencias Inteligentes de Técnicos</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Obtén recomendaciones con IA de técnicos cercanos basadas en calificaciones de Google Maps y proximidad a tu edificio.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <QrCode className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Pases QR para Invitados</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Genera códigos QR seguros con tiempo limitado para invitados. Todos los pases expiran automáticamente después de 24 horas.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CreditCard className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Pagos</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Gestiona alquiler, servicios y cuotas de mantenimiento en un solo lugar. Rastrea el historial de pagos y sube recibos fácilmente.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Bell className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Actualizaciones en Tiempo Real</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Mantente informado con notificaciones instantáneas por correo y alertas en la app cuando cambie el estado de los tickets.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container py-16 bg-muted/30">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Cómo Funciona</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <ClipboardList className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">1. Reportar</h3>
              <p className="text-muted-foreground">
                Los residentes envían tickets de mantenimiento con detalles, fotos y nivel de prioridad.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <UserCheck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">2. Asignar</h3>
              <p className="text-muted-foreground">
                Los administradores revisan tickets y asignan al personal interno o técnicos recomendados.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">3. Resolver</h3>
              <p className="text-muted-foreground">
                Rastrea el progreso, actualiza el estado y cierra tickets cuando el trabajo esté completo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">Resultados Reales para Propiedades Reales</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Mira cómo los administradores de propiedades están transformando sus operaciones con PropPass
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="relative">
              <CardContent className="pt-8">
                <Quote className="h-8 w-8 text-primary/20 absolute top-4 left-4" />
                <p className="text-muted-foreground italic mb-6">
                  "Desde que adoptamos PropPass, hemos optimizado el mantenimiento en todas nuestras unidades. Nuestros residentes aman la transparencia y los tiempos de respuesta rápidos."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">María Rodríguez</p>
                    <p className="text-xs text-muted-foreground">Administradora de Propiedad • 200+ unidades</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative">
              <CardContent className="pt-8">
                <Quote className="h-8 w-8 text-primary/20 absolute top-4 left-4" />
                <p className="text-muted-foreground italic mb-6">
                  "Los pases QR para invitados han sido revolucionarios para la seguridad. No más registros manuales ni credenciales perdidas."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Carlos García</p>
                    <p className="text-xs text-muted-foreground">Superintendente de Edificio • 85 unidades</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative">
              <CardContent className="pt-8">
                <Quote className="h-8 w-8 text-primary/20 absolute top-4 left-4" />
                <p className="text-muted-foreground italic mb-6">
                  "Tener pagos, mantenimiento y comunicaciones en un solo lugar ha reducido nuestro tiempo administrativo a la mitad. Podemos enfocarnos en lo que importa."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Ana López</p>
                    <p className="text-xs text-muted-foreground">Directora de Operaciones • 500+ unidades</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* All in One Section */}
      <section className="container py-16 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Layers className="h-4 w-4" />
                Plataforma Unificada
              </div>
              <h2 className="text-3xl font-bold">Todo en un Solo Lugar</h2>
              <p className="text-muted-foreground">
                ¿Estás manejando múltiples sistemas con tus datos por todas partes? Obtén una experiencia unificada que conecta todas las operaciones de administración de propiedades en tu portafolio. Trabaja desde cualquier lugar, en cualquier dispositivo.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Un solo panel para todos los edificios y unidades</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Comunicación centralizada con residentes</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Visibilidad completa para todo tu equipo</span>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 text-center">
                <Wrench className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Mantenimiento</p>
              </Card>
              <Card className="p-4 text-center">
                <CreditCard className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Pagos</p>
              </Card>
              <Card className="p-4 text-center">
                <QrCode className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Acceso de Invitados</p>
              </Card>
              <Card className="p-4 text-center">
                <Bell className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Notificaciones</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Property Types Section */}
      <section className="container py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-4">Diseñado para Todo Tipo de Propiedad</h2>
          <p className="text-center text-muted-foreground mb-12">
            Desde pequeños edificios de apartamentos hasta grandes comunidades residenciales
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center space-y-3 p-6 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer">
              <Building2 className="h-10 w-10 text-primary mx-auto" />
              <p className="font-medium">Multifamiliar</p>
            </div>
            <div className="text-center space-y-3 p-6 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer">
              <Home className="h-10 w-10 text-primary mx-auto" />
              <p className="font-medium">Unifamiliar</p>
            </div>
            <div className="text-center space-y-3 p-6 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer">
              <Building className="h-10 w-10 text-primary mx-auto" />
              <p className="font-medium">Vivienda Estudiantil</p>
            </div>
            <div className="text-center space-y-3 p-6 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer">
              <Warehouse className="h-10 w-10 text-primary mx-auto" />
              <p className="font-medium">Comercial</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mini Gallery Section */}
      <section className="container py-16 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Míralo en Acción</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="aspect-video rounded-lg border bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Vista de Lista de Tickets</p>
              </div>
              <p className="text-center text-sm font-medium">Panel de Todos los Tickets</p>
            </div>
            <div className="space-y-3">
              <div className="aspect-video rounded-lg border bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Vista de Detalle de Ticket</p>
              </div>
              <p className="text-center text-sm font-medium">Gestión Detallada de Tickets</p>
            </div>
            <div className="space-y-3">
              <div className="aspect-video rounded-lg border bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Verificación de Pase de Invitado</p>
              </div>
              <p className="text-center text-sm font-medium">Verificación de Código QR</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container py-16">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Planes y Precios</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              El precio escala con tu edificio — más unidades, más administradores, análisis más profundos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Plan Starter */}
            <Card className="relative flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">Starter</CardTitle>
                <CardDescription>Hasta 12 unidades</CardDescription>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Desde</p>
                  <p className="text-3xl font-bold">$20 <span className="text-base font-normal text-muted-foreground">USD/edificio/mes</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Incluye 1 administrador</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Feed en vivo y comunicación</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Solicitudes de mantenimiento básicas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Registro manual de invitados y entregas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Seguimiento de pagos (opcional)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">1 administrador</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Análisis básicos</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button className="w-full" variant="outline" onClick={handleGetStarted}>
                  Unirse a Lista de Espera
                </Button>
              </div>
            </Card>

            {/* Plan Growth */}
            <Card className="relative flex flex-col border-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Growth</CardTitle>
                <CardDescription>13–50 unidades</CardDescription>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Desde</p>
                  <p className="text-3xl font-bold">$2.00 <span className="text-base font-normal text-muted-foreground">USD/unidad/mes</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Mín. $30/mes • Hasta 3 admins</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Todo lo de Starter</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Asignación y estado de mantenimiento</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Registros de invitados y entregas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Pagos en línea con recordatorios</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Hasta 3 administradores</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Análisis en tiempo real (pagos, mantenimiento, actividad)</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button className="w-full" onClick={handleGetStarted}>
                  Unirse a Lista de Espera
                </Button>
              </div>
            </Card>

            {/* Plan Pro */}
            <Card className="relative flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">Pro</CardTitle>
                <CardDescription>51–150 unidades</CardDescription>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Desde</p>
                  <p className="text-3xl font-bold">$1.25 <span className="text-base font-normal text-muted-foreground">USD/unidad/mes</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Mín. $75/mes • Hasta 10 admins</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Todo lo de Growth</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Flujos de mantenimiento avanzados</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Reglas de invitados y entregas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Conciliación automática de pagos</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Hasta 10 administradores con permisos por rol</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Análisis avanzados (flujo de caja, rendimiento)</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button className="w-full" variant="outline" onClick={handleGetStarted}>
                  Unirse a Lista de Espera
                </Button>
              </div>
            </Card>

            {/* Plan Enterprise */}
            <Card className="relative flex flex-col bg-muted/50">
              <CardHeader>
                <CardTitle className="text-xl">Enterprise / Desarrollador</CardTitle>
                <CardDescription>150+ unidades o portafolios</CardDescription>
                <div className="mt-4">
                  <p className="text-3xl font-bold">Personalizado</p>
                  <p className="text-xs text-muted-foreground mt-1">Contacta para cotización</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Todo lo de Pro</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Administradores ilimitados y roles personalizados</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Marca blanca (white-label)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Análisis a nivel de portafolio</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Onboarding y flujos personalizados</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button className="w-full" variant="outline" onClick={handleBookDemo}>
                  Contactar Ventas
                </Button>
              </div>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Los planes escalan según el número de unidades, administradores y profundidad de análisis.<br />
            <span className="text-primary">Administradores adicionales: $5 USD por admin/mes</span>
          </p>
        </div>
      </section>

      <section className="container py-16 bg-muted/30">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Preguntas Frecuentes</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>¿Cómo ayuda PropPass a gestionar el mantenimiento?</AccordionTrigger>
              <AccordionContent>
                PropPass centraliza todas las solicitudes de mantenimiento en un solo panel. Los residentes pueden enviar tickets con fotos y descripciones, los administradores pueden priorizar y asignar trabajo, y todos reciben actualizaciones en tiempo real sobre el progreso. Nuestra IA también sugiere técnicos calificados basándose en ubicación y calificaciones.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>¿Qué son los pases QR para invitados?</AccordionTrigger>
              <AccordionContent>
                Los pases de invitados son códigos QR seguros y escaneables que los residentes pueden generar para visitantes. Cada pase incluye detalles del visitante y expira automáticamente después de 24 horas, proporcionando control de acceso conveniente sin comprometer la seguridad.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>¿Cómo funciona la búsqueda de técnicos?</AccordionTrigger>
              <AccordionContent>
                Cuando creas un ticket de mantenimiento, nuestro sistema usa la categoría del ticket y la dirección de tu edificio para buscar técnicos calificados cercanos en Google Maps. Mostramos calificaciones, información de contacto y ubicaciones para que los administradores puedan tomar decisiones informadas rápidamente.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>¿Pueden los residentes rastrear sus solicitudes de mantenimiento?</AccordionTrigger>
              <AccordionContent>
                ¡Sí! Los residentes pueden ver todos sus tickets enviados, ver el estado actual (abierto, en progreso, resuelto), agregar comentarios y recibir notificaciones por correo cuando haya una actualización. Transparencia completa durante todo el proceso.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>¿Es PropPass adecuado para edificios pequeños?</AccordionTrigger>
              <AccordionContent>
                Absolutamente. PropPass se adapta a edificios de cualquier tamaño. Ya sea que administres un pequeño complejo de apartamentos o una gran torre residencial, la plataforma se adapta a tus necesidades. Incluso las propiedades pequeñas se benefician del seguimiento organizado de tickets y el acceso seguro de invitados.
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
                Administración de propiedades moderna para la era digital.
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
                <li>
                  <a href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                    Portal de Administrador
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
