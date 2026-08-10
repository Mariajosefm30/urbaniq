import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, HelpCircle, X, ChevronDown } from "lucide-react";

interface Step {
  id: string;
  title: string;
  description: string;
}

const BASE_STEPS: Step[] = [
  { id: "welcome", title: "Bienvenido a UrbanIQ", description: "Eres manager de este edificio. Solo verás las áreas que la administración te asignó." },
];

const AREA_STEPS: Record<string, Step> = {
  maintenance: {
    id: "maintenance",
    title: "Atiende mantenimiento",
    description: "Abre la pestaña Tickets, cambia el estado (abierto → en progreso → resuelto) y deja comentarios para que el residente vea el avance.",
  },
  guests: {
    id: "guests",
    title: "Controla visitas",
    description: "En la pestaña Visitas revisa las visitas esperadas, marca ingreso y salida, y usa los filtros por unidad, estado y fecha.",
  },
  payments: {
    id: "payments",
    title: "Revisa pagos",
    description: "En Pagos valida los comprobantes subidos por propietarios y envía recordatorios de cargos pendientes.",
  },
  feed: {
    id: "feed",
    title: "Comunica novedades",
    description: "En Live Feed publica anuncios, fíjalos si son importantes y responde comentarios de los residentes.",
  },
};

const LAST_STEP: Step = {
  id: "notifications",
  title: "Activa tus alertas",
  description: "La campana arriba a la derecha te avisa de tickets nuevos, visitas y comprobantes por revisar.",
};

export function ManagerGuide({ areas, storageKey }: { areas: string[]; storageKey: string }) {
  const steps = useMemo(() => {
    const areaSteps = ["maintenance", "guests", "payments", "feed"]
      .filter((a) => areas.includes(a))
      .map((a) => AREA_STEPS[a]);
    return [...BASE_STEPS, ...areaSteps, LAST_STEP];
  }, [areas]);

  const doneKey = `${storageKey}:done`;
  const dismissKey = `${storageKey}:dismissed`;

  const [done, setDone] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(doneKey) ?? "[]"));
      setDismissed(localStorage.getItem(dismissKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [doneKey, dismissKey]);

  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
    setDone(next);
    localStorage.setItem(doneKey, JSON.stringify(next));
  };

  const close = () => {
    setDismissed(true);
    localStorage.setItem(dismissKey, "1");
  };

  const reopen = () => {
    setDismissed(false);
    setCollapsed(false);
    localStorage.removeItem(dismissKey);
  };

  const completed = steps.filter((s) => done.includes(s.id)).length;
  const pct = Math.round((completed / steps.length) * 100);

  if (dismissed) {
    return (
      <Button
        onClick={reopen}
        size="icon"
        className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full shadow-lg"
        aria-label="Abrir guía de inicio"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-5 right-5 z-50 w-[22rem] max-w-[calc(100vw-2.5rem)] shadow-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm">Guía de inicio</CardTitle>
          <p className="text-xs text-muted-foreground">{completed} de {steps.length} pasos</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary">{pct}%</Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed((c) => !c)} aria-label="Minimizar guía">
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close} aria-label="Cerrar guía">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-3">
          <Progress value={pct} className="h-1.5" />
          <ol className="space-y-2">
            {steps.map((s, i) => {
              const isDone = done.includes(s.id);
              return (
                <li key={s.id}>
                  <button
                    onClick={() => toggle(s.id)}
                    className="flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted"
                  >
                    {isDone ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="space-y-0.5">
                      <span className={`block text-xs font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
                        {i + 1}. {s.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">{s.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {completed === steps.length && (
            <Button size="sm" className="w-full" onClick={close}>
              Listo, ocultar guía
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
