
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SimpleSurveillantManager } from "./SimpleSurveillantManager";
import { NewFileUploader } from "./NewFileUploader";
import { Button } from "@/components/ui/button";
import { Users, FileSpreadsheet, BadgeEuro, ArrowRight, ListChecks, CheckSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const surveillantTemplateColumns = [
  "nom", "prenom", "email", "type", "faculte_interdite", "eft", "affectation_fac", "date_fin_contrat", "telephone_gsm", "campus"
];

export const SurveillantWorkflowManager = () => {
  const [uploadSuccess, setUploadSuccess] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestion complète des surveillants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ajout" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="ajout">Ajout manuel</TabsTrigger>
              <TabsTrigger value="import">Import en masse (Excel/CSV)</TabsTrigger>
              <TabsTrigger value="attribution" disabled>
                Attribution automatique
              </TabsTrigger>
              <TabsTrigger value="pre-attributions" disabled>
                Pré-attributions
              </TabsTrigger>
              <TabsTrigger value="liste">Liste & Statut</TabsTrigger>
            </TabsList>

            <TabsContent value="ajout" className="pt-2">
              <div className="max-w-xl mx-auto">
                <p className="mb-4 text-gray-600">
                  Ajoutez un surveillant à la main. Un contrôle est effectué sur base de l’email pour éviter un doublon.
                </p>
                <SimpleSurveillantManager />
              </div>
            </TabsContent>

            <TabsContent value="import" className="pt-2">
              <div className="max-w-xl mx-auto space-y-3">
                <p className="text-gray-600">
                  Chargez un fichier CSV/Excel pour ajouter ou mettre à jour plusieurs surveillants.
                  Un contrôle automatique des emails évite la création de doublons, et met à jour les profils existants.
                </p>
                <NewFileUploader
                  title="Import massique surveillants"
                  description="Ajoutez ou mettez à jour en masse vos surveillants grâce à un template Excel/CSV."
                  fileType="surveillants"
                  expectedFormat={surveillantTemplateColumns}
                  onUpload={setUploadSuccess}
                  uploaded={uploadSuccess}
                />
              </div>
            </TabsContent>

            <TabsContent value="attribution" className="pt-2">
              <div className="flex items-center gap-3 bg-blue-50 px-4 py-3 rounded">
                <BadgeEuro className="h-5 w-5 text-blue-600" />
                <div>
                  <span className="text-blue-800 font-medium">⚡ Attribution automatique</span>
                  <p className="text-blue-700 text-xs">Alimentez l’algorithme d’attribution automatique une fois tous vos surveillants en place.</p>
                  <Button variant="outline" size="sm" className="mt-2" disabled>
                    À venir
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="pre-attributions" className="pt-2">
              <div className="flex items-center gap-3 bg-green-50 px-4 py-3 rounded">
                <ListChecks className="h-5 w-5 text-green-600" />
                <div>
                  <span className="text-green-900 font-medium">Pré-attributions</span>
                  <p className="text-green-800 text-xs">Encodez ou validez les surveillances obligatoires (pré-attributions).</p>
                  <Button variant="outline" size="sm" className="mt-2" disabled>
                    À venir
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="liste" className="pt-2">
              <SimpleSurveillantManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
