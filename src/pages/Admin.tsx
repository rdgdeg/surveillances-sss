
import { useState } from "react";
import { SessionSelector } from "@/components/SessionSelector";
import { TemplateDownloader } from "@/components/TemplateDownloader";
import { ExcelFileUploader } from "@/components/ExcelFileUploader";
import { NewPlanningView } from "@/components/NewPlanningView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Upload, FileSpreadsheet, Eye } from "lucide-react";

const Admin = () => {
  const [uploadStates, setUploadStates] = useState({
    surveillants: false,
    examens: false,
    indisponibilites: false,
    quotas: false
  });

  const handleUpload = (fileType: keyof typeof uploadStates, success: boolean) => {
    setUploadStates(prev => ({
      ...prev,
      [fileType]: success
    }));
  };

  const allUploadsComplete = Object.values(uploadStates).every(state => state === true);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Administration des Surveillances</h1>
          <p className="text-gray-600">Gérez les sessions, importez les données et visualisez les plannings</p>
        </div>

        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sessions" className="flex items-center space-x-2">
              <CalendarDays className="h-4 w-4" />
              <span>Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center space-x-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Templates</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </TabsTrigger>
            <TabsTrigger value="planning" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Planning</span>
            </TabsTrigger>
          </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <SessionSelector />
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <TemplateDownloader />
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Import des Données Excel</CardTitle>
                <CardDescription>
                  Importez vos données à partir des fichiers Excel téléchargés dans l'onglet Templates.
                  Suivez l'ordre recommandé pour éviter les erreurs de référence.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {/* Step 1: Surveillants */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</span>
                      <h3 className="font-medium">Surveillants (Obligatoire en premier)</h3>
                    </div>
                    <ExcelFileUploader
                      title="Import des Surveillants"
                      description="Importez la liste des surveillants avec leurs informations personnelles"
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
                      description="Importez le planning des examens avec salles et contraintes"
                      fileType="examens"
                      expectedFormat={["Date", "Heure début", "Heure fin", "Matière", "Salle", "Nombre surveillants", "Type requis"]}
                      onUpload={(success) => handleUpload('examens', success)}
                      uploaded={uploadStates.examens}
                    />
                  </div>

                  {/* Step 3: Indisponibilités */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">3</span>
                      <h3 className="font-medium">Indisponibilités (Optionnel)</h3>
                    </div>
                    <ExcelFileUploader
                      title="Import des Indisponibilités"
                      description="Importez les périodes d'indisponibilité des surveillants"
                      fileType="indisponibilites"
                      expectedFormat={["Email", "Date début", "Date fin", "Motif"]}
                      onUpload={(success) => handleUpload('indisponibilites', success)}
                      uploaded={uploadStates.indisponibilites}
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
                      description="Modifiez les quotas par défaut pour certains surveillants"
                      fileType="quotas"
                      expectedFormat={["Email", "Quota", "Sessions imposées"]}
                      onUpload={(success) => handleUpload('quotas', success)}
                      uploaded={uploadStates.quotas}
                    />
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border">
                  <h4 className="font-medium text-blue-900 mb-2">État de l'import</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Surveillants</span>
                      <span className={`text-sm px-2 py-1 rounded ${uploadStates.surveillants ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {uploadStates.surveillants ? 'Importé ✓' : 'En attente'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Examens</span>
                      <span className={`text-sm px-2 py-1 rounded ${uploadStates.examens ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {uploadStates.examens ? 'Importé ✓' : 'En attente'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Indisponibilités</span>
                      <span className={`text-sm px-2 py-1 rounded ${uploadStates.indisponibilites ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {uploadStates.indisponibilites ? 'Importé ✓' : 'Optionnel'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Quotas</span>
                      <span className={`text-sm px-2 py-1 rounded ${uploadStates.quotas ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {uploadStates.quotas ? 'Importé ✓' : 'Optionnel'}
                      </span>
                    </div>
                  </div>
                  
                  {allUploadsComplete && (
                    <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded">
                      <p className="text-green-800 text-sm font-medium">
                        🎉 Tous les imports sont terminés ! Vous pouvez maintenant consulter le planning.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Planning Tab */}
          <TabsContent value="planning">
            <NewPlanningView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
