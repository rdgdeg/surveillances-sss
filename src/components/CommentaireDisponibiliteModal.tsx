
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CommentaireDisponibiliteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  surveillantId?: string;
  email: string;
  nom: string;
  prenom: string;
}

export const CommentaireDisponibiliteModal = ({
  isOpen,
  onClose,
  sessionId,
  surveillantId,
  email,
  nom,
  prenom
}: CommentaireDisponibiliteModalProps) => {
  const [message, setMessage] = useState('');

  const envoyerCommentaireMutation = useMutation({
    mutationFn: async (commentaire: string) => {
      const { error } = await supabase
        .from('commentaires_disponibilites')
        .insert({
          session_id: sessionId,
          surveillant_id: surveillantId,
          email,
          nom,
          prenom,
          message: commentaire
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Commentaire envoyé",
        description: "Votre commentaire a été transmis à l'administration.",
      });
      setMessage('');
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le commentaire.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        title: "Message requis",
        description: "Veuillez saisir votre commentaire.",
        variant: "destructive"
      });
      return;
    }

    envoyerCommentaireMutation.mutate(message.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Laisser un commentaire</span>
          </DialogTitle>
          <DialogDescription>
            Vous pouvez nous faire part de remarques ou demandes particulières concernant vos disponibilités.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrivez votre commentaire ici..."
              rows={4}
              className="resize-none"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={envoyerCommentaireMutation.isPending}
            >
              {envoyerCommentaireMutation.isPending ? "Envoi..." : "Envoyer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
