
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SessionSelector } from "@/components/SessionSelector";
import { DashboardOverview } from "@/components/DashboardOverview";
import { NewFileUploader } from "@/components/NewFileUploader";
import { ExcelFileUploader } from "@/components/ExcelFileUploader";
import { TemplateDownloader } from "@/components/TemplateDownloader";
import { SurveillantListEditor } from "@/components/SurveillantListEditor";
import { AvailabilityMatrix } from "@/components/AvailabilityMatrix";
import { NewPlanningView } from "@/components/NewPlanningView";
import { SoldesSurveillants } from "@/components/SoldesSurveillants";
import { IntelligentAssignmentEngine } from "@/components/IntelligentAssignmentEngine";
import { ExamenReviewManager } from "@/components/ExamenReviewManager";
import { CandidatsSurveillance } from "@/components/CandidatsSurveillance";
import { CandidaturesManager } from "@/components/CandidaturesManager";
import { PreAssignmentManager } from "@/components/PreAssignmentManager";
import { ContraintesAuditoires } from "@/components/ContraintesAuditoires";
import { DataConsistencyChecker } from "@/components/DataConsistencyChecker";
import { SensitiveDataManager } from "@/components/SensitiveDataManager";
import SurveillanceHistory from "@/components/SurveillanceHistory";
import { DemandeChangement } from "@/components/DemandeChangement";

const Admin = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [uploadStates, setUploadStates] = useState({
    surveillants: false,
    examens: false,
    indisponibilites: false,
    quotas: false,
    disponibilites: false
  });

  const handleUploadSuccess = (fileType: string, success: boolean) => {
    setUploadStates(prev => ({
      ...prev,
      [fileType]: success
    }));
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardOverview />;
      
      case "import":
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Import de données</h2>
              <p className="text-gray-600">Importez vos données au format CSV ou Excel</p>
            </div>
            
            <div className="grid gap-6">
              <NewFileUploader
                title="Import Surveillants"
                description="Importer la liste des surveillants avec leurs informations détaillées"
                fileType="surveillants"
                expectedFormat={[
                  'nom', 'prenom', 'email', 'type', 'faculte_interdite', 
                  'eft', 'affectation_fac', 'date_fin_contrat', 'telephone_gsm', 'campus'
                ]}
                onUpload={(success) => handleUploadSuccess('surveillants', success)}
                uploaded={uploadStates.surveillants}
              />
              
              <ExcelFileUploader
                title="Import Surveillants (Excel)"
                description="Importer la liste des surveillants depuis un fichier Excel"
                fileType="surveillants"
                expectedFormat={['Nom', 'Prénom', 'Email', 'Type', 'Statut']}
                onUpload={(success) => handleUploadSuccess('surveillants', success)}
                uploaded={uploadStates.surveillants}
              />
              
              <NewFileUploader
                title="Import Examens"
                description="Importer la liste des examens avec leurs détails"
                fileType="examens"
                expectedFormat={['date_examen', 'heure_debut', 'heure_fin', 'matiere', 'salle', 'nombre_surveillants', 'type_requis', 'faculte', 'auditoire_original']}
                onUpload={(success) => handleUploadSuccess('examens', success)}
                uploaded={uploadStates.examens}
              />
              
              <ExcelFileUploader
                title="Import Examens (Excel)"
                description="Importer la liste des examens depuis un fichier Excel"
                fileType="examens"
                expectedFormat={['Date', 'Heure Début', 'Heure Fin', 'Matière', 'Salle', 'Nombre Surveillants', 'Type Requis']}
                onUpload={(success) => handleUploadSuccess('examens', success)}
                uploaded={uploadStates.examens}
              />
              
              <NewFileUploader
                title="Import Indisponibilités"
                description="Importer les indisponibilités des surveillants"
                fileType="indisponibilites"
                expectedFormat={['email', 'date_debut', 'date_fin', 'motif']}
                onUpload={(success) => handleUploadSuccess('indisponibilites', success)}
                uploaded={uploadStates.indisponibilites}
              />
              
              <ExcelFileUploader
                title="Import Disponibilités (Excel)"
                description="Importer les disponibilités des surveillants depuis un fichier Excel"
                fileType="disponibilites"
                expectedFormat={['Email', 'Date', 'Heure Début', 'Heure Fin', 'Disponible']}
                onUpload={(success) => handleUploadSuccess('disponibilites', success)}
                uploaded={uploadStates.disponibilites}
              />
              
              <NewFileUploader
                title="Import Quotas"
                description="Importer les quotas personnalisés des surveillants"
                fileType="quotas"
                expectedFormat={['email', 'quota', 'sessions_imposees']}
                onUpload={(success) => handleUploadSuccess('quotas', success)}
                uploaded={uploadStates.quotas}
              />
            </div>
          </div>
        );
      
      case "templates":
        return <TemplateDownloader />;
      
      case "surveillants":
        return <SurveillantListEditor />;
      
      case "disponibilites":
        return <AvailabilityMatrix />;
      
      case "planning":
        return <NewPlanningView />;
      
      case "soldes":
        return <SoldesSurveillants />;
      
      case "assignment":
        return <IntelligentAssignmentEngine />;
      
      case "examens":
        return <ExamenReviewManager />;
      
      case "candidats":
        return <CandidatsSurveillance />;
      
      case "candidatures":
        return <CandidaturesManager />;
      
      case "pre-assignment":
        return <PreAssignmentManager />;
      
      case "contraintes":
        return <ContraintesAuditoires />;
      
      case "consistency":
        return <DataConsistencyChecker />;
      
      case "sensitive":
        return <SensitiveDataManager 
          showSensitiveData={showSensitiveData} 
          onToggle={setShowSensitiveData} 
        />;
      
      case "history":
        return <SurveillanceHistory />;
      
      case "changements":
        return <DemandeChangement />;
      
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="flex-1 p-6">
        <div className="mb-6">
          <SessionSelector />
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Admin;
