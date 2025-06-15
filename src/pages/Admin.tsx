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
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

// Ajoute la vue admin pour le suivi des disponibilités (en bas ou rubrique dédiée)
export default function AdminPage() {
  // On peut à terme faire que l'onglet actif se base sur l'URL/search param etc.
  const [activeTab, setActiveTab] = useState("sessions");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 bg-gray-50 p-5">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Administration</h1>
            <p className="mb-6">
              Gérez toutes les fonctions d’administration : sessions, examens, surveillants, candidatures, validations, statistiques...
            </p>
            {/* À brancher tes vues selon activeTab ou URL */}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
