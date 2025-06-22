import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "@/components/admin/Overview";
import { ExamensAdmin } from "@/components/admin/ExamensAdmin";
import { SurveillantsAdmin } from "@/components/admin/SurveillantsAdmin";
import { PlanningAdmin } from "@/components/admin/PlanningAdmin";
import { ImportCodesExamens } from "@/components/admin/ImportCodesExamens";
import { CandidaturesAdmin } from "@/components/admin/CandidaturesAdmin";
import { ContraintesSallesAdmin } from "@/components/admin/ContraintesSallesAdmin";
import { FeatureLocksAdmin } from "@/components/admin/FeatureLocksAdmin";
import { HistoriqueAdmin } from "@/components/admin/HistoriqueAdmin";
import { DonneesSensiblesAdmin } from "@/components/admin/DonneesSensiblesAdmin";
import { TokensEnseignantsAdmin } from "@/components/admin/TokensEnseignantsAdmin";
import { SuiviConfirmationsEnseignants } from "@/components/admin/SuiviConfirmationsEnseignants";
import { ControleVerificationsAdmin } from "@/components/admin/ControleVerificationsAdmin";
import { EnseignantView } from "@/components/admin/EnseignantView";
import { PreAssignationsAdmin } from "@/components/admin/PreAssignationsAdmin";
import { SurveillantAdvancedManager } from "@/components/admin/SurveillantAdvancedManager";
import { NewPlanningView } from "@/components/admin/NewPlanningView";

import { PlanningGeneralVisibilityControl } from "@/components/PlanningGeneralVisibilityControl";
import { SurveillantObligationsManager } from "@/components/SurveillantObligationsManager";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="container mx-auto py-10">
      <Tabs defaultValue={activeTab} className="w-[90vw] lg:w-[80vw]" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="examens">Examens</TabsTrigger>
          <TabsTrigger value="surveillants">Surveillants</TabsTrigger>
          <TabsTrigger value="pre-assignations">Pré-assignations</TabsTrigger>
          <TabsTrigger value="candidatures">Candidatures</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="import-codes">Import Codes</TabsTrigger>
          <TabsTrigger value="contraintes">Contraintes</TabsTrigger>
          <TabsTrigger value="feature-locks">Verrouillages</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
          <TabsTrigger value="donnees-sensibles">Données Sensibles</TabsTrigger>
          <TabsTrigger value="tokens-enseignants">Tokens Enseignants</TabsTrigger>
          <TabsTrigger value="suivi-confirm-enseignants">Suivi Confirmations</TabsTrigger>
          <TabsTrigger value="controles-verifications">Contrôles</TabsTrigger>
          <TabsTrigger value="enseignant-view">Vue Enseignant</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <Overview />
        </TabsContent>
        <TabsContent value="examens" className="space-y-6">
          <ExamensAdmin />
        </TabsContent>
        <TabsContent value="surveillants" className="space-y-6">
          {activeTab === "surveillants" && (
            <div className="space-y-6">
              <SurveillantAdvancedManager />
              <SurveillantObligationsManager />
            </div>
          )}
        </TabsContent>
        <TabsContent value="pre-assignations" className="space-y-6">
          <PreAssignationsAdmin />
        </TabsContent>
        <TabsContent value="candidatures" className="space-y-6">
          <CandidaturesAdmin />
        </TabsContent>
        <TabsContent value="planning" className="space-y-6">
          {activeTab === "planning" && (
            <div className="space-y-6">
              <PlanningGeneralVisibilityControl />
              <NewPlanningView />
            </div>
          )}
        </TabsContent>
        <TabsContent value="import-codes" className="space-y-6">
          <ImportCodesExamens />
        </TabsContent>
        <TabsContent value="contraintes" className="space-y-6">
          <ContraintesSallesAdmin />
        </TabsContent>
        <TabsContent value="feature-locks" className="space-y-6">
          <FeatureLocksAdmin />
        </TabsContent>
        <TabsContent value="historique" className="space-y-6">
          <HistoriqueAdmin />
        </TabsContent>
        <TabsContent value="donnees-sensibles" className="space-y-6">
          <DonneesSensiblesAdmin />
        </TabsContent>
        <TabsContent value="tokens-enseignants" className="space-y-6">
          <TokensEnseignantsAdmin />
        </TabsContent>
        <TabsContent value="suivi-confirm-enseignants" className="space-y-6">
          <SuiviConfirmationsEnseignants />
        </TabsContent>
        <TabsContent value="controles-verifications" className="space-y-6">
          <ControleVerificationsAdmin />
        </TabsContent>
         <TabsContent value="enseignant-view" className="space-y-6">
          <EnseignantView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
