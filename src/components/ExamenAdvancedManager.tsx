
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckSquare, Settings, Users, List, AlertTriangle } from "lucide-react";
import { StandardExcelImporter } from "./StandardExcelImporter";
import { ExamenValidationProcessor } from "./ExamenValidationProcessor";
import { ExamenReviewManager } from "./ExamenReviewManager";
import ExamenListeComplete from "./ExamenListeComplete";
import { DeleteAllExamensButton } from "./DeleteAllExamensButton";
import { ExamensImportPermissif } from "./ExamensImportPermissif";
import { ExamensImportRevision } from "./ExamensImportRevision";
import { ExamenErrorsOnlyView } from "./ExamenErrorsOnlyView";
import { ForceCleanImportsButton } from "./ForceCleanImportsButton";
import { ExamenValidationFinalView } from "./ExamenValidationFinalView";

export const ExamenAdvancedManager = () => {
  const [activeTab, setActiveTab] = useState("import");
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-6 w-6" />
            <span>Gestion Avancée des Examens</span>
          </CardTitle>
          <CardDescription>
            Workflow complet pour l'import, révision/correction puis validation des examens
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="flex gap-4">
        <DeleteAllExamensButton />
        <ForceCleanImportsButton />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>1. Import brut</span>
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>2. Erreurs</span>
          </TabsTrigger>
          <TabsTrigger value="revision" className="flex items-center space-x-2">
            <CheckSquare className="h-4 w-4" />
            <span>3. Révision</span>
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>4. Validation finale</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="import" className="space-y-4">
          <ExamensImportPermissif onImportComplete={batchId => {
            setLastBatchId(batchId);
            setActiveTab("errors");
          }} />
        </TabsContent>
        <TabsContent value="errors" className="space-y-4">
          <ExamenErrorsOnlyView batchId={lastBatchId || undefined} />
        </TabsContent>
        <TabsContent value="revision" className="space-y-4">
          <ExamensImportRevision batchId={lastBatchId || undefined} />
        </TabsContent>
        <TabsContent value="validation" className="space-y-4">
          <ExamenValidationFinalView />
        </TabsContent>
      </Tabs>
    </div>
  );
};
