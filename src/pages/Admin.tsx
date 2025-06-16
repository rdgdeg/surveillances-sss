
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SuiviDisponibilitesAdmin } from "@/components/SuiviDisponibilitesAdmin";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";
import { Footer } from "@/components/Footer";
import { PreAssignmentManager } from "@/components/PreAssignmentManager";
import { SuiviConfirmationEnseignants } from "@/components/SuiviConfirmationEnseignants";
import { DashboardOverview } from "@/components/DashboardOverview";
import { DisponibilitesManager } from "@/components/DisponibilitesManager";
import { AvailabilityMatrix } from "@/components/AvailabilityMatrix";

// Import des principaux modules admin
import { ExamenReviewManager } from "@/components/ExamenReviewManager";
import { ExamenAdvancedManager } from "@/components/ExamenAdvancedManager";
import { SurveillantUnifiedManager } from "@/components/SurveillantUnifiedManager";
import { ContraintesAuditoires } from "@/components/ContraintesAuditoires";

// Dashboard d'accueil avec les statistiques principales
function DashboardAdmin() {
  return (
    <div className="w-full max-w-none space-y-6">
      <h2 className="text-xl font-semibold mb-4 text-uclouvain-blue">Tableau de bord - Vue d'ensemble</h2>
      <DashboardOverview />
    </div>
  );
}

// Permet de faire le mapping "tab" → Vue correspondante
function getAdminContent(tab: string | null) {
  switch (tab) {
    case "examens":
      return <ExamenAdvancedManager />;
    case "import-codes":
    case "planning":
    case "enseignant-view":
    case "tokens-enseignants":
    case "validations":
      return <ExamenReviewManager />;
    case "surveillants":
      return <SurveillantUnifiedManager />;
    case "pre-assignations":
      return <PreAssignmentManager />;
    case "candidatures":
      return <SuiviDisponibilitesAdmin />;
    case "disponibilites":
      return <DisponibilitesManager />;
    case "matrice-disponibilites":
      return <AvailabilityMatrix />;
    case "suivi-disponibilites":
      return <SuiviDisponibilitesAdmin />;
    case "contraintes":
      return <ContraintesAuditoires />;
    case "historique":
      return <div className="text-gray-700">Historique des actions administratives (module à intégrer).</div>;
    case "donnees-sensibles":
      return <div className="text-gray-700">Gestion des données sensibles (accès restreint).</div>;
    case "suivi-confirm-enseignants":
      return <SuiviConfirmationEnseignants />;
    default:
      return <DashboardAdmin />;
  }
}

export default function AdminPage() {
  const location = useLocation();
  // Parse l'URL pour extraire "tab=xxx"
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const currentTab = params.get("tab");

  return (
    <div className="min-h-screen w-full">
      <UCLouvainHeader />
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 bg-gray-50 flex flex-col min-h-screen w-full max-w-none">
            <div className="flex-1 w-full max-w-none p-6">
              <div className="w-full max-w-none">
                <h1 className="text-2xl font-bold mb-6 text-gray-900">Administration</h1>
                <div className="w-full max-w-none">
                  {getAdminContent(currentTab)}
                </div>
              </div>
            </div>
            <Footer />
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
