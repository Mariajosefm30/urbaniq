import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { useBuilding } from "@/contexts/BuildingContext";
import Layout from "@/components/Layout";
import Guests from "@/pages/Guests";

export default function BuildingGuests() {
  const { profile } = useAuth();
  const { session, loading: sessionLoading } = useSession();
  const { buildingId } = useParams();
  const { currentBuildingId, setCurrentBuildingId } = useBuilding();
  const navigate = useNavigate();

  // Access guard: manager and admin only
  useEffect(() => {
    if (sessionLoading) return;
    
    if (!session) {
      navigate('/auth');
      return;
    }
    
    if (session.role !== 'admin' && session.role !== 'manager') {
      navigate('/feed');
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
      <Guests />
    </Layout>
  );
}
