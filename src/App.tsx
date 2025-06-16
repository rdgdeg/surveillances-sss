
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Surveillant from "./pages/Surveillant";
import PublicForm from "./pages/PublicForm";
import DisponibilitesForm from "./pages/DisponibilitesForm";
import EnseignantConfirmation from "./pages/EnseignantConfirmation";
import EnseignantToken from "./pages/EnseignantToken";
import Credits from "./pages/Credits";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/surveillant" element={<Surveillant />} />
            <Route path="/collecte" element={<PublicForm />} />
            <Route path="/disponibilites" element={<DisponibilitesForm />} />
            <Route path="/enseignant" element={<EnseignantConfirmation />} />
            <Route path="/enseignant/:token" element={<EnseignantToken />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
