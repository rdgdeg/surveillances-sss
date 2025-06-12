
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Calendar, Users, Settings, Play, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { FileUploader } from "@/components/FileUploader";
import { PlanningView } from "@/components/PlanningView";
import { AssignmentEngine } from "@/components/AssignmentEngine";
import { toast } from "@/hooks/use-toast";

const Admin = () => {
  const [uploadedFiles, setUploadedFiles] = useState({
    examens: false,
    surveillants: false,
    indisponibilites: false
  });

  const [dataLoaded, setDataLoaded] = useState(false);

  const handleFileUpload = (fileType: string, success: boolean) => {
    if (success) {
      setUploadedFiles(prev => ({ ...prev, [fileType]: true }));
      toast({
        title: "Fichier importé avec succès",
        description: `Le fichier ${fileType}.xlsx a été traité et validé.`,
      });
      
      // Check if all files are uploaded
      const newState = { ...uploadedFiles, [fileType]: true };
      if (newState.examens && newState.surveillants && newState.indisponibilites) {
        setDataLoaded(true);
        toast({
          title: "Données complètes",
          description: "Tous les fichiers ont été importés. Vous pouvez maintenant procéder à l'attribution.",
        });
      }
    }
  };

  const allFilesUploaded = uploadedFiles.examens && uploadedFiles.surveillants && uploadedFiles.indisponibilites;

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
              <Badge variant={allFilesUploaded ? "default" : "secondary"}>
                {allFilesUploaded ? "Données complètes" : "Import en cours"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="import" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </TabsTrigger>
            <TabsTrigger value="planning" disabled={!dataLoaded} className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Planning</span>
            </TabsTrigger>
            <TabsTrigger value="assignment" disabled={!dataLoaded} className="flex items-center space-x-2">
              <Play className="h-4 w-4" />
              <span>Attribution</span>
            </TabsTrigger>
            <TabsTrigger value="management" disabled={!dataLoaded} className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Gestion</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span>Import des Fichiers Excel</span>
                </CardTitle>
                <CardDescription>
                  Importez les trois fichiers Excel nécessaires : examens, surveillants et indisponibilités.
                  Chaque fichier sera validé automatiquement lors de l'upload.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <FileUploader
                    title="Examens"
                    description="Liste des examens avec salles et types requis"
                    fileType="examens"
                    expectedFormat={["Date", "Heure", "Matière", "Salle", "Nombre surveillants", "Type requis"]}
                    onUpload={(success) => handleFileUpload("examens", success)}
                    uploaded={uploadedFiles.examens}
                  />
                  <FileUploader
                    title="Surveillants"
                    description="Personnel disponible avec quotas et types"
                    fileType="surveillants"
                    expectedFormat={["Nom", "Prénom", "Email", "Type", "Quota", "Sessions imposées"]}
                    onUpload={(success) => handleFileUpload("surveillants", success)}
                    uploaded={uploadedFiles.surveillants}
                  />
                  <FileUploader
                    title="Indisponibilités"
                    description="Périodes d'indisponibilité du personnel"
                    fileType="indisponibilites"
                    expectedFormat={["Email", "Date début", "Date fin", "Motif"]}
                    onUpload={(success) => handleFileUpload("indisponibilites", success)}
                    uploaded={uploadedFiles.indisponibilites}
                  />
                </div>
                
                {allFilesUploaded && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="bg-green-500 rounded-full p-1">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium text-green-800">
                        Tous les fichiers ont été importés avec succès !
                      </span>
                    </div>
                    <p className="text-green-700 mt-2">
                      Vous pouvez maintenant accéder aux autres onglets pour configurer et lancer l'attribution automatique.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning">
            <PlanningView />
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
