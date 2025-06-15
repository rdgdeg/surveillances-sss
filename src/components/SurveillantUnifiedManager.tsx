// Un manager unifié : jointure surveillants x surveillant_sessions,
// édition ETP, quotas, import Excel surveillants, session active.

// Dépendances
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, Save, Plus, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Facultés proposées (tu peux l'éditer à volonté)
const FACULTES = [
  { value: "FASB", label: "FASB" },
  { value: "EPL", label: "EPL" },
  { value: "FIAL", label: "FIAL" },
  { value: "PSSP", label: "PSSP" },
  { value: "LSM", label: "LSM" },
  { value: "ESPO", label: "ESPO" },
  { value: "FSP", label: "FSP" },
  { value: "NONE", label: "Aucune restriction" }
];

// Types
interface SurveillantJoin {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  statut: string;
  faculte_interdite?: string;
  affectation_fac?: string;
  campus?: string;
  eft?: number;
  // Session fields
  session_entry_id?: string;
  quota?: number | null;
}

export function SurveillantUnifiedManager() {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ etp?: number; quota?: number; faculte_interdite?: string }>({});
  const [showUpload, setShowUpload] = useState(false);

  // 1. CHARGEMENT surveillants (jointure surveillant_sessions)
  const { data: surveillants, isLoading } = useQuery({
    queryKey: ["unified-surveillants", activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      // jointure manuelle
      const { data, error } = await supabase
        .from("surveillant_sessions")
        .select(
          `
          id,
          surveillant_id,
          quota,
          surveillants (
            id,
            nom,
            prenom,
            email,
            type,
            statut,
            faculte_interdite,
            affectation_fac,
            campus,
            eft
          )
        `
        )
        .eq("session_id", activeSession.id)
        .order("surveillants(nom)", { ascending: true });

      if (error) throw error;

      // Flat join for table
      return (data ?? []).map((row: any) => ({
        id: row.surveillants.id,
        nom: row.surveillants.nom,
        prenom: row.surveillants.prenom,
        email: row.surveillants.email,
        type: row.surveillants.type,
        statut: row.surveillants.statut,
        faculte_interdite: row.surveillants.faculte_interdite,
        affectation_fac: row.surveillants.affectation_fac,
        campus: row.surveillants.campus,
        eft: row.surveillants.eft ?? undefined,
        session_entry_id: row.id,
        quota: row.quota ?? null,
      })) as SurveillantJoin[];
    },
    enabled: !!activeSession?.id,
  });

  // 2. MUTATIONS : update ETP OU quota session 
  const updateSurveillantMutation = useMutation({
    mutationFn: async ({
      surveillantId,
      eft,
    }: {
      surveillantId: string;
      eft: number;
    }) => {
      const { error } = await supabase
        .from("surveillants")
        .update({ eft })
        .eq("id", surveillantId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "ETP mis à jour",
        description: "La valeur ETP a été modifiée.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateQuotaSessionMutation = useMutation({
    mutationFn: async ({
      sessionEntryId,
      quota,
    }: {
      sessionEntryId: string;
      quota: number;
    }) => {
      const { error } = await supabase
        .from("surveillant_sessions")
        .update({ quota })
        .eq("id", sessionEntryId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Quota session modifié",
        description: "Le quota session a été mis à jour.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Nouvelle mutation : faculte_interdite
  const updateFaculteInterditeMutation = useMutation({
    mutationFn: async ({
      surveillantId,
      faculte_interdite
    }: {
      surveillantId: string;
      faculte_interdite: string | null;
    }) => {
      const { error } = await supabase
        .from("surveillants")
        .update({ faculte_interdite: faculte_interdite === "NONE" ? null : faculte_interdite })
        .eq("id", surveillantId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Faculté interdite mise à jour",
        description: "La restriction a été prise en compte.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // 3. MODIFICATION des valeurs via édition par ligne
  const handleEdit = (row: SurveillantJoin) => {
    setEditRow(row.id);
    setEditValues({
      etp: row.eft ?? 0,
      quota: row.quota ?? ((row.eft ?? 0) * 6),
      faculte_interdite: row.faculte_interdite ?? "NONE",
    });
  };
  const handleCancel = () => {
    setEditRow(null);
    setEditValues({});
  };
  const handleSave = async (row: SurveillantJoin) => {
    // Update ETP si changé
    if (editValues.etp !== row.eft) {
      await updateSurveillantMutation.mutateAsync({ surveillantId: row.id, eft: editValues.etp ?? 0 });
    }
    // Update quota session si changé
    if (editValues.quota !== row.quota && row.session_entry_id) {
      await updateQuotaSessionMutation.mutateAsync({
        sessionEntryId: row.session_entry_id,
        quota: editValues.quota ?? 0,
      });
    }
    // Update faculte_interdite
    if ((editValues.faculte_interdite ?? "NONE") !== (row.faculte_interdite ?? "NONE")) {
      await updateFaculteInterditeMutation.mutateAsync({
        surveillantId: row.id,
        faculte_interdite:
          editValues.faculte_interdite === "NONE" ? null : editValues.faculte_interdite,
      });
    }
    setEditRow(null);
    setEditValues({});
  };

  // 4. Fichier d'import surveillants (Excel) - ouverture
  // (À brancher vers un composant d'import Excel existant si besoin)
  // Pour la démo, on affiche juste un bouton
  const handleOpenUpload = () => setShowUpload(true);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle>Liste des surveillants</CardTitle>
            <CardDescription>
              Gérez tous les surveillants, ETP, quotas, restrictions de facultés, et import sur la session courante.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleOpenUpload}>
            <UploadCloud className="h-4 w-4 mr-2" />
            Importer surveillants (Excel)
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Affectation</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>ETP</TableHead>
                  <TableHead>Quota théorique<br /><span className="text-xs text-gray-400">(ETP × 6)</span></TableHead>
                  <TableHead>Quota session</TableHead>
                  <TableHead>
                    Faculté interdite
                    <span className="block text-xs text-gray-400 font-normal">Blocages attrib.</span>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12}>Chargement...</TableCell>
                  </TableRow>
                ) : surveillants && surveillants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center">Aucun surveillant trouvé</TableCell>
                  </TableRow>
                ) : (
                  surveillants?.map((row) => {
                    const isEdit = editRow === row.id;
                    // pour badge couleur
                    const hasRestriction = !!row.faculte_interdite && row.faculte_interdite !== "NONE";
                    return (
                      <TableRow key={row.id}>
                        <TableCell>{row.nom}</TableCell>
                        <TableCell>{row.prenom}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell><Badge variant="outline">{row.type}</Badge></TableCell>
                        <TableCell>{row.statut}</TableCell>
                        <TableCell>{row.affectation_fac || "-"}</TableCell>
                        <TableCell>{row.campus || "-"}</TableCell>
                        <TableCell>
                          {isEdit ? (
                            <Input
                              type="number"
                              className="w-20"
                              value={editValues.etp ?? ""}
                              step="0.01"
                              min="0"
                              onChange={e =>
                                setEditValues(v => ({
                                  ...v,
                                  etp: parseFloat(e.target.value),
                                }))
                              }
                            />
                          ) : (
                            row.eft ?? "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs">
                            {(isEdit
                              ? (editValues.etp ?? 0) * 6
                              : (row.eft ?? 0) * 6
                            ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isEdit ? (
                            <Input
                              type="number"
                              className="w-20"
                              value={editValues.quota ?? ""}
                              min="0"
                              onChange={e =>
                                setEditValues(v => ({
                                  ...v,
                                  quota: parseInt(e.target.value) || 0,
                                }))
                              }
                            />
                          ) : (
                            row.quota ?? "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {isEdit ? (
                            <select
                              className="w-36 rounded-md border px-2 py-1 text-sm"
                              value={editValues.faculte_interdite ?? "NONE"}
                              onChange={e =>
                                setEditValues(v => ({
                                  ...v,
                                  faculte_interdite: e.target.value
                                }))
                              }
                            >
                              {FACULTES.map(f => (
                                <option key={f.value} value={f.value}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                          ) : hasRestriction ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="destructive" className="cursor-help w-32 flex justify-center">
                                    {row.faculte_interdite}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Ce surveillant ne pourra pas être affecté aux examens de cette faculté.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge className="bg-gray-200 text-gray-600 w-32 flex justify-center">
                              Aucune restriction
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEdit ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSave(row)}
                                disabled={updateSurveillantMutation.isPending || updateQuotaSessionMutation.isPending || updateFaculteInterditeMutation.isPending}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleCancel}
                                disabled={updateSurveillantMutation.isPending || updateQuotaSessionMutation.isPending || updateFaculteInterditeMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Section Import - à brancher avec l'import Excel existant si souhaité */}
      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Importer des surveillants</CardTitle>
            <CardDescription>
              Sélectionnez un fichier Excel pour mettre à jour la liste.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* À remplacer par ton FileUploader existant */}
            <div className="flex gap-4">
              <Input type="file" accept=".xlsx,.xls" />
              <Button variant="outline" onClick={() => setShowUpload(false)}>Fermer</Button>
            </div>
            <div className="mt-2 text-xs text-muted">
              Fonctionnalité à connecter à ton composant d'import. 
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
