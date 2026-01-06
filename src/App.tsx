import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SessionProvider } from "./contexts/SessionContext";
import { BuildingProvider } from "./contexts/BuildingContext";
import DebugBar from "./components/DebugBar";
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
import AdminOnboarding from "./pages/AdminOnboarding";
import AdminProfile from "./pages/AdminProfile";
import AdminPortfolio from "./pages/AdminPortfolio";
import Manager from "./pages/Manager";
import Units from "./pages/Units";
import Payments from "./pages/Payments";
import Feed from "./pages/Feed";
import AdminAmenities from "./pages/AdminAmenities";
import AdminBookings from "./pages/AdminBookings";
import BuildingBookings from "./pages/BuildingBookings";
import Onboarding from "./pages/Onboarding";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SessionProvider>
            <BuildingProvider>
              <DebugBar />
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/verify-static" element={<VerifyStatic />} />
              
              {/* Onboarding - Role Selection */}
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/validate" element={<ProtectedRoute><Validate /></ProtectedRoute>} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/admin/setup" element={<ProtectedRoute><AdminSetup /></ProtectedRoute>} />
              <Route path="/admin/onboarding" element={<ProtectedRoute><AdminOnboarding /></ProtectedRoute>} />
              <Route path="/admin/profile" element={<ProtectedRoute><AdminProfile /></ProtectedRoute>} />
              <Route path="/admin/portfolio" element={<ProtectedRoute><AdminPortfolio /></ProtectedRoute>} />
              <Route path="/admin/guests" element={<ProtectedRoute><Guests /></ProtectedRoute>} />
              <Route path="/admin/units" element={<ProtectedRoute><Units /></ProtectedRoute>} />
              <Route path="/admin/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
              <Route path="/admin/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/admin/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/admin/amenities" element={<ProtectedRoute><AdminAmenities /></ProtectedRoute>} />
              <Route path="/admin/bookings" element={<ProtectedRoute><AdminBookings /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/admin/overview" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              
              {/* Manager Routes */}
              <Route path="/manager" element={<ProtectedRoute><Manager /></ProtectedRoute>} />
              <Route path="/buildings/:buildingId/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/buildings/:buildingId/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/buildings/:buildingId/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
              <Route path="/buildings/:buildingId/units" element={<ProtectedRoute><Units /></ProtectedRoute>} />
              <Route path="/buildings/:buildingId/guests" element={<ProtectedRoute><Guests /></ProtectedRoute>} />
              <Route path="/buildings/:buildingId/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/buildings/:buildingId/amenities" element={<ProtectedRoute><AdminAmenities /></ProtectedRoute>} />
              <Route path="/buildings/:buildingId/bookings" element={<ProtectedRoute><BuildingBookings /></ProtectedRoute>} />
              <Route path="/buildings/:buildingId/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
              
              {/* Resident Routes */}
              <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BuildingProvider>
          </SessionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
