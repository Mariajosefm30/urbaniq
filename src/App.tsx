import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { BuildingProvider } from "./contexts/BuildingContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Tickets from "./pages/Tickets";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Guests from "./pages/Guests";
import Messages from "./pages/Messages";
import VerifyStatic from "./pages/VerifyStatic";
import Validate from "./pages/Validate";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ManagerHome from "./pages/ManagerHome";
import Admin from "./pages/Admin";
import AdminSetup from "./pages/AdminSetup";
import Manager from "./pages/Manager";
import Units from "./pages/Units";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BuildingProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/verify-static" element={<VerifyStatic />} />
              <Route path="/validate" element={<ProtectedRoute><Validate /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/admin/setup" element={<ProtectedRoute><AdminSetup /></ProtectedRoute>} />
            <Route path="/manager" element={<ProtectedRoute><Manager /></ProtectedRoute>} />
            <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
              <Route path="/buildings/:buildingId/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
              <Route path="/buildings/:buildingId/units" element={<ProtectedRoute><Units /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/guests" element={<ProtectedRoute><Guests /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BuildingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
