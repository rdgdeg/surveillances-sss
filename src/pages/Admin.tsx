
import { useState } from "react";
import { SessionSelector } from "@/components/SessionSelector";
import { TemplateDownloader } from "@/components/TemplateDownloader";
import { ExcelFileUploader } from "@/components/ExcelFileUploader";
import { NewPlanningView } from "@/components/NewPlanningView";
import { PreAssignmentManager } from "@/components/PreAssignmentManager";
import { RoomConstraintsManager } from "@/components/RoomConstraintsManager";
import SurveillanceHistory from "@/components/SurveillanceHistory";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AvailabilityMatrix } from "@/components/AvailabilityMatrix";
import { CallyImporter } from "@/components/CallyImporter";
import { DataConsistencyChecker } from "@/components/DataConsistencyChecker";
import { IntelligentAssignmentEngine } from "@/components/IntelligentAssignmentEngine";
import { SurveillantCreator } from "@/components/SurveillantCreator";
import { SoldesSurveillants } from "@/components/SoldesSurveillants";
import { DemandeChangement } from "@/components/DemandeChangement";

const Admin = () => {
  const [activeView, setActiveView] = useState("sessions");
  const [uploadStates, setUploadStates] = useState({
    surveillants: false,
    examens: false,
    disponibilites: false,
    quotas: false
  });

  const handleUpload = (fileType: keyof typeof uploadStates, success: boolean) => {
    setUploadStates(prev => ({
      ...prev,
      [fileType]: success
    }));
  };

  const getViewTitle = () => {
    switch (activeView) {
      case "sessions": return "Gestion des Sessions";
      case "templates": return "Templates de Données";
      case "import": return "Import des Données";
      case "consistency": return "Contrôle de Cohérence";
      case "assignment": return "Attribution Intelligente";
      case "availability": return "Matrice des Disponibilités";
      case "cally-import": return "Import Cally";
      case "pre-assignments": return "Pré-assignations";
      case "constraints": return "Contraintes par Salle";
      case "contraintes-auditoires": return "Contraintes Auditoires";
      case "candidats-surveillance": return "Candidats Surveillance";
      case "examen-review": return "Révision Examens";
      case "history": return "Historique des Surveillances";
      case "planning": return "Planning des Surveillances";
      case "surveillant-creator": return "Créer des Surveillants";
      case "soldes": return "Soldes et Réattribution";
      case "demandes": return "Demandes de Changement";
      default: return "Administration";
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case "sessions":
        return <SessionSelector />;
      
      case "templates":
        return <TemplateDownloader />;
      
      case "consistency":
        return <DataConsistencyChecker />;
        
      case "assignment":
        return <IntelligentAssignmentEngine />;

      case "contraintes-auditoires":
        return <ContraintesAuditoires />;

      case "candidats-surveillance":
        return <CandidatsSurveillance />;

      case "examen-review":
        return <ExamenReviewManager />;
      
      case "import":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Import des Données Excel</CardTitle>
              <CardDescription>
                Importez vos données à partir des fichiers Excel téléchargés dans l'onglet Templates.
                Respectez l'ordre pour éviter les erreurs de recoupement par email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">📋 Ordre d'import recommandé</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>1. <strong>Surveillants</strong> (obligatoire en premier - crée la base de données des emails)</div>
                  <div>2. <strong>Examens</strong> (définit les créneaux disponibles)</div>
                  <div>3. <strong>Disponibilités</strong> (matrice surveillant × créneaux)</div>
                  <div>4. <strong>Quotas</strong> (ajustements optionnels des quotas par défaut)</div>
                  <div>5. <strong>Indisponibilités</strong> (exceptions optionnelles)</div>
                </div>
              </div>

              <div className="grid gap-6">
                {/* Step 1: Surveillants */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</span>
                    <h3 className="font-medium">Surveillants (Obligatoire en premier)</h3>
                  </div>
                  <ExcelFileUploader
                    title="Import des Surveillants"
                    description="Importez la liste des surveillants - Base pour tous les recoupements par email"
                    fileType="surveillants"
                    expectedFormat={["Nom", "Prénom", "Email", "Type", "Statut"]}
                    onUpload={(success) => handleUpload('surveillants', success)}
                    uploaded={uploadStates.surveillants}
                  />
                </div>

                {/* Step 2: Examens */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">2</span>
                    <h3 className="font-medium">Examens</h3>
                  </div>
                  <ExcelFileUploader
                    title="Import des Examens"
                    description="Importez le planning des examens - Définit les créneaux disponibles"
                    fileType="examens"
                    expectedFormat={["Date", "Heure début", "Heure fin", "Matière", "Salle", "Nombre surveillants", "Type requis"]}
                    onUpload={(success) => handleUpload('examens', success)}
                    uploaded={uploadStates.examens}
                  />
                </div>

                {/* Step 3: Disponibilités (nouveau) */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">3</span>
                    <h3 className="font-medium">Disponibilités (Recommandé)</h3>
                  </div>
                  <ExcelFileUploader
                    title="Import des Disponibilités"
                    description="Matrice des disponibilités par surveillant et créneau (recoupement par email)"
                    fileType="disponibilites"
                    expectedFormat={["Email", "Date", "Heure début", "Heure fin", "Disponible"]}
                    onUpload={(success) => handleUpload('disponibilites', success)}
                    uploaded={uploadStates.disponibilites}
                  />
                </div>

                {/* Step 4: Quotas */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">4</span>
                    <h3 className="font-medium">Quotas Personnalisés (Optionnel)</h3>
                  </div>
                  <ExcelFileUploader
                    title="Import des Quotas"
                    description="Modifiez les quotas par défaut pour certains surveillants (recoupement par email)"
                    fileType="quotas"
                    expectedFormat={["Email", "Quota", "Sessions imposées"]}
                    onUpload={(success) => handleUpload('quotas', success)}
                    uploaded={uploadStates.quotas}
                  />
                </div>

                {/* Step 5: Indisponibilités */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">5</span>
                    <h3 className="font-medium">Indisponibilités (Optionnel)</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    ⚠️ Les indisponibilités remplacent les disponibilités définies précédemment
                  </p>
                  {/* Placeholder pour les indisponibilités - pas encore implementé */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <p className="text-gray-600">Utilisez plutôt l'import des Disponibilités ou la Matrice interactive</p>
                  </div>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border">
                <h4 className="font-medium text-blue-900 mb-2">État de l'import et recoupement</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Surveillants (Base emails)</span>
                    <span className={`text-sm px-2 py-1 rounded ${uploadStates.surveillants ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {uploadStates.surveillants ? 'Importé ✓' : 'REQUIS'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Examens (Créneaux)</span>
                    <span className={`text-sm px-2 py-1 rounded ${uploadStates.examens ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {uploadStates.examens ? 'Importé ✓' : 'En attente'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Disponibilités</span>
                    <span className={`text-sm px-2 py-1 rounded ${uploadStates.disponibilites ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {uploadStates.disponibilites ? 'Importé ✓' : 'Recommandé'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Quotas</span>
                    <span className={`text-sm px-2 py-1 rounded ${uploadStates.quotas ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {uploadStates.quotas ? 'Importé ✓' : 'Optionnel'}
                    </span>
                  </div>
                </div>
                
                {uploadStates.surveillants && uploadStates.examens && (
                  <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded">
                    <p className="text-green-800 text-sm font-medium">
                      ✅ Données principales importées ! Vous pouvez maintenant utiliser l'attribution automatique.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      
      case "availability":
        return <AvailabilityMatrix />;
      
      case "cally-import":
        return <CallyImporter />;
      
      case "pre-assignments":
        return <PreAssignmentManager />;
      
      case "constraints":
        return <RoomConstraintsManager />;
      
      case "history":
        return <SurveillanceHistory />;
      
      case "planning":
        return <NewPlanningView />;
      
      case "surveillant-creator":
        return <SurveillantCreator />;
      
      case "soldes":
        return <SoldesSurveillants />;
      
      case "demandes":
        return <DemandeChangement />;
      
      default:
        return <div>Section non trouvée</div>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar activeView={activeView} onViewChange={setActiveView} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/admin">
                    Administration
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getViewTitle()}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{getViewTitle()}</h1>
              <p className="text-muted-foreground">
                {activeView === "sessions" && "Créez et gérez les sessions d'examens"}
                {activeView === "templates" && "Téléchargez les modèles Excel avec recoupement par email"}
                {activeView === "import" && "Importez vos données avec contrôles de cohérence"}
                {activeView === "consistency" && "Vérifiez la cohérence entre surveillants, examens et disponibilités"}
                {activeView === "assignment" && "Attribution automatique intelligente avec contraintes"}
                {activeView === "availability" && "Gérez les disponibilités avec une matrice visuelle"}
                {activeView === "cally-import" && "Importez les disponibilités depuis un fichier Cally"}
                {activeView === "pre-assignments" && "Gérez les assignations obligatoires de surveillants"}
                {activeView === "constraints" && "Définissez les contraintes par salle d'examen"}
                {activeView === "contraintes-auditoires" && "Configurez les contraintes spécifiques par auditoire"}
                {activeView === "candidats-surveillance" && "Gérez les candidatures pour la surveillance"}
                {activeView === "examen-review" && "Révisez et ajustez les besoins en surveillants par examen"}
                {activeView === "history" && "Consultez l'historique des surveillances par surveillant"}
                {activeView === "planning" && "Visualisez et gérez le planning des surveillances"}
                {activeView === "surveillant-creator" && "Créez des surveillants avec quotas personnalisés"}
                {activeView === "soldes" && "Consultez les soldes et gérez les réattributions"}
                {activeView === "demandes" && "Gérez les demandes de changement des surveillants"}
              </p>
            </div>
            
            <div className="flex-1">
              {renderContent()}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
