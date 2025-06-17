
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CheckCircle, AlertTriangle, Settings, Database } from "lucide-react";
import { ExamenCoverageVerification } from "./ExamenCoverageVerification";
import { FeatureLockManager } from "./FeatureLockManager";
import { DataConsistencyChecker } from "./DataConsistencyChecker";

export const ControlesVerificationsManager = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Contrôles et Vérifications</span>
          </CardTitle>
          <CardDescription>
            Centre de contrôle qualité et de vérification de l'intégrité des données
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="coverage" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="coverage" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Couverture Examens</span>
          </TabsTrigger>
          <TabsTrigger value="data-integrity" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Intégrité Données</span>
          </TabsTrigger>
          <TabsTrigger value="feature-locks" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Verrouillages</span>
          </TabsTrigger>
          <TabsTrigger value="quality-checks" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Contrôles Qualité</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coverage" className="space-y-6">
          <ExamenCoverageVerification />
        </TabsContent>

        <TabsContent value="data-integrity" className="space-y-6">
          <DataConsistencyChecker />
        </TabsContent>

        <TabsContent value="feature-locks" className="space-y-6">
          <FeatureLockManager />
        </TabsContent>

        <TabsContent value="quality-checks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Contrôles Qualité</span>
              </CardTitle>
              <CardDescription>
                Contrôles supplémentaires de qualité des données (à développer)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Contrôles qualité supplémentaires à implémenter :</p>
                <ul className="mt-2 text-sm space-y-1">
                  <li>• Validation des horaires d'examens</li>
                  <li>• Contrôle des conflits de salles</li>
                  <li>• Vérification des quotas de surveillance</li>
                  <li>• Détection des anomalies dans les assignations</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
