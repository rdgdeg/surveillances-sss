
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Users, Search, Calendar, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import * as XLSX from 'xlsx';

interface DisponibiliteDetail {
  id: string;
  surveillant_id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  type_choix: string;
  nom_examen_obligatoire: string;
  surveillant_nom: string;
  surveillant_prenom: string;
  surveillant_email: string;
  surveillant_type: string;
  surveillant_eft: number;
  created_at: string;
}

export const DisponibilitesAdminView = () => {
  const { data: activeSession } = useActiveSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [choixFilter, setChoixFilter] = useState<string>("all");

  // Récupérer toutes les disponibilités avec les infos surveillants
  const { data: disponibilites = [], isLoading } = useQuery({
    queryKey: ['disponibilites-admin-view', activeSession?.id],
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
            type,
            eft
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
        type_choix: item.type_choix || 'souhaitee',
        nom_examen_obligatoire: item.nom_examen_obligatoire || '',
        surveillant_nom: item.surveillants.nom,
        surveillant_prenom: item.surveillants.prenom,
        surveillant_email: item.surveillants.email,
        surveillant_type: item.surveillants.type,
        surveillant_eft: item.surveillants.eft || 0,
        created_at: item.created_at
      }));
    },
    enabled: !!activeSession?.id
  });

  // Filtrer les disponibilités
  const filteredDisponibilites = disponibilites.filter(dispo => {
    const matchSearch = searchTerm === "" || 
      dispo.surveillant_nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispo.surveillant_prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispo.surveillant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispo.nom_examen_obligatoire.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchType = typeFilter === "all" || dispo.surveillant_type === typeFilter;
    const matchChoix = choixFilter === "all" || dispo.type_choix === choixFilter;
    
    return matchSearch && matchType && matchChoix;
  });

  // Statistiques
  const stats = {
    total: disponibilites.length,
    obligatoires: disponibilites.filter(d => d.type_choix === 'obligatoire').length,
    souhaitees: disponibilites.filter(d => d.type_choix === 'souhaitee').length,
    surveillantsUniques: new Set(disponibilites.map(d => d.surveillant_id)).size
  };

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

    const exportData = disponibilites.map(dispo => ({
      'Nom': dispo.surveillant_nom,
      'Prénom': dispo.surveillant_prenom,
      'Email': dispo.surveillant_email,
      'Type': dispo.surveillant_type,
      'ETP': dispo.surveillant_eft || '-',
      'Date': formatDateBelgian(dispo.date_examen),
      'Horaire': formatTimeRange(dispo.heure_debut, dispo.heure_fin),
      'Type Choix': dispo.type_choix === 'obligatoire' ? 'Obligatoire' : 'Souhaitée',
      'Code Examen': dispo.nom_examen_obligatoire || '-',
      'Date Envoi': new Date(dispo.created_at).toLocaleDateString('fr-FR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Disponibilités");

    const fileName = `disponibilites_${activeSession?.name || 'session'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export réussi",
      description: `${disponibilites.length} disponibilités exportées vers ${fileName}`,
    });
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
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total disponibilités</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.obligatoires}</div>
              <div className="text-sm text-gray-600">Obligatoires</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.souhaitees}</div>
              <div className="text-sm text-gray-600">Souhaitées</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.surveillantsUniques}</div>
              <div className="text-sm text-gray-600">Surveillants</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Disponibilités reçues</span>
            </div>
            <Button onClick={exportToExcel} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Exporter Excel</span>
            </Button>
          </CardTitle>
          <CardDescription>
            Session {activeSession.name} - Vue détaillée des disponibilités
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email ou code examen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type surveillant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="Assistant">Assistant</SelectItem>
                <SelectItem value="Jobiste">Jobiste</SelectItem>
                <SelectItem value="PAT">PAT</SelectItem>
                <SelectItem value="FASB">FASB</SelectItem>
              </SelectContent>
            </Select>
            <Select value={choixFilter} onValueChange={setChoixFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type choix" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les choix</SelectItem>
                <SelectItem value="obligatoire">Obligatoires</SelectItem>
                <SelectItem value="souhaitee">Souhaitées</SelectItem>
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
                    <TableHead>ETP</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Horaire</TableHead>
                    <TableHead>Choix</TableHead>
                    <TableHead>Code Examen</TableHead>
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
                        {dispo.surveillant_eft ? (
                          <Badge variant="secondary">{dispo.surveillant_eft}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{formatDateBelgian(dispo.date_examen)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{formatTimeRange(dispo.heure_debut, dispo.heure_fin)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {dispo.type_choix === 'obligatoire' ? (
                          <Badge variant="destructive" className="flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Obligatoire</span>
                          </Badge>
                        ) : (
                          <Badge variant="default" className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Souhaitée</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {dispo.nom_examen_obligatoire ? (
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {dispo.nom_examen_obligatoire}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
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
