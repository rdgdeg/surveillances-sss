import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, X, Phone, Edit } from "lucide-react";

interface EditableGSMCellProps {
  surveillantId: string;
  currentGSM: string | null;
  nom: string;
  prenom: string;
}

export const EditableGSMCell = ({ surveillantId, currentGSM, nom, prenom }: EditableGSMCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newGSM, setNewGSM] = useState(currentGSM || "");
  const queryClient = useQueryClient();

  const updateGSMMutation = useMutation({
    mutationFn: async (gsm: string | null) => {
      const { data, error } = await supabase
        .from('surveillants')
        .update({ telephone_gsm: gsm || null })
        .eq('id', surveillantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillants-paginated'] });
      setIsEditing(false);
      toast({
        title: "GSM mis à jour",
        description: `Le numéro GSM de ${prenom} ${nom} a été mis à jour.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le GSM.",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    const cleanGSM = newGSM.trim();
    updateGSMMutation.mutate(cleanGSM || null);
  };

  const handleCancel = () => {
    setNewGSM(currentGSM || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center space-x-1 min-w-[200px]">
        <Input
          value={newGSM}
          onChange={(e) => setNewGSM(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="+32..."
          className="h-8 text-sm"
          autoFocus
          disabled={updateGSMMutation.isPending}
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateGSMMutation.isPending}
          className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={updateGSMMutation.isPending}
          className="h-8 w-8 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 min-w-[120px] group">
      <div className="flex items-center space-x-1 flex-1">
        {currentGSM ? (
          <>
            <Phone className="h-3 w-3 text-gray-400" />
            <span className="text-sm">{currentGSM}</span>
          </>
        ) : (
          <span className="text-sm text-gray-400 italic">Non renseigné</span>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Modifier le GSM"
      >
        <Edit className="h-3 w-3" />
      </Button>
    </div>
  );
};