
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Users, FileSpreadsheet, Search, Filter, Edit, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";
import * as XLSX from 'xlsx';

interface DisponibiliteDetail {
  id: string;
  surveillant_id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  est_disponible: boolean;
  type_choix: string;
  nom_examen_selectionne: string;
  surveillant_nom: string;
  surveillant_prenom: string;
  surveillant_email: string;
  surveillant_type: string;
  created_at: string;
}

export const DisponibilitesManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    type_choix: string;
    nom_examen_selectionne: string;
  }>({ type_choix: "", nom_examen_selectionne: "" });

  // Récupérer toutes les disponibilités avec les infos surveillants
  const { data: disponibilites = [], isLoading } = useQuery({
    queryKey: ['disponibilites-admin', activeSession?.id],
    queryFn: async (): Promise<DisponibiliteDetail[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('disponibilites')
        .select(`
          *,
          surveillants!inner (
            nom,
            prenom,
            email,
            type
          )
        `)
        .eq('session_id', activeSession.id)
        .eq('est_disponible', true)
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        surveillant_id: item.surveillant_id,
        date_examen: item.date_examen,
        heure_debut: item.heure_debut,
        heure_fin: item.heure_fin,
        est_disponible: item.est_disponible,
        type_choix: item.type_choix || 'souhaitee',
        nom_examen_selectionne: item.nom_examen_selectionne || '',
        surveillant_nom: item.surveillants.nom,
        surveillant_prenom: item.surveillants.prenom,
        surveillant_email: item.surveillants.email,
        surveillant_type: item.surveillants.type,
        created_at: item.created_at
      }));
    },
    enabled: !!activeSession?.id
  });

  // Mutation pour modifier une disponibilité
  const updateDisponibiliteMutation = useMutation({
    mutationFn: async ({ id, type_choix, nom_examen_selectionne }: {
      id: string;
      type_choix: string;
      nom_examen_selectionne: string;
    }) => {
      const { error } = await supabase
        .from('disponibilites')
        .update({
          type_choix,
          nom_examen_selectionne
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilites-admin'] });
      toast({
        title: "Modification sauvegardée",
        description: "La disponibilité a été mise à jour.",
      });
      setEditingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Filtrer les disponibilités
  const filteredDisponibilites = disponibilites.filter(dispo => {
    const matchSearch = searchTerm === "" || 
      dispo.surveillant_nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispo.surveillant_prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispo.surveillant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispo.nom_examen_selectionne.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchType = typeFilter === "all" || dispo.type_choix === typeFilter;
    
    return matchSearch && matchType;
  });

  // Exporter vers Excel
  const exportToExcel = () => {
    if (disponibilites.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Aucune disponibilité à exporter.",
        variant: "destructive"
      });
      return;
    }

    // Préparer les données pour l'export
    const exportData = disponibilites.map(dispo => ({
      'Nom': dispo.surveillant_nom,
      'Prénom': dispo.surveillant_prenom,
      'Email': dispo.surveillant_email,
      'Type': dispo.surveillant_type,
      'Date': dispo.date_examen,
      'Heure Début': dispo.heure_debut,
      'Heure Fin': dispo.heure_fin,
      'Type Choix': dispo.type_choix === 'obligatoire' ? 'Obligatoire' : 'Souhaité',
      'Examen Spécifié': dispo.nom_examen_selectionne || '-',
      'Date Envoi': new Date(dispo.created_at).toLocaleDateString('fr-FR')
    }));

    // Créer le workbook Excel
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Disponibilités");

    // Télécharger le fichier
    const fileName = `disponibilites_${activeSession?.name || 'session'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export réussi",
      description: `${disponibilites.length} disponibilités exportées vers ${fileName}`,
    });
  };

  // Gérer l'édition
  const startEdit = (dispo: DisponibiliteDetail) => {
    setEditingId(dispo.id);
    setEditValues({
      type_choix: dispo.type_choix,
      nom_examen_selectionne: dispo.nom_examen_selectionne
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateDisponibiliteMutation.mutate({
      id: editingId,
      ...editValues
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ type_choix: "", nom_examen_selectionne: "" });
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour voir les disponibilités.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Gestion des Disponibilités</span>
            </div>
            <Button onClick={exportToExcel} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Exporter Excel</span>
            </Button>
          </CardTitle>
          <CardDescription>
            Session {activeSession.name} - {disponibilites.length} disponibilité(s) reçue(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email ou examen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="obligatoire">Obligatoires</SelectItem>
                <SelectItem value="souhaitee">Souhaités</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tableau des disponibilités */}
          {isLoading ? (
            <p>Chargement...</p>
          ) : filteredDisponibilites.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Surveillant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Horaire</TableHead>
                    <TableHead>Type Choix</TableHead>
                    <TableHead>Examen Spécifié</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisponibilites.map((dispo) => (
                    <TableRow key={dispo.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {dispo.surveillant_prenom} {dispo.surveillant_nom}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {dispo.surveillant_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{dispo.surveillant_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(dispo.date_examen).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        {dispo.heure_debut} - {dispo.heure_fin}
                      </TableCell>
                      <TableCell>
                        {editingId === dispo.id ? (
                          <Select 
                            value={editValues.type_choix} 
                            onValueChange={(value) => setEditValues(prev => ({ ...prev, type_choix: value }))}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="souhaitee">Souhaité</SelectItem>
                              <SelectItem value="obligatoire">Obligatoire</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={dispo.type_choix === 'obligatoire' ? 'destructive' : 'default'}>
                            {dispo.type_choix === 'obligatoire' ? 'Obligatoire' : 'Souhaité'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === dispo.id ? (
                          <Input
                            value={editValues.nom_examen_selectionne}
                            onChange={(e) => setEditValues(prev => ({ ...prev, nom_examen_selectionne: e.target.value }))}
                            placeholder="Code ou nom examen"
                            className="w-40"
                          />
                        ) : (
                          <span className="text-sm">
                            {dispo.nom_examen_selectionne || '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === dispo.id ? (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              onClick={saveEdit}
                              disabled={updateDisponibiliteMutation.isPending}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(dispo)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Aucune disponibilité trouvée pour les critères sélectionnés.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
