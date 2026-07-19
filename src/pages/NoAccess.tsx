import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NoAccess() {
  const { signOut, user } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sin acceso</CardTitle>
          <CardDescription>
            {user?.email} no tiene una invitación activa. Contacta a la administración de tu edificio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={signOut} className="w-full">Cerrar sesión</Button>
        </CardContent>
      </Card>
    </div>
  );
}
