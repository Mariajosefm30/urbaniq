import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { useBuilding } from "@/contexts/BuildingContext";
import Layout from "@/components/Layout";
import AdminAmenities from "@/pages/AdminAmenities";

export default function BuildingAmenities() {
  const { profile } = useAuth();
  const { session, loading: sessionLoading } = useSession();
  const { buildingId } = useParams();
  const { currentBuildingId, setCurrentBuildingId } = useBuilding();
  const navigate = useNavigate();

  // Access guard: manager, admin, and residents can access
  useEffect(() => {
    if (sessionLoading) return;
    
    if (!session) {
      navigate('/auth');
      return;
    }
  }, [session, sessionLoading, navigate]);

  // Set building context
  useEffect(() => {
    if (buildingId && buildingId !== currentBuildingId) {
      setCurrentBuildingId(buildingId);
    }
  }, [buildingId, currentBuildingId, setCurrentBuildingId]);

  return (
    <Layout>
      <AdminAmenities />
    </Layout>
  );
}
