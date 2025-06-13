
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface SurveillantCreationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SurveillantCreationForm = ({ open, onOpenChange }: SurveillantCreationFormProps) => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    type: "",
    telephone_gsm: "",
    faculte_interdite: "",
    affectation_fac: "",
    campus: ""
  });

  const createSurveillant = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id) {
        throw new Error("Aucune session active");
      }

      // Créer le surveillant
      const { data: surveillant, error: surveillantError } = await supabase
        .from('surveillants')
        .insert({
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          type: formData.type,
          telephone_gsm: formData.telephone_gsm || null,
          faculte_interdite: formData.faculte_interdite || null,
          affectation_fac: formData.affectation_fac || null,
          campus: formData.campus || null,
          eft: 1.0,
          is_active: true
        })
        .select()
        .single();

      if (surveillantError) throw surveillantError;

      // Associer le surveillant à la session
      const { error: sessionError } = await supabase
        .from('surveillant_sessions')
        .insert({
          surveillant_id: surveillant.id,
          session_id: activeSession.id,
          is_active: true
        });

      if (sessionError) throw sessionError;

      return surveillant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillants'] });
      setFormData({
        nom: "",
        prenom: "",
        email: "",
        type: "",
        telephone_gsm: "",
        faculte_interdite: "",
        affectation_fac: "",
        campus: ""
      });
      onOpenChange(false);
      toast({
        title: "Surveillant créé",
        description: "Le nouveau surveillant a été ajouté avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le surveillant.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.prenom || !formData.email || !formData.type) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }
    createSurveillant.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau surveillant</DialogTitle>
          <DialogDescription>
            Saisissez les informations du nouveau surveillant. Les champs marqués d'un * sont obligatoires.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Type *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Académique">Académique</SelectItem>
                <SelectItem value="PATGS">PATGS</SelectItem>
                <SelectItem value="Externe">Externe</SelectItem>
                <SelectItem value="Étudiant">Étudiant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="telephone_gsm">Téléphone GSM</Label>
            <Input
              id="telephone_gsm"
              value={formData.telephone_gsm}
              onChange={(e) => setFormData({ ...formData, telephone_gsm: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="faculte_interdite">Faculté interdite</Label>
            <Input
              id="faculte_interdite"
              value={formData.faculte_interdite}
              onChange={(e) => setFormData({ ...formData, faculte_interdite: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="affectation_fac">Affectation faculté</Label>
            <Input
              id="affectation_fac"
              value={formData.affectation_fac}
              onChange={(e) => setFormData({ ...formData, affectation_fac: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="campus">Campus</Label>
            <Select value={formData.campus} onValueChange={(value) => setFormData({ ...formData, campus: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le campus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Solbosch">Solbosch</SelectItem>
                <SelectItem value="Plaine">Plaine</SelectItem>
                <SelectItem value="Erasme">Erasme</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createSurveillant.isPending}>
              {createSurveillant.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
