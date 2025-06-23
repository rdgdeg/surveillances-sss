
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanningGeneralVisibilityControl } from "@/components/PlanningGeneralVisibilityControl";
import { SurveillantObligationsManager } from "@/components/SurveillantObligationsManager";
import { SurveillantAdvancedManager } from "@/components/SurveillantAdvancedManager";
import { SurveillantTableManager } from "@/components/SurveillantTableManager";
import { NewFileUploader } from "@/components/NewFileUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      <UCLouvainHeader />
      <main className="flex-1 w-full">
        <div className="container mx-auto py-10">
          <Tabs defaultValue={activeTab} className="w-[90vw] lg:w-[80vw]" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="surveillants">Surveillants</TabsTrigger>
              <TabsTrigger value="planning">Planning</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Administration - Vue d'ensemble</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Bienvenue dans l'interface d'administration. Utilisez les onglets ci-dessus pour naviguer entre les différentes sections.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="surveillants" className="space-y-6">
              {activeTab === "surveillants" && (
                <div className="space-y-6">
                  <NewFileUploader />
                  <SurveillantTableManager />
                  <SurveillantAdvancedManager />
                  <SurveillantObligationsManager />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="planning" className="space-y-6">
              {activeTab === "planning" && (
                <div className="space-y-6">
                  <PlanningGeneralVisibilityControl />
                  <Card>
                    <CardHeader>
                      <CardTitle>Gestion du Planning</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        La section de gestion du planning sera disponible prochainement.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Admin;
