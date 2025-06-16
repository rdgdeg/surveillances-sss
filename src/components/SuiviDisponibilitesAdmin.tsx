
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Users, FileSpreadsheet, Search, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import * as XLSX from 'xlsx';

interface SurveillantDisponibilite {
  surveillant_id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  quota: number;
  creneaux_remplis: number;
  obligatoires: number;
  souhaites: number;
  disponibilites: Array<{
    date_examen: string;
    heure_debut: string;
    heure_fin: string;
    type_choix: string;
    nom_examen_selectionne: string;
    nom_examen_obligatoire: string;
    commentaire_surveillance_obligatoire: string;
  }>;
}

export const SuiviDisponibilitesAdmin = () => {
  const { data: activeSession } = useActiveSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Récupérer toutes les données des surveillants avec leurs disponibilités
  const { data: surveillantsData = [], isLoading } = useQuery({
    queryKey: ['surveillants-disponibilites-overview', activeSession?.id],
    queryFn: async (): Promise<SurveillantDisponibilite[]> => {
      if (!activeSession?.id) return [];

      // Récupérer tous les surveillants actifs de la session
      const { data: surveillantsSession, error: sessionsError } = await supabase
        .from('surveillant_sessions')
        .select(`
          surveillant_id,
          quota,
          surveillants!inner (
            nom,
            prenom,
            email,
            type
          )
        `)
        .eq('session_id', activeSession.id)
        .eq('is_active', true);

      if (sessionsError) throw sessionsError;

      // Récupérer toutes les disponibilités pour cette session
      const { data: disponibilites, error: dispoError } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('est_disponible', true);

      if (dispoError) throw dispoError;

      // Construire les données finales
      const result: SurveillantDisponibilite[] = surveillantsSession.map(item => {
        const surveillantDispos = disponibilites.filter(d => d.surveillant_id === item.surveillant_id);
        
        const obligatoires = surveillantDispos.filter(d => d.type_choix === 'obligatoire').length;
        const souhaites = surveillantDispos.filter(d => d.type_choix === 'souhaitee').length;

        return {
          surveillant_id: item.surveillant_id,
          nom: item.surveillants.nom,
          prenom: item.surveillants.prenom,
          email: item.surveillants.email,
          type: item.surveillants.type,
          quota: item.quota || 6,
          creneaux_remplis: surveillantDispos.length,
          obligatoires,
          souhaites,
          disponibilites: surveillantDispos.map(d => ({
            date_examen: d.date_examen,
            heure_debut: d.heure_debut,
            heure_fin: d.heure_fin,
            type_choix: d.type_choix,
            nom_examen_selectionne: d.nom_examen_selectionne || '',
            nom_examen_obligatoire: d.nom_examen_obligatoire || '',
            commentaire_surveillance_obligatoire: d.commentaire_surveillance_obligatoire || ''
          })).sort((a, b) => {
            // Trier par date puis par heure de début
            if (a.date_examen !== b.date_examen) {
              return a.date_examen.localeCompare(b.date_examen);
            }
            return a.heure_debut.localeCompare(b.heure_debut);
          })
        };
      });

      // Trier par nom de famille puis prénom
      return result.sort((a, b) => {
        const nomA = a.nom.toLowerCase();
        const nomB = b.nom.toLowerCase();
        if (nomA === nomB) {
          return a.prenom.toLowerCase().localeCompare(b.prenom.toLowerCase());
        }
        return nomA.localeCompare(nomB);
      });
    },
    enabled: !!activeSession?.id
  });

  // Filtrer les données
  const filteredData = surveillantsData.filter(surveillant => {
    const matchSearch = searchTerm === "" || 
      surveillant.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surveillant.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surveillant.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchType = typeFilter === "all" || surveillant.type === typeFilter;
    
    return matchSearch && matchType;
  });

  // Exporter vers Excel
  const exportToExcel = () => {
    if (surveillantsData.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Aucune donnée à exporter.",
        variant: "destructive"
      });
      return;
    }

    // Préparer les données pour l'export
    const exportData: any[] = [];
    
    surveillantsData.forEach(surveillant => {
      if (surveillant.disponibilites.length === 0) {
        // Surveillant sans disponibilité
        exportData.push({
          'Nom': surveillant.nom,
          'Prénom': surveillant.prenom,
          'Email': surveillant.email,
          'Type': surveillant.type,
          'Quota': surveillant.quota,
          'Créneaux Remplis': 0,
          'Obligatoires': 0,
          'Souhaités': 0,
          'Date': '-',
          'Horaire': '-',
          'Type Choix': '-',
          'Examen Spécifique': '-',
          'Examen Obligatoire': '-',
          'Commentaire': '-'
        });
      } else {
        // Une ligne par disponibilité
        surveillant.disponibilites.forEach((dispo, index) => {
          exportData.push({
            'Nom': index === 0 ? surveillant.nom : '',
            'Prénom': index === 0 ? surveillant.prenom : '',
            'Email': index === 0 ? surveillant.email : '',
            'Type': index === 0 ? surveillant.type : '',
            'Quota': index === 0 ? surveillant.quota : '',
            'Créneaux Remplis': index === 0 ? surveillant.creneaux_remplis : '',
            'Obligatoires': index === 0 ? surveillant.obligatoires : '',
            'Souhaités': index === 0 ? surveillant.souhaites : '',
            'Date': formatDateBelgian(dispo.date_examen),
            'Horaire': formatTimeRange(dispo.heure_debut, dispo.heure_fin),
            'Type Choix': dispo.type_choix === 'obligatoire' ? 'Obligatoire' : 'Souhaité',
            'Examen Spécifique': dispo.nom_examen_selectionne || '-',
            'Examen Obligatoire': dispo.nom_examen_obligatoire || '-',
            'Commentaire': dispo.commentaire_surveillance_obligatoire || '-'
          });
        });
      }
    });

    // Créer le workbook Excel
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Suivi Disponibilités");

    // Télécharger le fichier
    const fileName = `suivi_disponibilites_${activeSession?.name || 'session'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export réussi",
      description: `Données exportées vers ${fileName}`,
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Suivi des disponibilités surveillants</span>
            </div>
            <Button onClick={exportToExcel} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Exporter Excel</span>
            </Button>
          </CardTitle>
          <CardDescription>
            Session {activeSession.name} - Vue d'ensemble: qui a répondu, combien de créneaux, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
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
                <SelectItem value="Assistant">Assistant</SelectItem>
                <SelectItem value="Jobiste">Jobiste</SelectItem>
                <SelectItem value="PAT">PAT</SelectItem>
                <SelectItem value="FASB">FASB</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tableau de suivi */}
          {isLoading ? (
            <p>Chargement...</p>
          ) : filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Surveillant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Quota</TableHead>
                    <TableHead className="text-center">Créneaux remplis</TableHead>
                    <TableHead className="text-center">Obligatoires</TableHead>
                    <TableHead className="text-center">Souhaités</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((surveillant) => (
                    <TableRow key={surveillant.surveillant_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {surveillant.nom} {surveillant.prenom}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {surveillant.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{surveillant.type}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{surveillant.quota}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={surveillant.creneaux_remplis === 0 ? "destructive" : "default"}
                        >
                          {surveillant.creneaux_remplis}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {surveillant.obligatoires > 0 ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {surveillant.obligatoires}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {surveillant.souhaites > 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {surveillant.souhaites}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Aucun surveillant trouvé pour les critères sélectionnés.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
