
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DemandeModificationModalProps {
  open: boolean;
  onClose: () => void;
  surveillantId: string;
  email: string;
}

export function DemandeModificationModal({ open, onClose, surveillantId, email }: DemandeModificationModalProps) {
  const [typeModif, setTypeModif] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    setIsSending(true);
    const { error } = await supabase
      .from('demandes_modification_info')
      .insert({
        surveillant_id: surveillantId,
        type_modif: typeModif,
        commentaire,
      });
    setIsSending(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Envoyé", description: "Votre demande a bien été transmise." });
      setTypeModif("");
      setCommentaire("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander une modification</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label className="block font-medium">Type de modification</label>
          <Input
            placeholder="ex: Quota, Numéro de téléphone, Statut…"
            value={typeModif}
            onChange={e => setTypeModif(e.target.value)}
          />
          <label className="block font-medium mt-2">Détail ou justification</label>
          <Textarea
            placeholder="Détaillez votre demande"
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSending || !typeModif || !commentaire}>
            Envoyer la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
