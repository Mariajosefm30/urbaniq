import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 h-14 flex items-center px-4">
            <SidebarTrigger />
          </header>
          
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
