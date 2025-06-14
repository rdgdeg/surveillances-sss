
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type EquipePedagogiqueFormProps = {
  selectedExamen: any;
  ajouterPersonneMutation: any;
  supprimerPersonneMutation: any;
  personnesEquipe: any[];
  setPersonnesEquipe: (arr: any[]) => void;
  nombrePersonnes: number;
  setNombrePersonnes: (n: number) => void;
  handleAjouterPersonnes: () => void;
};

export function EquipePedagogiqueForm({
  selectedExamen,
  ajouterPersonneMutation,
  supprimerPersonneMutation,
  personnesEquipe,
  setPersonnesEquipe,
  nombrePersonnes,
  setNombrePersonnes,
  handleAjouterPersonnes
}: EquipePedagogiqueFormProps) {
  // Optionally: move the logic of growing/shrinking personnesEquipe to here for full decoupling

  useEffect(() => {
    setPersonnesEquipe((arr) => {
      const diff = nombrePersonnes - arr.length;
      if (diff > 0) {
        return [
          ...arr,
          ...Array(diff).fill({ nom: "", prenom: "", email: "", est_assistant: false, compte_dans_quota: true, present_sur_place: true })
        ];
      } else if (diff < 0) {
        return arr.slice(0, nombrePersonnes);
      } else {
        return arr;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombrePersonnes]);

  return (
    <div>
      <h4 className="font-medium mb-3">
        Combien de personnes apportez-vous dans votre équipe pédagogique ?
      </h4>
      <div className="w-52">
        <Input
          type="number"
          min={1}
          max={10}
          value={nombrePersonnes}
          onChange={e => setNombrePersonnes(Math.max(1, parseInt(e.target.value) || 1))}
          className="mb-6"
        />
      </div>
      {Array.from({ length: nombrePersonnes }).map((_, idx) => (
        <div key={idx} className="grid grid-cols-2 gap-4 bg-white rounded-lg mb-2 pb-2 border border-gray-100 px-2">
          <div>
            <Label>Nom *</Label>
            <Input
              value={personnesEquipe[idx]?.nom || ""}
              onChange={e => {
                const v = e.target.value;
                setPersonnesEquipe(arr => arr.map((pers, i) =>
                  i === idx ? { ...pers, nom: v } : pers
                ));
              }}
            />
          </div>
          <div>
            <Label>Prénom *</Label>
            <Input
              value={personnesEquipe[idx]?.prenom || ""}
              onChange={e => {
                const v = e.target.value;
                setPersonnesEquipe(arr => arr.map((pers, i) =>
                  i === idx ? { ...pers, prenom: v } : pers
                ));
              }}
            />
          </div>
          <div className="col-span-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={personnesEquipe[idx]?.email || ""}
              onChange={e => {
                const v = e.target.value;
                setPersonnesEquipe(arr => arr.map((pers, i) =>
                  i === idx ? { ...pers, email: v } : pers
                ));
              }}
            />
          </div>
          <div className="col-span-2 flex flex-wrap gap-6 py-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={!!personnesEquipe[idx]?.est_assistant}
                onCheckedChange={checked =>
                  setPersonnesEquipe(arr => arr.map((pers, i) =>
                    i === idx ? { ...pers, est_assistant: !!checked } : pers
                  ))
                }
              />
              <Label>Assistant SSS</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={!!personnesEquipe[idx]?.present_sur_place}
                onCheckedChange={checked =>
                  setPersonnesEquipe(arr => arr.map((pers, i) =>
                    i === idx ? { ...pers, present_sur_place: !!checked, compte_dans_quota: !!checked } : pers
                  ))
                }
              />
              <Label>Sera présent sur place et assurera la surveillance</Label>
            </div>
          </div>
        </div>
      ))}
      <Button
        onClick={handleAjouterPersonnes}
        className="w-full bg-uclouvain-blue hover:bg-blue-900"
        disabled={ajouterPersonneMutation.isPending}
      >
        <Plus className="mr-2 h-4 w-4" />
        Ajouter
      </Button>
      {selectedExamen.personnes_aidantes && selectedExamen.personnes_aidantes.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Équipe pédagogique</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Quota</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedExamen.personnes_aidantes.map((personne: any) => (
                <TableRow key={personne.id}>
                  <TableCell>{personne.nom}</TableCell>
                  <TableCell>{personne.prenom}</TableCell>
                  <TableCell>
                    <div className="space-x-1">
                      {personne.est_assistant && <span className="px-2 py-1 bg-blue-100 rounded text-blue-800 text-xs">Assistant</span>}
                      {!personne.present_sur_place && <span className="text-xs border rounded px-2 py-1">Absent</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {personne.compte_dans_quota && personne.present_sur_place ? "✓" : "✗"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => supprimerPersonneMutation.mutate(personne.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
