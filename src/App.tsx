
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminExamens from "./pages/AdminExamens";
import AdminSurveillants from "./pages/AdminSurveillants";
import AdminSessions from "./pages/AdminSessions";
import AdminCandidatures from "./pages/AdminCandidatures";
import AdminCollecte from "./pages/AdminCollecte";
import AdminDisponibilites from "./pages/AdminDisponibilites";
import AdminSuiviDisponibilites from "./pages/AdminSuiviDisponibilites";
import AdminMatrice from "./pages/AdminMatrice";
import AdminAttributions from "./pages/AdminAttributions";
import AdminAuditoires from "./pages/AdminAuditoires";
import AdminProblemes from "./pages/AdminProblemes";
import AdminSettings from "./pages/AdminSettings";
import AdminDemandesModification from "./pages/AdminDemandesModification";
import Surveillant from "./pages/Surveillant";
import Enseignant from "./pages/Enseignant";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/examens" element={<AdminExamens />} />
              <Route path="/admin/surveillants" element={<AdminSurveillants />} />
              <Route path="/admin/sessions" element={<AdminSessions />} />
              <Route path="/admin/candidatures" element={<AdminCandidatures />} />
              <Route path="/admin/collecte" element={<AdminCollecte />} />
              <Route path="/admin/disponibilites" element={<AdminDisponibilites />} />
              <Route path="/admin/suivi-disponibilites" element={<AdminSuiviDisponibilites />} />
              <Route path="/admin/gestion-disponibilites" element={<Navigate to="/admin/disponibilites" replace />} />
              <Route path="/admin/matrice" element={<AdminMatrice />} />
              <Route path="/admin/attributions" element={<AdminAttributions />} />
              <Route path="/admin/auditoires" element={<AdminAuditoires />} />
              <Route path="/admin/problemes" element={<AdminProblemes />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/demandes-modification" element={<AdminDemandesModification />} />
              <Route path="/surveillant" element={<Surveillant />} />
              <Route path="/enseignant/:token?" element={<Enseignant />} />
            </Routes>
          </BrowserRouter>
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
