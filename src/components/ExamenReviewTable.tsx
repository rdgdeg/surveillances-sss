
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Check, ClipboardList } from "lucide-react";
import { formatDateWithDayBelgian } from "@/lib/dateUtils";
import { ExamenGroupe, ContrainteAuditoire } from "@/utils/examenReviewUtils";

interface ExamenReviewTableProps {
  examens: ExamenGroupe[];
  selectedGroupes: Set<string>;
  editingExamens: Record<string, Partial<ExamenGroupe>>;
  contraintes: ContrainteAuditoire[];
  onSelectGroupe: (groupeKey: string, selected: boolean) => void;
  onFieldChange: (groupeKey: string, field: string, value: string | number) => void;
  onSaveGroupe: (groupe: ExamenGroupe) => void;
  onValidateGroupe: (groupe: ExamenGroupe) => void;
  isSaving: boolean;
  isValidating: boolean;
  getFieldValue: (groupe: ExamenGroupe, field: keyof ExamenGroupe) => any;
  getContrainteUnifiee: (auditoire: string, contraintes: ContrainteAuditoire[]) => number;
}

export const ExamenReviewTable = ({
  examens,
  selectedGroupes,
  editingExamens,
  contraintes,
  onSelectGroupe,
  onFieldChange,
  onSaveGroupe,
  onValidateGroupe,
  isSaving,
  isValidating,
  getFieldValue,
  getContrainteUnifiee
}: ExamenReviewTableProps) => {
  if (examens.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">
          Aucun examen trouvé pour cette recherche
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Importez et validez des examens pour les voir apparaître ici
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Sél.</TableHead>
            <TableHead>Code/Matière</TableHead>
            <TableHead>Date/Heure</TableHead>
            <TableHead>Auditoire</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Base</TableHead>
            <TableHead>Enseig.</TableHead>
            <TableHead>Amenés</TableHead>
            <TableHead>Pré-ass.</TableHead>
            <TableHead>À Attrib.</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {examens.map((groupe) => {
            const groupeKey = `${groupe.code_examen}-${groupe.date_examen}-${groupe.heure_debut}-${groupe.auditoire_unifie}`;
            const contrainteUnifiee = getContrainteUnifiee(groupe.auditoire_unifie, contraintes);
            const isSelected = selectedGroupes.has(groupeKey);
            
            return (
              <TableRow key={groupeKey} className="hover:bg-gray-50">
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectGroupe(groupeKey, !!checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-mono text-sm">{groupe.code_examen}</div>
                    <div className="text-sm text-gray-600">{groupe.matiere}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{formatDateWithDayBelgian(groupe.date_examen)}</div>
                    <div className="text-gray-500">
                      {groupe.heure_debut} - {groupe.heure_fin}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {groupe.auditoire_unifie}
                    {groupe.examens.length > 1 && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {groupe.examens.length} salles
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Salles: {groupe.examens.map(e => e.salle).join(', ')}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-gray-100 text-gray-800">
                    NON_TRAITE
                  </Badge>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={getFieldValue(groupe, 'nombre_surveillants_total') as number}
                    onChange={(e) => onFieldChange(groupeKey, 'nombre_surveillants_total', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  {contrainteUnifiee && (
                    <div className="text-xs text-purple-600 mt-1">
                      Contrainte: {contrainteUnifiee}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={getFieldValue(groupe, 'surveillants_enseignant_total') as number}
                    onChange={(e) => onFieldChange(groupeKey, 'surveillants_enseignant_total', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={getFieldValue(groupe, 'surveillants_amenes_total') as number}
                    onChange={(e) => onFieldChange(groupeKey, 'surveillants_amenes_total', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={getFieldValue(groupe, 'surveillants_pre_assignes_total') as number}
                    onChange={(e) => onFieldChange(groupeKey, 'surveillants_pre_assignes_total', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium text-center">
                    {Math.max(0, 
                      (getFieldValue(groupe, 'nombre_surveillants_total') as number) - 
                      (getFieldValue(groupe, 'surveillants_enseignant_total') as number) - 
                      (getFieldValue(groupe, 'surveillants_amenes_total') as number) - 
                      (getFieldValue(groupe, 'surveillants_pre_assignes_total') as number)
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => onSaveGroupe(groupe)}
                      disabled={!editingExamens[groupeKey] || isSaving}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onValidateGroupe(groupe)}
                      disabled={isValidating}
                      className="border-green-200 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
