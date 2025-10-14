import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BuildingContextType {
  currentBuildingId: string | null;
  setCurrentBuildingId: (id: string | null) => void;
  persistLastBuilding: (buildingId: string, userId: string) => Promise<void>;
}

const BuildingContext = createContext<BuildingContextType | undefined>(undefined);

export function BuildingProvider({ children }: { children: React.ReactNode }) {
  const [currentBuildingId, setCurrentBuildingId] = useState<string | null>(() => {
    return localStorage.getItem('currentBuildingId');
  });

  useEffect(() => {
    if (currentBuildingId) {
      localStorage.setItem('currentBuildingId', currentBuildingId);
    } else {
      localStorage.removeItem('currentBuildingId');
    }
  }, [currentBuildingId]);

  const persistLastBuilding = async (buildingId: string, userId: string) => {
    await supabase
      .from('profiles')
      .update({ last_building_id: buildingId })
      .eq('id', userId);
  };

  return (
    <BuildingContext.Provider value={{ currentBuildingId, setCurrentBuildingId, persistLastBuilding }}>
      {children}
    </BuildingContext.Provider>
  );
}

export function useBuilding() {
  const context = useContext(BuildingContext);
  if (!context) {
    throw new Error('useBuilding must be used within BuildingProvider');
  }
  return context;
}
