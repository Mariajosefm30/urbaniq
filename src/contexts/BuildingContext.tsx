import React, { createContext, useContext, useState, useEffect } from 'react';

interface BuildingContextType {
  currentBuildingId: string | null;
  setCurrentBuildingId: (id: string | null) => void;
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

  return (
    <BuildingContext.Provider value={{ currentBuildingId, setCurrentBuildingId }}>
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
