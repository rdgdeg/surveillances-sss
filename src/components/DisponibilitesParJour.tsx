
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Clock, Download, Star, CheckCircle } from "lucide-react";
import { useActiveSession } from "@/hooks/useSessions";
import { useOptimizedCreneaux } from "@/hooks/useOptimizedCreneaux";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface DisponibiliteJour {
  date: string;
  creneaux: Array<{
    heure_debut: string;
    heure_fin: string;
    surveillants: Array<{
      id: string;
      nom: string;
      prenom: string;
      email: string;
      type: string;
      type_choix: string;
      nom_examen_selectionne?: string;
      nom_examen_obligatoire?: string;
      commentaire?: string;
    }>;
  }>;
}

export const DisponibilitesParJour = () => {
  const { data: activeSession } = useActiveSession();
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Récupérer les créneaux optimisés
  const { data: timeSlots = [] } = useOptimizedCreneaux(activeSession?.id || null);

  // Récupérer toutes les disponibilités avec infos surveillants
  const { data: disponibilitesParJour = [], isLoading } = useQuery({
    queryKey: ['disponibilites-par-jour', activeSession?.id, selectedDate],
    queryFn: async (): Promise<DisponibiliteJour[]> => {
      if (!activeSession?.id) return [];

      const { data: disponibilites, error } = await supabase
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

      // Organiser par jour et créneau
      const joursMap = new Map<string, DisponibiliteJour>();

      disponibilites?.forEach(dispo => {
        const date = dispo.date_examen;
        const creneauKey = `${dispo.heure_debut}-${dispo.heure_fin}`;

        if (!joursMap.has(date)) {
          joursMap.set(date, {
            date,
            creneaux: []
          });
        }

        const jour = joursMap.get(date)!;
        let creneau = jour.creneaux.find(c => 
          c.heure_debut === dispo.heure_debut && c.heure_fin === dispo.heure_fin
        );

        if (!creneau) {
          creneau = {
            heure_debut: dispo.heure_debut,
            heure_fin: dispo.heure_fin,
            surveillants: []
          };
          jour.creneaux.push(creneau);
        }

        creneau.surveillants.push({
          id: dispo.surveillant_id,
          nom: dispo.surveillants.nom,
          prenom: dispo.surveillants.prenom,
          email: dispo.surveillants.email,
          type: dispo.surveillants.type,
          type_choix: dispo.type_choix || 'souhaitee',
          nom_examen_selectionne: dispo.nom_examen_selectionne,
          nom_examen_obligatoire: dispo.nom_examen_obligatoire,
          commentaire: dispo.commentaire_surveillance_obligatoire
        });
      });

      // Trier les créneaux dans chaque jour
      joursMap.forEach(jour => {
        jour.creneaux.sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
        jour.creneaux.forEach(creneau => {
          creneau.surveillants.sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
        });
      });

      const result = Array.from(joursMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      
      // Filtrer par date si nécessaire
      if (selectedDate !== "all") {
        return result.filter(jour => jour.date === selectedDate);
      }
      
      return result;
    },
    enabled: !!activeSession?.id
  });

  // Obtenir la liste des dates disponibles
  const datesDisponibles = Array.from(new Set(
    timeSlots.map(slot => slot.date_examen)
  )).sort();

  // Exporter vers Excel
  const exportToExcel = () => {
    if (disponibilitesParJour.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Aucune disponibilité à exporter.",
        variant: "destructive"
      });
      return;
    }

    const exportData: any[] = [];
    
    disponibilitesParJour.forEach(jour => {
      jour.creneaux.forEach(creneau => {
        creneau.surveillants.forEach(surveillant => {
          exportData.push({
            'Date': formatDateBelgian(jour.date),
            'Créneau': formatTimeRange(creneau.heure_debut, creneau.heure_fin),
            'Nom': surveillant.nom,
            'Prénom': surveillant.prenom,
            'Email': surveillant.email,
            'Type': surveillant.type,
            'Type Choix': surveillant.type_choix === 'obligatoire' ? 'Obligatoire' : 'Souhaité',
            'Examen Spécifique': surveillant.nom_examen_selectionne || '-',
            'Examen Obligatoire': surveillant.nom_examen_obligatoire || '-',
            'Commentaire': surveillant.commentaire || '-'
          });
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Disponibilités par jour");

    const fileName = `disponibilites_par_jour_${activeSession?.name || 'session'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export réussi",
      description: `Données exportées vers ${fileName}`,
    });
  };

  // Filtrer par type de surveillant
  const filteredData = disponibilitesParJour.map(jour => ({
    ...jour,
    creneaux: jour.creneaux.map(creneau => ({
      ...creneau,
      surveillants: creneau.surveillants.filter(s => 
        typeFilter === "all" || s.type === typeFilter
      )
    })).filter(creneau => creneau.surveillants.length > 0)
  })).filter(jour => jour.creneaux.length > 0);

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour voir les disponibilités par jour.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalDisponibilites = filteredData.reduce((sum, jour) => 
    sum + jour.creneaux.reduce((sumCreneau, creneau) => sumCreneau + creneau.surveillants.length, 0), 0
  );

  const totalObligatoires = filteredData.reduce((sum, jour) => 
    sum + jour.creneaux.reduce((sumCreneau, creneau) => 
      sumCreneau + creneau.surveillants.filter(s => s.type_choix === 'obligatoire').length, 0
    ), 0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Disponibilités par jour</span>
            </div>
            <Button onClick={exportToExcel} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Exporter Excel</span>
            </Button>
          </CardTitle>
          <CardDescription>
            Session {activeSession.name} - Vue organisée par jour d'examen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="flex space-x-4 mb-6">
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sélectionner un jour" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les jours</SelectItem>
                {datesDisponibles.map(date => (
                  <SelectItem key={date} value={date}>
                    {formatDateBelgian(date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{filteredData.length}</div>
                  <div className="text-sm text-blue-700">Jours avec disponibilités</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalDisponibilites}</div>
                  <div className="text-sm text-green-700">Total disponibilités</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{totalObligatoires}</div>
                  <div className="text-sm text-orange-700">Surveillances obligatoires</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste par jour */}
          {isLoading ? (
            <p>Chargement...</p>
          ) : filteredData.length > 0 ? (
            <div className="space-y-6">
              {filteredData.map((jour) => (
                <Card key={jour.date} className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDateBelgian(jour.date)}</span>
                      <Badge variant="outline">
                        {jour.creneaux.reduce((sum, c) => sum + c.surveillants.length, 0)} disponibilités
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {jour.creneaux.map((creneau, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center space-x-2 mb-3">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              {formatTimeRange(creneau.heure_debut, creneau.heure_fin)}
                            </span>
                            <Badge variant="secondary">
                              {creneau.surveillants.length} surveillant{creneau.surveillants.length > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {creneau.surveillants.map((surveillant) => (
                              <div key={surveillant.id} className="bg-white p-3 rounded border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium text-sm">
                                    {surveillant.prenom} {surveillant.nom}
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    {surveillant.type_choix === 'obligatoire' && (
                                      <Star className="h-3 w-3 text-orange-500" />
                                    )}
                                    <Badge 
                                      variant="outline" 
                                      className={surveillant.type_choix === 'obligatoire' ? 'border-orange-500 text-orange-700' : ''}
                                    >
                                      {surveillant.type}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-600 mb-2">{surveillant.email}</div>
                                {surveillant.type_choix === 'obligatoire' && (
                                  <div className="space-y-1">
                                    {surveillant.nom_examen_obligatoire && (
                                      <div className="text-xs bg-orange-100 px-2 py-1 rounded">
                                        <strong>Examen:</strong> {surveillant.nom_examen_obligatoire}
                                      </div>
                                    )}
                                    {surveillant.commentaire && (
                                      <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                                        <strong>Note:</strong> {surveillant.commentaire}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {surveillant.nom_examen_selectionne && (
                                  <div className="text-xs bg-blue-100 px-2 py-1 rounded mt-1">
                                    <strong>Souhaité:</strong> {surveillant.nom_examen_selectionne}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune disponibilité trouvée pour les critères sélectionnés.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
