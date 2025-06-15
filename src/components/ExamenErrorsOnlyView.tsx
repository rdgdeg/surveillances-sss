
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Save } from "lucide-react";
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
        description: `${rowsToValidate.length} examens ont été validés avec succès.`
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
            <span>Correction des Erreurs d'Import</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-red-600">{examensWithErrors.length}</span> avec erreurs •{" "}
              <span className="font-medium text-green-600">{examensWithoutErrors.length}</span> prêts
            </div>
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
          Corrigez les champs manquants ou incorrects pour pouvoir valider l'ensemble des examens.
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
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-800">
                  {examensWithErrors.length} examen(s) nécessitent une correction
                </span>
              </div>
              <p className="text-sm text-orange-700">
                Corrigez les champs manquants ci-dessous pour pouvoir procéder à la validation.
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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

                    return (
                      <TableRow key={row.id}>
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
