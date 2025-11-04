import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const { currentBuildingId } = useBuilding();
  const isManager = profile?.role === 'manager';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 h-14 flex items-center px-4">
            <SidebarTrigger />
          </header>
          
          <main className="flex-1 overflow-auto">
            {isManager && !currentBuildingId && (
              <Alert className="m-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Select a building to continue.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="container mx-auto px-4 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
