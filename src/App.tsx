
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminProtection } from "@/components/AdminProtection";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminDisponibilites from "./pages/AdminDisponibilites";
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
