
import { useState, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ExamenEditModalProps {
  examen: any;
  open: boolean;
  onClose: () => void;
  onSaved?: (updated: any) => void;
  faculteOptions: { value: string, label: string }[];
}

export function ExamenEditModal({ examen, open, onClose, onSaved, faculteOptions }: ExamenEditModalProps) {
  const [fields, setFields] = useState(() => ({
    matiere: examen.matiere ?? "",
    code_examen: examen.code_examen ?? "",
    date_examen: examen.date_examen ?? "",
    heure_debut: examen.heure_debut ?? "",
    heure_fin: examen.heure_fin ?? "",
    salle: examen.salle ?? "",
    faculte: examen.faculte ?? "",
  }));
  const [loading, setLoading] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLSelectElement>) {
    setFields(f => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSave() {
    setLoading(true);
    const { error, data } = await supabase
      .from("examens")
      .update({
        matiere: fields.matiere,
        code_examen: fields.code_examen,
        date_examen: fields.date_examen,
        heure_debut: fields.heure_debut,
        heure_fin: fields.heure_fin,
        salle: fields.salle,
        faculte: fields.faculte,
      })
      .eq("id", examen.id)
      .select()
      .maybeSingle();

    setLoading(false);
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Examen modifié", description: "Les informations ont été enregistrées." });
    onSaved?.(data);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l’examen</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <label>
            Libellé/Matière
            <Input name="matiere" value={fields.matiere} onChange={handleChange} />
          </label>
          <label>
            Code examen
            <Input name="code_examen" value={fields.code_examen} onChange={handleChange} />
          </label>
          <label>
            Date
            <Input
              type="date"
              name="date_examen"
              value={fields.date_examen ? format(new Date(fields.date_examen), "yyyy-MM-dd") : ""}
              onChange={handleChange}
            />
          </label>
          <div className="flex gap-2">
            <label className="flex-1">
              Heure début
              <Input type="time" name="heure_debut" value={fields.heure_debut} onChange={handleChange} />
            </label>
            <label className="flex-1">
              Heure fin
              <Input type="time" name="heure_fin" value={fields.heure_fin} onChange={handleChange} />
            </label>
          </div>
          <label>
            Auditoire(s)
            <Input name="salle" value={fields.salle} onChange={handleChange} />
          </label>
          <label>
            Faculté
            <select
              name="faculte"
              value={fields.faculte}
              onChange={handleChange}
              className="border rounded px-2 py-1 mt-1 w-full"
            >
              <option value="">Sélectionnez une faculté</option>
              {faculteOptions.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="secondary">Annuler</Button>
          <Button onClick={handleSave} disabled={loading}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
