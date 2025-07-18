import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AdminPage from "./pages/Admin";
import AdminDisponibilitesPage from "./pages/AdminDisponibilites";
import AdminDisponibilitesParJourPage from "./pages/AdminDisponibilitesParJour";
import AdminDisponibilitesMatricePage from "./pages/AdminDisponibilitesMatrice";
import AdminDisponibilitesParPersonnePage from "./pages/AdminDisponibilitesParPersonne";
import AdminDemandesSpecifiquesPage from "./pages/AdminDemandesSpecifiques";
import AdminCandidaturesPage from "./pages/AdminCandidatures";
import AdminTemplatesPage from "./pages/AdminTemplates";
import AdminCreneauxSurveillancePage from "./pages/AdminCreneauxSurveillance";
import PlanningGeneral from "./pages/PlanningGeneral";
import Planning from "./pages/Planning";
import Surveillant from "./pages/Surveillant";
import EnseignantToken from "./pages/EnseignantToken";
import EnseignantRedirect from "./pages/EnseignantRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/templates" element={<AdminTemplatesPage />} />
          <Route path="/admin/disponibilites" element={<AdminDisponibilitesPage />} />
          <Route path="/admin/disponibilites/par-jour" element={<AdminDisponibilitesParJourPage />} />
          <Route path="/admin/disponibilites/matrice" element={<AdminDisponibilitesMatricePage />} />
          <Route path="/admin/disponibilites/par-personne" element={<AdminDisponibilitesParPersonnePage />} />
          <Route path="/admin/demandes-specifiques" element={<AdminDemandesSpecifiquesPage />} />
          <Route path="/admin/candidatures" element={<AdminCandidaturesPage />} />
          <Route path="/admin/creneaux-surveillance" element={<AdminCreneauxSurveillancePage />} />
          <Route path="/planning-general" element={<PlanningGeneral />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/surveillant" element={<Surveillant />} />
          <Route path="/enseignant" element={<EnseignantRedirect />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
