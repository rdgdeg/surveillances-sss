import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Save, Check, AlertCircle, ShieldCheck, CheckCheck } from "lucide-react";
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

  // Filtrer les examens non traités
  const examensNonTraites = rows.filter(row => row.statut === "NON_TRAITE");
  
  // Séparer les examens avec et sans erreurs
  const examensWithErrors = examensNonTraites.filter(row => {
    const problems = getExamProblem(row);
    return problems.length > 0;
  });

  const examensWithoutErrors = examensNonTraites.filter(row => {
    const problems = getExamProblem(row);
    return problems.length === 0;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(examensNonTraites.map(row => row.id)));
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

  const handleMarkAllAsReady = async () => {
    if (examensNonTraites.length === 0) {
      toast({
        title: "Aucun examen à traiter",
        description: "Tous les examens ont déjà été traités.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Marquer tous les examens comme prêts et corriger automatiquement ceux sans auditoire
      for (const row of examensNonTraites) {
        const data = asRowDataObject(row.data);
        const salle = data["Auditoires"] || data["Salle"] || "";
        
        // Si pas d'auditoire, mettre les surveillants théoriques à 0
        if (!salle || salle.trim() === "") {
          const updatedData = {
            ...data,
            Surveillants_Th: 0
          };
          
          await updateMutation.mutateAsync({
            id: row.id,
            data: updatedData,
            statut: "NON_TRAITE",
            erreurs: null
          });
        } else {
          await updateMutation.mutateAsync({
            id: row.id,
            statut: "NON_TRAITE",
            erreurs: null
          });
        }
      }

      toast({
        title: "Examens marqués comme prêts",
        description: `${examensNonTraites.length} examen(s) marqué(s) comme prêt(s) pour validation. Les examens sans auditoire ont été automatiquement corrigés avec 0 surveillant.`
      });
    } catch (error) {
      console.error("Erreur lors du marquage comme prêts:", error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer tous les examens comme prêts.",
        variant: "destructive"
      });
    }
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
      // Marquer comme prêts (nettoyer les erreurs)
      for (const rowId of selectedRows) {
        await updateMutation.mutateAsync({
          id: rowId,
          statut: "NON_TRAITE",
          erreurs: null
        });
      }

      setSelectedRows(new Set());
      toast({
        title: "Examens marqués comme prêts",
        description: `${selectedRows.size} examen(s) marqué(s) comme prêt(s) pour validation.`
      });
    } catch (error) {
      console.error("Erreur lors du marquage comme prêts:", error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer les examens comme prêts.",
        variant: "destructive"
      });
    }
  };

  const handleForceValidateSelected = async () => {
    if (selectedRows.size === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un examen à valider.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log("Validation forcée pour les examens:", Array.from(selectedRows));
      
      await batchValidate.mutateAsync({
        rowIds: Array.from(selectedRows),
        statut: "VALIDE"
      });
      
      setSelectedRows(new Set());
      toast({
        title: "Validation forcée réussie",
        description: `${selectedRows.size} examen(s) validé(s) avec succès.`
      });
    } catch (error) {
      console.error("Erreur lors de la validation forcée:", error);
      toast({
        title: "Erreur de validation",
        description: error instanceof Error ? error.message : "Impossible de valider les examens sélectionnés.",
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
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications.",
        variant: "destructive"
      });
    }
  };

  const handleValidateAll = async () => {
    const rowsToValidate = examensNonTraites;
    if (rowsToValidate.length === 0) {
      toast({
        title: "Aucun examen à valider",
        description: "Tous les examens ont déjà été validés.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log("Validation de tous les examens:", rowsToValidate.map(r => r.id));
      
      await batchValidate.mutateAsync({
        rowIds: rowsToValidate.map(r => r.id),
        statut: "VALIDE"
      });
      
      toast({
        title: "Validation réussie",
        description: `${rowsToValidate.length} examens ont été validés avec succès.`
      });
    } catch (error) {
      console.error("Erreur lors de la validation globale:", error);
      toast({
        title: "Erreur de validation",
        description: error instanceof Error ? error.message : "Impossible de valider les examens.",
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

  if (examensNonTraites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Tous les examens sont traités</span>
          </CardTitle>
          <CardDescription>
            Aucun examen en attente de validation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Tous les examens ont été validés. Consultez l'onglet "Validation finale" pour voir les résultats.
          </p>
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
            <span>Validation et Correction des Examens</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-red-600">{examensWithErrors.length}</span> avec erreurs •{" "}
              <span className="font-medium text-green-600">{examensWithoutErrors.length}</span> prêts
            </div>
            <Button
              onClick={handleMarkAllAsReady}
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
              disabled={updateMutation.isPending || examensNonTraites.length === 0}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marquer tout comme prêt ({examensNonTraites.length})
            </Button>
            {selectedRows.size > 0 && (
              <div className="flex space-x-2">
                <Button
                  onClick={handleMarkSelectedAsReady}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  disabled={updateMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Marquer comme prêts ({selectedRows.size})
                </Button>
                <Button
                  onClick={handleForceValidateSelected}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  disabled={batchValidate.isPending}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Valider forcé ({selectedRows.size})
                </Button>
              </div>
            )}
            <Button
              onClick={handleValidateAll}
              disabled={examensNonTraites.length === 0 || batchValidate.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {batchValidate.isPending ? "Validation..." : `Valider tout (${examensNonTraites.length})`}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Corrigez les champs manquants, marquez comme prêts ou validez directement pour générer les créneaux et listes enseignants.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {examensWithErrors.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span className="font-medium text-orange-800">
                    {examensWithErrors.length} examen(s) avec des erreurs
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedRows.size === examensNonTraites.length && examensNonTraites.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-orange-700">Tout sélectionner</span>
                </div>
              </div>
              <p className="text-sm text-orange-700">
                Vous pouvez corriger les erreurs ci-dessous, ou utiliser "Marquer tout comme prêt" pour nettoyer toutes les erreurs, ou "Valider forcé" pour valider malgré les erreurs.
              </p>
            </div>
          )}

          {examensWithoutErrors.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">
                  {examensWithoutErrors.length} examen(s) prêt(s) pour validation
                </span>
              </div>
              <p className="text-sm text-green-700">
                Ces examens n'ont aucune erreur et peuvent être validés directement.
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.size === examensNonTraites.length && examensNonTraites.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Salle</TableHead>
                  <TableHead>Faculté</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examensNonTraites.map((row) => {
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
                        {problems.length === 0 ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Prêt
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            {problems.map((problem, idx) => (
                              <Badge key={idx} variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {problem}
                              </Badge>
                            ))}
                          </div>
                        )}
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
      </CardContent>
    </Card>
  );
}
