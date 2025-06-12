
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Calendar, Users, Settings, Play, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { NewFileUploader } from "@/components/NewFileUploader";
import { NewPlanningView } from "@/components/NewPlanningView";
import { AssignmentEngine } from "@/components/AssignmentEngine";
import { SessionSelector } from "@/components/SessionSelector";
import { TemplateDownloader } from "@/components/TemplateDownloader";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";

const Admin = () => {
  const [uploadedFiles, setUploadedFiles] = useState({
    surveillants: false,
    examens: false,
    indisponibilites: false,
    quotas: false
  });

  const { data: activeSession } = useActiveSession();

  const handleFileUpload = (fileType: string, success: boolean) => {
    if (success) {
      setUploadedFiles(prev => ({ ...prev, [fileType]: true }));
      toast({
        title: "Fichier importé avec succès",
        description: `Le fichier ${fileType} a été traité et validé.`,
      });
    }
  };

  const hasRequiredFiles = uploadedFiles.surveillants && uploadedFiles.examens;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Retour</span>
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <Settings className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Administration des Surveillances</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {activeSession && (
                <Badge variant="default">
                  Session active: {activeSession.name}
                </Badge>
              )}
              <Badge variant={hasRequiredFiles ? "default" : "secondary"}>
                {hasRequiredFiles ? "Données complètes" : "Import en cours"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sessions" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </TabsTrigger>
            <TabsTrigger value="planning" disabled={!activeSession} className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Planning</span>
            </TabsTrigger>
            <TabsTrigger value="assignment" disabled={!hasRequiredFiles} className="flex items-center space-x-2">
              <Play className="h-4 w-4" />
              <span>Attribution</span>
            </TabsTrigger>
            <TabsTrigger value="management" disabled={!hasRequiredFiles} className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Gestion</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-6">
            <SessionSelector />
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <TemplateDownloader />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span>Import des Fichiers CSV</span>
                </CardTitle>
                <CardDescription>
                  Importez les fichiers CSV nécessaires. Les templates sont disponibles ci-dessus.
                  {!activeSession && " Activez d'abord une session dans l'onglet Sessions."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <NewFileUploader
                    title="Surveillants"
                    description="Liste des surveillants avec informations personnelles et type"
                    fileType="surveillants"
                    expectedFormat={["Nom", "Prénom", "Email", "Type", "Statut"]}
                    onUpload={(success) => handleFileUpload("surveillants", success)}
                    uploaded={uploadedFiles.surveillants}
                  />
                  <NewFileUploader
                    title="Examens"
                    description="Planning des examens avec salles et contraintes"
                    fileType="examens"
                    expectedFormat={["Date", "Heure début", "Heure fin", "Matière", "Salle", "Nombre surveillants", "Type requis"]}
                    onUpload={(success) => handleFileUpload("examens", success)}
                    uploaded={uploadedFiles.examens}
                  />
                  <NewFileUploader
                    title="Indisponibilités"
                    description="Périodes d'indisponibilité du personnel"
                    fileType="indisponibilites"
                    expectedFormat={["Email", "Date début", "Date fin", "Motif"]}
                    onUpload={(success) => handleFileUpload("indisponibilites", success)}
                    uploaded={uploadedFiles.indisponibilites}
                  />
                  <NewFileUploader
                    title="Quotas"
                    description="Quotas personnalisés par surveillant pour la session"
                    fileType="quotas"
                    expectedFormat={["Email", "Quota", "Sessions imposées"]}
                    onUpload={(success) => handleFileUpload("quotas", success)}
                    uploaded={uploadedFiles.quotas}
                  />
                </div>
                
                {hasRequiredFiles && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="bg-green-500 rounded-full p-1">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium text-green-800">
                        Fichiers essentiels importés !
                      </span>
                    </div>
                    <p className="text-green-700 mt-2">
                      Vous pouvez maintenant accéder au planning et configurer l'attribution automatique.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning">
            <NewPlanningView />
          </TabsContent>

          <TabsContent value="assignment">
            <AssignmentEngine />
          </TabsContent>

          <TabsContent value="management">
            <Card>
              <CardHeader>
                <CardTitle>Gestion Post-Attribution</CardTitle>
                <CardDescription>
                  Modifications manuelles, résolution de conflits et suivi des changements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Module de gestion des attributions à venir</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
