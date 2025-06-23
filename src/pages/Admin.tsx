
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanningGeneralVisibilityControl } from "@/components/PlanningGeneralVisibilityControl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";
import { SurveillantUnifiedManager } from "@/components/SurveillantUnifiedManager";
import { AdminSidebar } from "@/components/AdminSidebar";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("surveillants");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      <UCLouvainHeader />
      <div className="flex flex-1 w-full">
        <AdminSidebar />
        <main className="flex-1 w-full">
          <div className="container mx-auto py-10">
            <Tabs defaultValue={activeTab} className="w-full" onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="surveillants">Surveillants</TabsTrigger>
                <TabsTrigger value="planning">Planning</TabsTrigger>
              </TabsList>
              
              <TabsContent value="surveillants" className="space-y-6">
                {activeTab === "surveillants" && (
                  <div className="space-y-6">
                    <SurveillantUnifiedManager />
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
    </div>
  );
};

export default Admin;
