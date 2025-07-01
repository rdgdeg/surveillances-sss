
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { DashboardOverview } from "@/components/DashboardOverview";
import { ExamenReviewManager } from "@/components/ExamenReviewManager";
import { ExamenAdvancedManager } from "@/components/ExamenAdvancedManager";
import { SurveillantUnifiedManager } from "@/components/SurveillantUnifiedManager";
import { ContraintesAuditoires } from "@/components/ContraintesAuditoires";
import { PreAssignmentManager } from "@/components/PreAssignmentManager";
import { FeatureLockManager } from "@/components/FeatureLockManager";
import { SuiviConfirmationEnseignants } from "@/components/SuiviConfirmationEnseignants";
import { ControlesVerificationsManager } from "@/components/ControlesVerificationsManager";
import { AdminUserManager } from "@/components/AdminUserManager";
import { EnseignantViewManager } from "@/components/EnseignantViewManager";

// Dashboard d'accueil avec workflow guidé et statistiques
function DashboardAdmin() {
  return (
    <div className="w-full max-w-none space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-uclouvain-blue">Centre d'Administration</h2>
        <p className="text-gray-600">Gérez l'organisation des surveillances d'examens</p>
      </div>
      <DashboardOverview />
    </div>
  );
}

// Permet de faire le mapping "tab" → Vue correspondante pour les onglets qui n'ont pas encore de pages dédiées
function getAdminContent(tab: string | null) {
  switch (tab) {
    case "examens":
      return <ExamenAdvancedManager />;
    case "planning":
    case "validations":
      return <ExamenReviewManager />;
    case "enseignant-view":
      return <EnseignantViewManager />;  
    case "surveillants":
      return <SurveillantUnifiedManager />;
    case "pre-assignations":
      return <PreAssignmentManager />;
    case "contraintes":
      return <ContraintesAuditoires />;
    case "feature-locks":
      return <FeatureLockManager />;
    case "gestion-utilisateurs":
      return <AdminUserManager />;
    case "suivi-confirm-enseignants":
      return <SuiviConfirmationEnseignants />;
    case "controles-verifications":
      return <ControlesVerificationsManager />;
    default:
      return <DashboardAdmin />;
  }
}

export default function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const currentTab = params.get("tab");

  // Redirections automatiques des anciennes routes vers les nouvelles
  useEffect(() => {
    if (currentTab) {
      switch (currentTab) {
        case "disponibilites":
          navigate("/admin/disponibilites", { replace: true });
          return;
        case "candidatures":
        case "suivi-disponibilites":
          navigate("/admin/disponibilites/par-personne", { replace: true });
          return;
        case "matrice-disponibilites":
          navigate("/admin/disponibilites/matrice", { replace: true });
          return;
        case "demandes-specifiques":
          navigate("/admin/demandes-specifiques", { replace: true });
          return;
        // Redirection des anciens tabs supprimés
        case "import-codes":
          navigate("/admin/templates", { replace: true });
          return;
        case "tokens-enseignants":
          // Rediriger vers suivi confirmations car plus pertinent
          navigate("/admin?tab=suivi-confirm-enseignants", { replace: true });
          return;
        case "historique":
        case "donnees-sensibles":
          // Rediriger vers dashboard car non développés
          navigate("/admin", { replace: true });
          return;
      }
    }
  }, [currentTab, navigate]);

  // Si nous avons une redirection en cours, ne rien afficher
  if (currentTab && [
    "disponibilites", 
    "candidatures", 
    "suivi-disponibilites", 
    "matrice-disponibilites", 
    "demandes-specifiques",
    "import-codes",
    "tokens-enseignants",
    "historique",
    "donnees-sensibles"
  ].includes(currentTab)) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div className="w-full">
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-600 mt-2">
            Tableau de bord principal de l'administration.
          </p>
        </div>
        <div className="w-full">
          {getAdminContent(currentTab)}
        </div>
      </div>
    </AdminLayout>
  );
}
