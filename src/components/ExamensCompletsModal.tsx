
import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogHeader, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ExamenInfo {
  id: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  salle: string;
  surveillants_a_attribuer?: number;
  attributions_count?: number;
}

interface ExamensCompletsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examens: ExamenInfo[];
}

export function ExamensCompletsModal({ open, onOpenChange, examens }: ExamensCompletsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Examens complets</DialogTitle>
          <DialogDescription>
            Liste des examens pour lesquels tous les surveillants nécessaires sont attribués.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {examens.length === 0 && (
            <div className="text-sm text-muted-foreground">Aucun examen complet pour le moment.</div>
          )}
          {examens.map((examen) => (
            <div key={examen.id} className="border rounded p-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-muted/40">
              <div className="space-y-1">
                <span className="font-semibold">{examen.matiere}</span>{" "}
                <span className="text-xs text-muted-foreground">[{examen.salle}]</span>
                <div className="text-xs">
                  {examen.date_examen} &nbsp;
                  {examen.heure_debut} - {examen.heure_fin}
                </div>
              </div>
              <div>
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                  {examen.attributions_count ?? 0}/{examen.surveillants_a_attribuer ?? 0} surveillants
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <DialogClose asChild>
          <button className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Fermer</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
