
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, MessageSquare } from "lucide-react";
import { Session } from "@/hooks/useSessions";

interface ModificationRequestFormProps {
  email: string;
  selectedSession: Session;
  onSuccess: () => void;
}

export const ModificationRequestForm = ({ email, selectedSession, onSuccess }: ModificationRequestFormProps) => {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [message, setMessage] = useState('');

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('demandes_modification_disponibilites')
        .insert({
          email: email.trim().toLowerCase(),
          nom,
          prenom,
          session_id: selectedSession.id,
          message
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Demande envoyée",
        description: "Votre demande de modification a été transmise. Vous recevrez une réponse par email.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !message.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }
    submitRequestMutation.mutate();
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-6 w-6" />
          <span>Demande de modification de disponibilités</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Session :</strong> {selectedSession.name}<br />
              <strong>Email :</strong> {email}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Votre nom"
                  required
                />
              </div>
              <div>
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Votre prénom"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="message">Votre demande *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Décrivez les modifications que vous souhaitez apporter à vos disponibilités..."
                rows={4}
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                Précisez quels créneaux vous souhaitez ajouter, supprimer ou modifier.
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={submitRequestMutation.isPending}
                size="lg"
                className="px-8"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitRequestMutation.isPending ? 'Envoi en cours...' : 'Envoyer la demande'}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};
