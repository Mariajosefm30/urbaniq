import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function RoleHome() {
  const navigate = useNavigate();
  const { memberships, isPlatformAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (isPlatformAdmin) {
      navigate("/platform", { replace: true });
      return;
    }
    const board = memberships.find((m) => m.role === "admin_board" || m.role === "manager");
    if (board?.building_id) {
      navigate(`/board/${board.building_id}`, { replace: true });
      return;
    }
    const sec = memberships.find((m) => m.role === "security");
    if (sec?.building_id) {
      navigate(`/security/${sec.building_id}`, { replace: true });
      return;
    }
    const resident = memberships.find((m) => m.role === "resident");
    if (resident?.building_id) {
      navigate(`/app/${resident.building_id}`, { replace: true });
      return;
    }
    navigate("/no-access", { replace: true });
  }, [memberships, isPlatformAdmin, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
