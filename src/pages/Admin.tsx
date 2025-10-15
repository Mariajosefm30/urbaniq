import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Settings } from "lucide-react";

export default function Admin() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile?.role !== 'admin') {
      navigate('/');
    }
  }, [loading, profile, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Portal</h1>
        <p className="text-muted-foreground">
          Manage organizations, buildings, and user assignments
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <Building2 className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Organizations & Buildings</CardTitle>
            <CardDescription>
              Create and manage organizations and their properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon: Portfolio management interface
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <Users className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Assign managers to buildings and manage roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon: User and role assignment interface
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <Settings className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>System Settings</CardTitle>
            <CardDescription>
              Configure platform-wide settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon: Global configuration options
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
