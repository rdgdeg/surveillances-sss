
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
// import { Calendar, Clock, Users, Download, Upload } from "lucide-react";

// Ces imports sont désactivés à cause des erreurs de build:
// import { SessionManager } from "@/components/SessionManager";
// import { ExamensImport } from "@/components/ExamensImport";
// import { ExamenReviewManager } from "@/components/ExamenReviewManager";
// import { AvailabilityMatrix } from "@/components/AvailabilityMatrix";
// import { CandidaturesManager } from "@/components/CandidaturesManager";
// import { SurveillantsImport } from "@/components/SurveillantsImport";
// import { SurveillantsManager } from "@/components/SurveillantsManager";
// import { ContraintesAuditoiresManager } from "@/components/ContraintesAuditoiresManager";
// import { ExamensExport } from "@/components/ExamensExport";
// import { ExamenValidationProcessor } from "@/components/ExamenValidationProcessor";

import { SuiviDisponibilitesAdmin } from "@/components/SuiviDisponibilitesAdmin";

// Ajoute la vue admin pour le suivi des disponibilités (en bas ou rubrique dédiée)
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("sessions");

  return (
    <div>
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Administration</CardTitle>
            <CardDescription>Gérez les sessions, les examens et les surveillants.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4 mb-6">
              <Button
                variant={activeTab === "sessions" ? "default" : "outline"}
                onClick={() => setActiveTab("sessions")}
              >
                Sessions
              </Button>
              <Button
                variant={activeTab === "examens" ? "default" : "outline"}
                onClick={() => setActiveTab("examens")}
              >
                Examens
              </Button>
              <Button
                variant={activeTab === "surveillants" ? "default" : "outline"}
                onClick={() => setActiveTab("surveillants")}
              >
                Surveillants
              </Button>
              <Button
                variant={activeTab === "candidatures" ? "default" : "outline"}
                onClick={() => setActiveTab("candidatures")}
              >
                Candidatures
              </Button>
              <Button
                variant={activeTab === "disponibilites" ? "default" : "outline"}
                onClick={() => setActiveTab("disponibilites")}
              >
                Disponibilités
              </Button>
              <Button
                variant={activeTab === "validations" ? "default" : "outline"}
                onClick={() => setActiveTab("validations")}
              >
                Validations
              </Button>
            </div>
            <p>
              Certaines fonctionnalités avancées sont momentanément désactivées en attendant la mise à disposition des composants nécessaires.
            </p>
            {/* Les logiques/exports restants sont désactivés temporairement */}
          </CardContent>
        </Card>
      </div>
      <SuiviDisponibilitesAdmin />
    </div>
  );
}
