
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { PlanningGeneral } from "./PlanningGeneral";
import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";

export const PlanningGeneralProtected = () => {
  const { data: activeSession } = useActiveSession();

  const { data: isVisible, isLoading } = useQuery({
    queryKey: ['planning-general-visibility', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return false;
      
      const { data, error } = await supabase
        .from('sessions')
        .select('planning_general_visible')
        .eq('id', activeSession.id)
        .single();
      
      if (error) return false;
      return data.planning_general_visible || false;
    },
    enabled: !!activeSession?.id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uclouvain-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">Vérification de la disponibilité...</p>
        </div>
      </div>
    );
  }

  if (!isVisible) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Planning non disponible
            </h1>
            <p className="text-gray-600">
              Le planning général des examens n'est pas encore disponible. 
              Veuillez réessayer plus tard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PlanningGeneral />;
};
