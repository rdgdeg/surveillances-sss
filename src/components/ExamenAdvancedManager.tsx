import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckSquare, Settings, Users, List } from "lucide-react";
import { StandardExcelImporter } from "./StandardExcelImporter";
import { ExamenValidationProcessor } from "./ExamenValidationProcessor";
import { ExamenReviewManager } from "./ExamenReviewManager";
import ExamenListeComplete from "./ExamenListeComplete";
import { DeleteAllExamensButton } from "./DeleteAllExamensButton";

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

      {/* Bouton suppression ajouté ici, visible sur tous les onglets */}
      <DeleteAllExamensButton />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>1. Import Standard</span>
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center space-x-2">
            <CheckSquare className="h-4 w-4" />
            <span>2. Validation</span>
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>3. Configuration</span>
          </TabsTrigger>
          <TabsTrigger value="liste" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>Liste complète</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="import" className="space-y-4">
          <StandardExcelImporter />
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h3 className="font-medium">Import Excel Standardisé :</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Utilisez le fichier Excel standardisé fourni par le secrétariat</li>
                  <li>Format : Jour | Durée | Début | Fin | Activité | Code | Auditoires | Étudiants | Enseignants</li>
                  <li>Les codes d'examens sont extraits de la colonne "Activité" (ex: WDENT2152=E)</li>
                  <li>Les auditoires multiples sont automatiquement séparés (ex: "51 A, 51 B, 51 C" → 3 examens)</li>
                  <li>Classification automatique : =E (écrit) validé, =O (oral) rejeté, autres nécessitent validation</li>
                  <li>Calcul automatique du nombre de surveillants selon le nombre d'étudiants</li>
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
                <h3 className="font-medium">Processus de validation amélioré :</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>Validés automatiquement :</strong> Codes se terminant par "=E" (examens écrits)</li>
                  <li><strong>Rejetés automatiquement :</strong> Codes se terminant par "=O" (examens oraux)</li>
                  <li><strong>Validation manuelle requise :</strong> Codes mixtes (=E+O) ou avec texte supplémentaire</li>
                  <li>Actions en lot pour traiter plusieurs examens similaires</li>
                  <li>Historique complet des validations avec nom du validateur</li>
                  <li>Filtrage par statut pour se concentrer sur les cas à traiter</li>
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
                <h3 className="font-medium">Configuration par auditoire :</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Vue détaillée par examen et auditoire séparé</li>
                  <li>Ajustement des besoins : surveillants enseignants, amenés et pré-assignés</li>
                  <li>Calcul automatique des "surveillants à attribuer" selon les contraintes d'auditoires</li>
                  <li>Gestion des personnes aidantes par examen spécifique</li>
                  <li>Application automatique des contraintes de salles existantes</li>
                  <li>Validation enseignant avec tokens personnalisés</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liste" className="space-y-4">
          <ExamenListeComplete />
        </TabsContent>
      </Tabs>
    </div>
  );
};
