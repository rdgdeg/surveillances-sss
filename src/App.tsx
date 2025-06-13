
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import PublicForm from "./pages/PublicForm";
import Surveillant from "./pages/Surveillant";
import Privacy from "./pages/Privacy";
import Credits from "./pages/Credits";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useScrollToTop();
  
  return (
    <Routes>
      {/* Page d'accueil par défaut - accessible à tous */}
      <Route path="/" element={<Index />} />
      
      {/* Pages publiques - accessibles à tous */}
      <Route path="/candidature" element={<PublicForm />} />
      <Route path="/surveillant" element={<Surveillant />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/credits" element={<Credits />} />
      
      {/* Page d'authentification */}
      <Route path="/auth" element={<Auth />} />
      
      {/* Pages protégées - nécessitent une authentification admin */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        } 
      />
      
      {/* Page 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div>Loading...</div>}>
              <AppContent />
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
