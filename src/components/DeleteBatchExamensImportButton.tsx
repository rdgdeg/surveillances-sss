
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogHeader, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Props = {
  batchId: string;
  disabled?: boolean;
};

export function DeleteBatchExamensImportButton({ batchId, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteBatchMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("examens_import_temp")
        .delete()
        .eq("import_batch_id", batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examens-import-temp"] });
      toast({
        title: "Suppression réussie",
        description: "Tous les examens importés lors de ce batch ont été supprimés.",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer ce batch.",
        variant: "destructive"
      });
    }
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive"
          size="sm"
          className="bg-red-600 hover:bg-red-700"
          disabled={disabled || deleteBatchMutation.isPending}
        >
          <Trash className="w-4 h-4 mr-1" />
          Supprimer tous les examens importés
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer tous les examens importés</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer <b>toutes les lignes importées lors de ce batch</b> ?<br />
            Cette action est <span className="text-red-600 font-semibold">irréversible</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteBatchMutation.mutate()}
            disabled={deleteBatchMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteBatchMutation.isPending ? "Suppression..." : "Oui, supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
