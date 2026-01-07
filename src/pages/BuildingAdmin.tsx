import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Home, Users, Dumbbell, DollarSign, Wrench, Rss, Settings, ArrowLeft, BarChart3 } from "lucide-react";

export default function BuildingAdmin() {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { setCurrentBuildingId } = useBuilding();
  
  const [loading, setLoading] = useState(true);
  const [buildingName, setBuildingName] = useState("");
  const [isAdminOrManager, setIsAdminOrManager] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (buildingId) {
      setCurrentBuildingId(buildingId);
      loadBuilding();
      checkAccess();
    }
  }, [buildingId, user]);

  const loadBuilding = async () => {
    if (!buildingId) return;

    const { data, error } = await supabase
      .from('buildings_new')
      .select('name')
      .eq('id', buildingId)
      .single();

    if (error) {
      console.error('Failed to load building:', error);
      navigate('/admin');
      return;
    }

    setBuildingName(data?.name || '');
  };

  const checkAccess = async () => {
    if (!user || !buildingId) {
      setLoading(false);
      return;
    }

    // Check if user is admin for this building
    const { data: adminCheck } = await supabase
      .rpc('is_building_admin', { _building_id: buildingId, _user_id: user.id });

    setIsAdmin(adminCheck === true);

    // Check if user is admin or manager
    const { data: accessCheck } = await supabase
      .rpc('is_building_admin_or_manager', { _building_id: buildingId, _user_id: user.id });

    setIsAdminOrManager(accessCheck === true);
    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdminOrManager) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have admin or manager access to this building.
            </p>
            <Button onClick={() => navigate('/admin')}>
              Go to Admin
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const navigationCards = [
    {
      title: "Dashboard",
      description: "View metrics and analytics",
      icon: BarChart3,
      href: `/buildings/${buildingId}/dashboard`,
      adminOnly: false,
    },
    {
      title: "Units",
      description: "Manage building units",
      icon: Home,
      href: `/buildings/${buildingId}/units`,
      adminOnly: false,
    },
    {
      title: "People & Roles",
      description: "Manage admins, managers, and residents",
      icon: Users,
      href: `/buildings/${buildingId}/people`,
      adminOnly: true,
    },
    {
      title: "Amenities",
      description: "Manage shared amenities and bookings",
      icon: Dumbbell,
      href: `/buildings/${buildingId}/amenities`,
      adminOnly: false,
    },
    {
      title: "Payments",
      description: "View and manage payments",
      icon: DollarSign,
      href: `/buildings/${buildingId}/payments`,
      adminOnly: false,
    },
    {
      title: "Tickets",
      description: "View and manage maintenance tickets",
      icon: Wrench,
      href: `/buildings/${buildingId}/tickets`,
      adminOnly: false,
    },
    {
      title: "Feed",
      description: "Community announcements and posts",
      icon: Rss,
      href: `/buildings/${buildingId}/feed`,
      adminOnly: false,
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Buildings
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">{buildingName}</h1>
          <p className="text-muted-foreground">
            Building management dashboard
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {navigationCards
            .filter(card => !card.adminOnly || isAdmin)
            .map((card) => (
              <Link key={card.href} to={card.href}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <card.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{card.title}</CardTitle>
                        <CardDescription>{card.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
        </div>
      </div>
    </Layout>
  );
}
