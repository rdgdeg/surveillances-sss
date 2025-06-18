
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminProtection } from "@/components/AdminProtection";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminDisponibilites from "./pages/AdminDisponibilites";
import AdminDemandesSpecifiques from "./pages/AdminDemandesSpecifiques";
import AdminDisponibilitesParJour from "./pages/AdminDisponibilitesParJour";
import AdminDisponibilitesMatrice from "./pages/AdminDisponibilitesMatrice";
import AdminDisponibilitesParPersonne from "./pages/AdminDisponibilitesParPersonne";
import AdminCandidatures from "./pages/AdminCandidatures";
import Surveillant from "./pages/Surveillant";
import EnseignantConfirmation from "./pages/EnseignantConfirmation";
import EnseignantToken from "./pages/EnseignantToken";
import PlanningGeneral from "./pages/PlanningGeneral";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route 
              path="/admin" 
              element={
                <AdminProtection>
                  <Admin />
                </AdminProtection>
              } 
            />
            <Route 
              path="/admin/disponibilites" 
              element={
                <AdminProtection>
                  <AdminDisponibilites />
                </AdminProtection>
              } 
            />
            <Route 
              path="/admin/disponibilites/par-jour" 
              element={
                <AdminProtection>
                  <AdminDisponibilitesParJour />
                </AdminProtection>
              } 
            />
            <Route 
              path="/admin/disponibilites/matrice" 
              element={
                <AdminProtection>
                  <AdminDisponibilitesMatrice />
                </AdminProtection>
              } 
            />
            <Route 
              path="/admin/disponibilites/par-personne" 
              element={
                <AdminProtection>
                  <AdminDisponibilitesParPersonne />
                </AdminProtection>
              } 
            />
            <Route 
              path="/admin/candidatures" 
              element={
                <AdminProtection>
                  <AdminCandidatures />
                </AdminProtection>
              } 
            />
            <Route 
              path="/admin/demandes-specifiques" 
              element={
                <AdminProtection>
                  <AdminDemandesSpecifiques />
                </AdminProtection>
              } 
            />
            <Route path="/planning-general" element={<PlanningGeneral />} />
            <Route path="/surveillant" element={<Surveillant />} />
            <Route path="/enseignant" element={<EnseignantConfirmation />} />
            <Route path="/enseignant/token/:token" element={<EnseignantToken />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
