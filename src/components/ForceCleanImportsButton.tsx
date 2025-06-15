
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogHeader, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";

export function ForceCleanImportsButton() {
  const { data: activeSession } = useActiveSession();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const forceCleanMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id) {
        throw new Error("Aucune session active");
      }

      console.log("[ForceCleanImports] Nettoyage forcé pour session:", activeSession.id);

      // Supprimer TOUS les imports temporaires pour cette session
      const { error } = await supabase
        .from("examens_import_temp")
        .delete()
        .eq("session_id", activeSession.id);

      if (error) {
        console.error("[ForceCleanImports] Erreur:", error);
        throw new Error("Impossible de nettoyer les imports temporaires");
      }

      console.log("[ForceCleanImports] Nettoyage terminé");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examens-import-temp"] });
      toast({
        title: "Nettoyage terminé",
        description: "Tous les imports temporaires ont été supprimés. Vous pouvez recommencer l'import.",
        variant: "default"
      });
      setOpen(false);
    },
    onError: (error: any) => {
      console.error("[ForceCleanImports] Mutation error:", error);
      toast({
        title: "Erreur de nettoyage",
        description: error.message || "Impossible de nettoyer les imports",
        variant: "destructive"
      });
    }
  });

  if (!activeSession) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="lg"
          className="bg-red-600 hover:bg-red-700 border-2 border-red-800"
          disabled={forceCleanMutation.isPending}
        >
          <Trash2 className="h-5 w-5 mr-2" />
          FORCER LE VIDAGE COMPLET
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            ⚠️ NETTOYAGE FORCÉ - ACTION IRRÉVERSIBLE
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div className="font-bold text-red-600 text-lg">
              ATTENTION : Cette action va supprimer DÉFINITIVEMENT tous les imports temporaires !
            </div>
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <p className="font-medium">Cette action va :</p>
              <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                <li>Supprimer TOUS les examens importés en attente</li>
                <li>Vider complètement la table des imports temporaires</li>
                <li>Vous permettre de repartir sur une base propre</li>
              </ul>
            </div>
            <div className="font-medium text-gray-900">
              Session concernée : <span className="text-blue-600">"{activeSession.name}"</span>
            </div>
            <div className="font-bold text-red-600">
              Cette action est IRRÉVERSIBLE. Êtes-vous absolument certain ?
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => forceCleanMutation.mutate()}
            disabled={forceCleanMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {forceCleanMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Nettoyage en cours...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                OUI, VIDER TOUT
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
