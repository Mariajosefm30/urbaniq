import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Activate from "./pages/Activate";
import RoleHome from "./pages/RoleHome";
import PlatformAdmin from "./pages/PlatformAdmin";
import BoardHome from "./pages/BoardHome";
import ResidentHome from "./pages/ResidentHome";
import SecurityHome from "./pages/SecurityHome";
import NoAccess from "./pages/NoAccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/activate" element={<Activate />} />
            <Route path="/no-access" element={<NoAccess />} />

            <Route path="/home" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
            <Route
              path="/platform"
              element={<ProtectedRoute roles={["platform_admin"]}><PlatformAdmin /></ProtectedRoute>}
            />
            <Route
              path="/board/:buildingId"
              element={
                <ProtectedRoute roles={["platform_admin", "admin_board", "manager"]}>
                  <BoardHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/:buildingId"
              element={<ProtectedRoute roles={["resident"]}><ResidentHome /></ProtectedRoute>}
            />
            <Route
              path="/security/:buildingId"
              element={<ProtectedRoute roles={["security"]}><SecurityHome /></ProtectedRoute>}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
