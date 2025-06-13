
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";

export const DeleteAllExamensButton = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const deleteAllExamensMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id) {
        throw new Error("Aucune session active");
      }

      // D'abord supprimer les attributions liées aux examens
      const { error: attributionsError } = await supabase
        .from('attributions')
        .delete()
        .eq('session_id', activeSession.id);

      if (attributionsError) {
        console.error('Erreur suppression attributions:', attributionsError);
        throw new Error("Erreur lors de la suppression des attributions");
      }

      // Supprimer les validations d'examens
      const { data: examensToDelete } = await supabase
        .from('examens')
        .select('id')
        .eq('session_id', activeSession.id);

      if (examensToDelete && examensToDelete.length > 0) {
        const examenIds = examensToDelete.map(e => e.id);
        
        const { error: validationsError } = await supabase
          .from('examens_validation')
          .delete()
          .in('examen_id', examenIds);

        if (validationsError) {
          console.error('Erreur suppression validations:', validationsError);
          throw new Error("Erreur lors de la suppression des validations");
        }

        // Supprimer les créneaux de surveillance
        const { error: creneauxError } = await supabase
          .from('creneaux_surveillance')
          .delete()
          .in('examen_id', examenIds);

        if (creneauxError) {
          console.error('Erreur suppression créneaux:', creneauxError);
          throw new Error("Erreur lors de la suppression des créneaux");
        }

        // Supprimer les personnes aidantes
        const { error: aidantesError } = await supabase
          .from('personnes_aidantes')
          .delete()
          .in('examen_id', examenIds);

        if (aidantesError) {
          console.error('Erreur suppression personnes aidantes:', aidantesError);
          throw new Error("Erreur lors de la suppression des personnes aidantes");
        }
      }

      // Enfin supprimer les examens
      const { error: examensError } = await supabase
        .from('examens')
        .delete()
        .eq('session_id', activeSession.id);

      if (examensError) {
        console.error('Erreur suppression examens:', examensError);
        throw new Error("Erreur lors de la suppression des examens");
      }

      return { deleted: examensToDelete?.length || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['examens'] });
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      queryClient.invalidateQueries({ queryKey: ['examens-validation'] });
      queryClient.invalidateQueries({ queryKey: ['attributions'] });
      
      toast({
        title: "Suppression réussie",
        description: `${data.deleted} examens et leurs données associées ont été supprimés.`,
      });
      
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de suppression",
        description: error.message || "Impossible de supprimer les examens.",
        variant: "destructive"
      });
    }
  });

  if (!activeSession) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          className="bg-red-600 hover:bg-red-700"
          disabled={deleteAllExamensMutation.isPending}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer tous les examens
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p className="font-medium text-red-600">
              Attention : Cette action est irréversible !
            </p>
            <p>
              Vous êtes sur le point de supprimer TOUS les examens de la session "{activeSession.name}" ainsi que :
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Toutes les attributions de surveillance</li>
              <li>Toutes les validations d'examens</li>
              <li>Tous les créneaux de surveillance</li>
              <li>Toutes les personnes aidantes</li>
            </ul>
            <p className="font-medium">
              Êtes-vous absolument certain de vouloir continuer ?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteAllExamensMutation.mutate()}
            disabled={deleteAllExamensMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteAllExamensMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Oui, supprimer tout
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
