
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SuiviDisponibilitesAdmin } from "@/components/SuiviDisponibilitesAdmin";

// Import des principaux modules admin
// (désactivez ceux qui n'existent pas ou adaptez les chemins si nécessaire)
import { ExamenReviewManager } from "@/components/ExamenReviewManager";
import { SurveillantUnifiedManager } from "@/components/SurveillantUnifiedManager";
import { ContraintesAuditoires } from "@/components/ContraintesAuditoires";

// Dashboard d'accueil très simple ici
function DashboardAdmin() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-2 text-uclouvain-blue">Bienvenue sur le tableau de bord administration</h2>
      <ul className="list-disc pl-6 text-gray-700 space-y-2">
        <li>Gérez les sessions d’examen et l’ensemble de la planification</li>
        <li>Importez, révisez et attribuez les surveillants aux examens</li>
        <li>Suivez en temps réel la collecte des disponibilités</li>
        <li>Régulez les contraintes, pré-assignations et workflows de validation</li>
      </ul>
    </div>
  );
}

// Permet de faire le mapping "tab" → Vue correspondante
function getAdminContent(tab: string | null) {
  switch (tab) {
    case "examens":
    case "import-codes": // On peut réutiliser ce composant pour plusieurs sous-onglets
    case "planning":
    case "enseignant-view":
    case "tokens-enseignants":
    case "validations":
      // Attention : Placez ici le composant principal lié aux examens.
      return <ExamenReviewManager />;
    case "surveillants":
      return <SurveillantUnifiedManager />;
    case "candidatures":
      // Pour l’envoi de candidatures → même composant que la collecte ?
      return <SuiviDisponibilitesAdmin />;
    case "disponibilites":
    case "matrice-disponibilites":
    case "suivi-disponibilites":
      return <SuiviDisponibilitesAdmin />;
    case "contraintes":
      return <ContraintesAuditoires />;
    case "pre-assignations":
      return <div className="text-gray-700">Gestion des pré-assignations à venir.</div>;
    case "historique":
      return <div className="text-gray-700">Historique des actions administratives (module à intégrer).</div>;
    case "donnees-sensibles":
      return <div className="text-gray-700">Gestion des données sensibles (accès restreint).</div>;
    default:
      // Page d’accueil (dashboard général)
      return <DashboardAdmin />;
  }
}

export default function AdminPage() {
  const location = useLocation();
  // Parse l’URL pour extraire "tab=xxx"
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const currentTab = params.get("tab");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 bg-gray-50 p-5">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Administration</h1>
            <p className="mb-6">
              Gérez toutes les fonctions d’administration : sessions, examens, surveillants, candidatures, validations, statistiques...
            </p>
            {getAdminContent(currentTab)}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
