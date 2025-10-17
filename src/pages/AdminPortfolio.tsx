import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import PortfolioTab from "@/components/admin/PortfolioTab";

export default function AdminPortfolio() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile?.role !== 'admin') {
      navigate('/');
    }
  }, [loading, profile, navigate]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Portfolio Analytics</h1>
        <p className="text-muted-foreground">
          Overview of all buildings and performance metrics
        </p>
      </div>

      <PortfolioTab orgId={profile!.org_id} />
    </AdminLayout>
  );
}
