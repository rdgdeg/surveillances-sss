
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useExamenMutations } from "@/hooks/useExamenMutations";

interface EnseignantInfosEditModalProps {
  examen: any;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}
export function EnseignantInfosEditModal({ examen, open, onClose, onSaved }: EnseignantInfosEditModalProps) {
  const [enseignantPresent, setEnseignantPresent] = useState(
    examen.surveillants_enseignant === null ? "" : examen.surveillants_enseignant > 0 ? "oui" : "non"
  );
  const [personnesAmenees, setPersonnesAmenees] = useState(
    examen.surveillants_amenes ?? 0
  );
  const [nomEnseignant, setNomEnseignant] = useState(examen.enseignant_nom ?? "");
  const [loading, setLoading] = useState(false);

  const { updateEnseignantPresenceMutation } = useExamenMutations({
    onPersonneAdded: () => {
      setLoading(false);
      onSaved?.();
      onClose();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    updateEnseignantPresenceMutation.mutate({
      examenId: examen.id,
      enseignantPresent: enseignantPresent === "oui",
      nomEnseignant: nomEnseignant,
      personnesAmenees: Number(personnesAmenees)
    }, {
      onSettled: () => {
        setLoading(false);
        onSaved?.();
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier les informations renseignées</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label>
            Nom de l’enseignant (modification si besoin)
            <Input value={nomEnseignant} onChange={e => setNomEnseignant(e.target.value)} />
          </label>
          <label>
            L’enseignant sera-t-il présent ?
            <select
              className="border rounded px-2 py-1 mt-1 w-full"
              value={enseignantPresent}
              onChange={e => setEnseignantPresent(e.target.value)}
              required
            >
              <option value="">Sélectionner…</option>
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
          </label>
          <label>
            Nombre de personnes apportées (hors enseignant)
            <Input
              type="number"
              min={0}
              value={personnesAmenees}
              onChange={e => setPersonnesAmenees(e.target.value)}
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={loading}>Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
