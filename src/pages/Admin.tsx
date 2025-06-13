
import { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardOverview } from "@/components/DashboardOverview";
import { SensitiveDataManager } from "@/components/SensitiveDataManager";
import { SimpleSurveillantManager } from "@/components/SimpleSurveillantManager";
import { ExamenReviewManager } from "@/components/ExamenReviewManager";
import { ExamenWorkflowManager } from "@/components/ExamenWorkflowManager";
import { NewPlanningView } from "@/components/NewPlanningView";
import { ContraintesAuditoires } from "@/components/ContraintesAuditoires";
import { CandidaturesManager } from "@/components/CandidaturesManager";
import { CollecteDisponibilites } from "@/components/CollecteDisponibilites";
import { SurveillanceHistory } from "@/components/SurveillanceHistory";

type ActiveTab = 
  | "dashboard" 
  | "examens" 
  | "validation" 
  | "planning" 
  | "surveillants" 
  | "contraintes" 
  | "candidatures" 
  | "disponibilites" 
  | "historique"
  | "donnees-sensibles";

const Admin = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview />;
      case "examens":
        return <ExamenReviewManager />;
      case "validation":
        return <ExamenWorkflowManager />;
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
      case "historique":
        return <SurveillanceHistory />;
      case "donnees-sensibles":
        return <SensitiveDataManager />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-auto p-6">
        {renderContent()}
      </main>
    </div>
  );
};

export default Admin;
