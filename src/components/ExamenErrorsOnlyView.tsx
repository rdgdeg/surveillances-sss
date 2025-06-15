
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Save, Check } from "lucide-react";
import { useExamensImportTemp, useUpdateExamenImportTemp, useBatchValidateExamensImport } from "@/hooks/useExamensImportTemp";
import { getExamProblem } from "@/utils/examensImportProblems";
import { toast } from "@/hooks/use-toast";

interface ExamenErrorsOnlyViewProps {
  batchId?: string;
}

export function ExamenErrorsOnlyView({ batchId }: ExamenErrorsOnlyViewProps) {
  const { data: rows = [], isLoading } = useExamensImportTemp(batchId);
  const updateMutation = useUpdateExamenImportTemp();
  const batchValidate = useBatchValidateExamensImport();
  
  const [editingRows, setEditingRows] = useState<Record<string, any>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Helper to safely get the object form of `row.data`
  function asRowDataObject(data: any): Record<string, any> {
    if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, any>;
    try {
      if (typeof data === "string") {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return {};
  }

  // Filtrer uniquement les examens avec des erreurs
  const examensWithErrors = rows.filter(row => {
    const problems = getExamProblem(row);
    return problems.length > 0 && row.statut === "NON_TRAITE";
  });

  // Compter les examens sans erreur
  const examensWithoutErrors = rows.filter(row => {
    const problems = getExamProblem(row);
    return problems.length === 0 && row.statut === "NON_TRAITE";
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(examensWithErrors.map(row => row.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(rowId);
    } else {
      newSelected.delete(rowId);
    }
    setSelectedRows(newSelected);
  };

  const handleMarkSelectedAsReady = async () => {
    if (selectedRows.size === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un examen à marquer comme prêt.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Vérifier que les examens sélectionnés n'ont plus d'erreurs
      const stillHasErrors = Array.from(selectedRows).some(rowId => {
        const row = rows.find(r => r.id === rowId);
        if (!row) return false;
        const problems = getExamProblem(row);
        return problems.length > 0;
      });

      if (stillHasErrors) {
        toast({
          title: "Erreurs détectées",
          description: "Certains examens sélectionnés ont encore des erreurs. Corrigez-les d'abord.",
          variant: "destructive"
        });
        return;
      }

      // Marquer comme prêts (statut reste NON_TRAITE mais considérés comme corrects)
      for (const rowId of selectedRows) {
        await updateMutation.mutateAsync({
          id: rowId,
          statut: "NON_TRAITE", // Garde le statut pour la validation finale
          erreurs: null
        });
      }

      setSelectedRows(new Set());
      toast({
        title: "Examens marqués comme prêts",
        description: `${selectedRows.size} examen(s) marqué(s) comme prêt(s) pour validation.`
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de marquer les examens comme prêts.",
        variant: "destructive"
      });
    }
  };

  const handleEditChange = (rowId: string, field: string, value: string) => {
    setEditingRows(prev => ({
      ...prev,
      [rowId]: {
        ...asRowDataObject(rows.find(r => r.id === rowId)?.data),
        ...prev[rowId],
        [field]: value
      }
    }));
  };

  const handleSaveRow = async (rowId: string) => {
    const editData = editingRows[rowId];
    if (!editData) return;

    try {
      await updateMutation.mutateAsync({
        id: rowId,
        data: editData,
        statut: "NON_TRAITE",
        erreurs: null
      });
      
      // Retirer de l'édition
      setEditingRows(prev => {
        const newState = { ...prev };
        delete newState[rowId];
        return newState;
      });

      toast({
        title: "Examen corrigé",
        description: "Les modifications ont été sauvegardées."
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications.",
        variant: "destructive"
      });
    }
  };

  const handleValidateAll = async () => {
    // Vérifier qu'il n'y a plus d'erreurs
    const stillHasErrors = rows.some(row => {
      const problems = getExamProblem(row);
      return problems.length > 0 && row.statut === "NON_TRAITE";
    });

    if (stillHasErrors) {
      toast({
        title: "Erreurs restantes",
        description: "Corrigez d'abord tous les examens avec des erreurs.",
        variant: "destructive"
      });
      return;
    }

    const rowsToValidate = rows.filter(r => r.statut === "NON_TRAITE");
    if (rowsToValidate.length === 0) {
      toast({
        title: "Aucun examen à valider",
        description: "Tous les examens ont déjà été validés.",
        variant: "destructive"
      });
      return;
    }

    try {
      await batchValidate.mutateAsync({
        rowIds: rowsToValidate.map(r => r.id),
        statut: "VALIDE"
      });
      
      toast({
        title: "Validation réussie",
        description: `${rowsToValidate.length} examens ont été validés avec succès. Les créneaux et listes enseignants sont en cours de génération.`
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de valider les examens.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement des examens...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Correction et Validation des Examens</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-red-600">{examensWithErrors.length}</span> avec erreurs •{" "}
              <span className="font-medium text-green-600">{examensWithoutErrors.length}</span> prêts
            </div>
            {selectedRows.size > 0 && (
              <Button
                onClick={handleMarkSelectedAsReady}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Check className="h-4 w-4 mr-2" />
                Marquer comme prêts ({selectedRows.size})
              </Button>
            )}
            <Button
              onClick={handleValidateAll}
              disabled={examensWithErrors.length > 0 || batchValidate.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {batchValidate.isPending ? "Validation..." : `Valider tout (${examensWithoutErrors.length})`}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Corrigez les champs manquants ou incorrects, puis validez l'ensemble pour générer les créneaux et listes enseignants.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {examensWithErrors.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-600 mb-2">
              Tous les examens sont prêts !
            </h3>
            <p className="text-gray-600 mb-4">
              Aucune erreur détectée. Vous pouvez maintenant valider l'ensemble.
            </p>
            <Button
              onClick={handleValidateAll}
              disabled={examensWithoutErrors.length === 0 || batchValidate.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Valider {examensWithoutErrors.length} examens
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span className="font-medium text-orange-800">
                    {examensWithErrors.length} examen(s) nécessitent une correction
                  </span>
                </div>
                {examensWithErrors.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedRows.size === examensWithErrors.length && examensWithErrors.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-orange-700">Tout sélectionner</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-orange-700">
                Corrigez les champs manquants ci-dessous ou sélectionnez les examens à marquer comme prêts une fois corrigés.
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRows.size === examensWithErrors.length && examensWithErrors.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Matière</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Salle</TableHead>
                    <TableHead>Faculté</TableHead>
                    <TableHead>Erreurs</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examensWithErrors.map((row) => {
                    const data = asRowDataObject(row.data);
                    const editData = editingRows[row.id] || data;
                    const isEditing = !!editingRows[row.id];
                    const problems = getExamProblem(row);
                    const isSelected = selectedRows.has(row.id);

                    return (
                      <TableRow key={row.id} className={isSelected ? "bg-blue-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectRow(row.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {data["Code"] || data["code"] || "N/A"}
                        </TableCell>
                        <TableCell>
                          {data["Activite"] || data["Matière"] || data["matiere"] || "N/A"}
                        </TableCell>
                        <TableCell>
                          {data["Jour"] || data["Date"] || "N/A"}
                        </TableCell>
                        <TableCell>
                          {data["Auditoires"] || data["Salle"] || "N/A"}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editData["Faculte"] || editData["Faculté"] || ""}
                              onChange={(e) => handleEditChange(row.id, "Faculte", e.target.value)}
                              placeholder="Entrer la faculté"
                              className="w-32"
                            />
                          ) : (
                            <span className={problems.includes("faculté") ? "text-red-600 font-medium" : ""}>
                              {data["Faculte"] || data["Faculté"] || data["faculte"] || (
                                <Badge variant="destructive" className="text-xs">Manquant</Badge>
                              )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {problems.map((problem, idx) => (
                              <Badge key={idx} variant="destructive" className="text-xs">
                                {problem}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveRow(row.id)}
                                disabled={updateMutation.isPending}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Sauver
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingRows(prev => {
                                  const newState = { ...prev };
                                  delete newState[row.id];
                                  return newState;
                                })}
                              >
                                Annuler
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingRows(prev => ({
                                ...prev,
                                [row.id]: data
                              }))}
                            >
                              Corriger
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
