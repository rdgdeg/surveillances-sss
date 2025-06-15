
import { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardOverview } from "@/components/DashboardOverview";
import { SensitiveDataManager } from "@/components/SensitiveDataManager";
import { SimpleSurveillantManager } from "@/components/SimpleSurveillantManager";
import { SurveillantAdvancedManager } from "@/components/SurveillantAdvancedManager";
import { SurveillantUnifiedManager } from "@/components/SurveillantUnifiedManager";
import { ExamenReviewManager } from "@/components/ExamenReviewManager";
import { ExamenWorkflowManager } from "@/components/ExamenWorkflowManager";
import { NewPlanningView } from "@/components/NewPlanningView";
import { ContraintesAuditoires } from "@/components/ContraintesAuditoires";
import { CandidaturesManager } from "@/components/CandidaturesManager";
import { CollecteDisponibilites } from "@/components/CollecteDisponibilites";
import { SuiviDisponibilites } from "@/components/SuiviDisponibilites";
import SurveillanceHistory from "@/components/SurveillanceHistory";
import { EnseignantViewManager } from "@/components/EnseignantViewManager";
import { PreAssignmentManager } from "@/components/PreAssignmentManager";
import { TokenGenerator } from "@/components/TokenGenerator";
import { AvailabilityMatrix } from "@/components/AvailabilityMatrix";
import { ExamenCodeUploader } from "@/components/ExamenCodeUploader";

type ActiveTab = 
  | "dashboard" 
  | "examens" 
  | "validation" 
  | "planning" 
  | "surveillants" 
  | "contraintes" 
  | "candidatures" 
  | "disponibilites"
  | "suivi-disponibilites"
  | "historique"
  | "donnees-sensibles"
  | "enseignant-view"
  | "pre-assignations"
  | "tokens-enseignants"
  | "matrice-disponibilites"
  | "import-codes"
  | "surveillants-unified";

const Admin = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const handleViewChange = (view: string) => {
    setActiveTab(view as ActiveTab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview />;
      case "examens":
        return <ExamenReviewManager />;
      case "validation":
        return <ExamenWorkflowManager />;
      case "enseignant-view":
        return <EnseignantViewManager />;
      case "planning":
        return <NewPlanningView />;
      case "surveillants":
        return <SimpleSurveillantManager />;
      case "contraintes":
        return <ContraintesAuditoires />;
      case "candidatures":
        return <CandidaturesManager />;
      case "disponibilites":
        return <CollecteDisponibilites />;
      case "suivi-disponibilites":
        return <SuiviDisponibilites />;
      case "historique":
        return <SurveillanceHistory />;
      case "donnees-sensibles":
        return <SensitiveDataManager 
          showSensitiveData={showSensitiveData} 
          onToggle={setShowSensitiveData} 
        />;
      case "pre-assignations":
        return <PreAssignmentManager />;
      case "tokens-enseignants":
        return <TokenGenerator />;
      case "matrice-disponibilites":
        return <AvailabilityMatrix />;
      case "import-codes":
        return <ExamenCodeUploader />;
      case "surveillants-unified":
        return <SurveillantUnifiedManager />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar activeView={activeTab} onViewChange={handleViewChange} />
      <main className="flex-1 overflow-auto p-6">
        {renderContent()}
      </main>
    </div>
  );
};

export default Admin;
