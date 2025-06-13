
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckSquare, Settings, Users, History } from "lucide-react";
import { ExamenCodeUploader } from "./ExamenCodeUploader";
import { ExamenValidationProcessor } from "./ExamenValidationProcessor";
import { ExamenReviewManager } from "./ExamenReviewManager";

export const ExamenAdvancedManager = () => {
  const [activeTab, setActiveTab] = useState("import");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-6 w-6" />
            <span>Gestion Avancée des Examens</span>
          </CardTitle>
          <CardDescription>
            Workflow complet pour l'import, validation et configuration des examens
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>1. Import</span>
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center space-x-2">
            <CheckSquare className="h-4 w-4" />
            <span>2. Validation</span>
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>3. Configuration</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <ExamenCodeUploader />
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h3 className="font-medium">Instructions d'import :</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Préparez un fichier Excel avec les colonnes : Code, Matière, Date, Heure Début, Heure Fin, Salle, Nb Surveillants, Type</li>
                  <li>Les codes d'examens seront classifiés automatiquement (=E pour écrit, =O pour oral, etc.)</li>
                  <li>Les créneaux de surveillance seront générés avec 45 minutes de préparation</li>
                  <li>Les examens oraux (=O) seront automatiquement rejetés</li>
                  <li>Les cas complexes nécessiteront une validation manuelle</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <ExamenValidationProcessor />
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h3 className="font-medium">Processus de validation :</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>Validés automatiquement :</strong> Codes se terminant par "=E" (examens écrits)</li>
                  <li><strong>Rejetés automatiquement :</strong> Codes se terminant par "=O" (examens oraux)</li>
                  <li><strong>Validation manuelle requise :</strong> Codes mixtes (=E+O) ou avec texte supplémentaire</li>
                  <li>Vous pouvez traiter les validations une par une ou en lot</li>
                  <li>Saisissez votre nom pour traçabilité des modifications</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <ExamenReviewManager />
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h3 className="font-medium">Configuration des besoins :</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Ajustez le nombre de surveillants enseignants, amenés et pré-assignés</li>
                  <li>Le calcul automatique des "surveillants à attribuer" se met à jour en temps réel</li>
                  <li>Les contraintes d'auditoires sont prises en compte automatiquement</li>
                  <li>Sauvegardez vos modifications avant de passer à l'attribution</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
