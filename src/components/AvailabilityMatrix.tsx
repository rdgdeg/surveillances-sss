import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { useOptimizedCreneaux } from "@/hooks/useOptimizedCreneaux";
import { toast } from "@/hooks/use-toast";
import { formatDateBelgian } from "@/lib/dateUtils";
import * as XLSX from 'xlsx';

interface Disponibilite {
  id: string;
  surveillant_id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  est_disponible: boolean;
  type_choix: string;
  nom_examen_obligatoire: string;
}

interface Surveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
}

interface TimeSlot {
  date: string;
  heure_debut: string;
  heure_fin: string;
  label: string;
  heure_debut_surveillance?: string; // Heure incluant la préparation
}

export const AvailabilityMatrix = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();

  // Utiliser les créneaux optimisés comme base pour la matrice
  const { data: optimizedCreneaux = [] } = useOptimizedCreneaux(activeSession?.id || null);

  // Récupérer les surveillants actifs triés par nom de famille
  const { data: surveillants = [] } = useQuery({
    queryKey: ['surveillants', activeSession?.id],
    queryFn: async () => {
      if (!activeSession) return [];
      
      const { data, error } = await supabase
        .from('surveillant_sessions')
        .select(`
          surveillants (
            id, nom, prenom, email, type
          )
        `)
        .eq('session_id', activeSession.id)
        .eq('is_active', true);
      
      if (error) throw error;
      
      const surveillantsList = data.map(item => item.surveillants).filter(Boolean) as Surveillant[];
      
      // Trier par nom de famille puis prénom
      return surveillantsList.sort((a, b) => {
        const nomA = a.nom.toLowerCase();
        const nomB = b.nom.toLowerCase();
        if (nomA === nomB) {
          return a.prenom.toLowerCase().localeCompare(b.prenom.toLowerCase());
        }
        return nomA.localeCompare(nomB);
      });
    },
    enabled: !!activeSession
  });

  // Récupérer les disponibilités existantes
  const { data: disponibilites = [] } = useQuery({
    queryKey: ['disponibilites', activeSession?.id],
    queryFn: async () => {
      if (!activeSession) return [];
      
      const { data, error } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('est_disponible', true);
      
      if (error) throw error;
      return data as Disponibilite[];
    },
    enabled: !!activeSession
  });

  // Créer les créneaux de surveillance optimisés pour la matrice
  const timeSlots: TimeSlot[] = optimizedCreneaux
    .filter(slot => slot.type === 'surveillance')
    .map(slot => ({
      date: slot.date_examen,
      heure_debut: slot.heure_debut,
      heure_fin: slot.heure_fin,
      heure_debut_surveillance: slot.heure_debut_surveillance,
      label: `${formatDateBelgian(slot.date_examen)} ${slot.heure_debut}-${slot.heure_fin}`
    }))
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.heure_debut.localeCompare(b.heure_debut);
    });

  // Fonction améliorée pour mapper les disponibilités aux créneaux optimisés
  const mapDisponibiliteToOptimizedSlot = (disponibilite: Disponibilite, slots: TimeSlot[]) => {
    // Chercher le créneau optimisé qui correspond à cette disponibilité
    return slots.find(slot => {
      // Même date
      if (slot.date !== disponibilite.date_examen) return false;
      
      // Récupérer les examens de ce créneau optimisé
      const creneauOptimise = optimizedCreneaux.find(c => 
        c.type === 'surveillance' && 
        c.date_examen === slot.date &&
        c.heure_debut === slot.heure_debut &&
        c.heure_fin === slot.heure_fin
      );
      
      if (!creneauOptimise) return false;
      
      // CAS 1: Vérifier si la disponibilité correspond à un des examens de ce créneau (heures d'examen)
      const correspondExamen = creneauOptimise.examens.some(examen => {
        return examen.heure_debut === disponibilite.heure_debut &&
               examen.heure_fin === disponibilite.heure_fin;
      });
      
      if (correspondExamen) return true;
      
      // CAS 2: Vérifier si la disponibilité correspond au créneau de surveillance complet
      const correspondSurveillance = 
        disponibilite.heure_debut === slot.heure_debut &&
        disponibilite.heure_fin === slot.heure_fin;
      
      if (correspondSurveillance) return true;
      
      // CAS 3: Vérifier si la disponibilité correspond aux heures de surveillance avec préparation
      const correspondSurveillanceAvecPrep = 
        slot.heure_debut_surveillance &&
        disponibilite.heure_debut === slot.heure_debut_surveillance &&
        disponibilite.heure_fin === slot.heure_fin;
      
      return correspondSurveillanceAvecPrep;
    });
  };

  // Créer une map des disponibilités mappées aux créneaux optimisés
  const disponibiliteMap = new Map<string, Disponibilite>();
  disponibilites.forEach(disp => {
    const mappedSlot = mapDisponibiliteToOptimizedSlot(disp, timeSlots);
    if (mappedSlot) {
      const key = `${disp.surveillant_id}-${mappedSlot.date}-${mappedSlot.heure_debut}-${mappedSlot.heure_fin}`;
      disponibiliteMap.set(key, disp);
    }
  });

  const getAvailabilityInfo = (surveillantId: string, slot: TimeSlot) => {
    const key = `${surveillantId}-${slot.date}-${slot.heure_debut}-${slot.heure_fin}`;
    return disponibiliteMap.get(key);
  };

  const generateCallyTemplate = () => {
    // Créer un template Excel-like pour Cally
    let csvContent = "Surveillant,Email,Type";
    timeSlots.forEach(slot => {
      csvContent += `,${slot.label}`;
    });
    csvContent += "\n";

    surveillants.forEach(surveillant => {
      csvContent += `${surveillant.prenom} ${surveillant.nom},${surveillant.email},${surveillant.type}`;
      timeSlots.forEach(slot => {
        const availability = getAvailabilityInfo(surveillant.id, slot);
        let cellValue = '✗';
        
        if (availability) {
          if (availability.type_choix === 'obligatoire') {
            cellValue = '★'; // Étoile pour obligatoire
          } else {
            cellValue = '✓'; // Check pour souhaité
          }
          
          if (availability.nom_examen_obligatoire) {
            cellValue += ` (${availability.nom_examen_obligatoire})`;
          }
        }
        
        csvContent += `,${cellValue}`;
      });
      csvContent += "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matrice_disponibilites_${activeSession?.name || 'session'}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export réussi",
      description: "La matrice des disponibilités a été téléchargée.",
    });
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="h-12 w-12 text-uclouvain-blue-grey mx-auto mb-4" />
          <p className="text-uclouvain-blue">Aucune session active. Veuillez d'abord activer une session.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-uclouvain-blue-grey">
        <CardHeader className="bg-gradient-uclouvain text-white">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Matrice des Disponibilités - {activeSession.name}</span>
          </CardTitle>
          <CardDescription className="text-blue-100">
            Vue des disponibilités soumises par les surveillants pour les créneaux de surveillance optimisés. ✓ = souhaité, ★ = obligatoire, ✗ = non disponible.
          </CardDescription>
          <div className="flex space-x-2">
            <Button onClick={generateCallyTemplate} variant="outline" size="sm" className="bg-white text-uclouvain-blue border-white hover:bg-blue-50">
              <Download className="h-4 w-4 mr-2" />
              Télécharger matrice CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {timeSlots.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-uclouvain-blue-grey mx-auto mb-4" />
              <p className="text-uclouvain-blue">Aucun créneau de surveillance optimisé trouvé. Veuillez d'abord valider les examens.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-uclouvain-blue-grey">
                <thead>
                  <tr className="bg-uclouvain-blue-grey">
                    <th className="border border-uclouvain-blue-grey p-2 text-left font-medium text-uclouvain-blue">Surveillant</th>
                    <th className="border border-uclouvain-blue-grey p-2 text-left font-medium text-uclouvain-blue">Type</th>
                    {timeSlots.map((slot, index) => (
                      <th key={index} className="border border-uclouvain-blue-grey p-2 text-center font-medium min-w-24 text-uclouvain-blue">
                        <div className="text-xs">
                          <div>{formatDateBelgian(slot.date)}</div>
                          <div>{slot.heure_debut}-{slot.heure_fin}</div>
                          {slot.heure_debut_surveillance && (
                            <div className="text-gray-500">(Début surveillance: {slot.heure_debut_surveillance})</div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {surveillants.map((surveillant) => (
                    <tr key={surveillant.id} className="hover:bg-blue-50">
                      <td className="border border-uclouvain-blue-grey p-2">
                        <div>
                          <div className="font-medium text-uclouvain-blue">{surveillant.nom} {surveillant.prenom}</div>
                          <div className="text-sm text-uclouvain-blue-grey">{surveillant.email}</div>
                        </div>
                      </td>
                      <td className="border border-uclouvain-blue-grey p-2">
                        <Badge variant="outline" className="border-uclouvain-cyan text-uclouvain-blue">{surveillant.type}</Badge>
                      </td>
                      {timeSlots.map((slot, slotIndex) => {
                        const availability = getAvailabilityInfo(surveillant.id, slot);
                        
                        let bgColor = 'bg-red-100';
                        let textColor = 'text-red-800';
                        let symbol = '✗';
                        let title = 'Non disponible';
                        
                        if (availability) {
                          if (availability.type_choix === 'obligatoire') {
                            bgColor = 'bg-orange-100';
                            textColor = 'text-orange-800';
                            symbol = '★';
                            title = 'Surveillance obligatoire';
                          } else {
                            bgColor = 'bg-green-100';
                            textColor = 'text-green-800';
                            symbol = '✓';
                            title = 'Disponible (souhaité)';
                          }
                          
                          if (availability.nom_examen_obligatoire) {
                            title += ` - Examen: ${availability.nom_examen_obligatoire}`;
                          }
                        }
                        
                        return (
                          <td key={slotIndex} className="border border-uclouvain-blue-grey p-1 text-center">
                            <div 
                              className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded ${bgColor} ${textColor}`}
                              title={title}
                            >
                              {symbol}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {surveillants.length > 0 && timeSlots.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <span className="w-4 h-4 bg-green-100 text-green-800 flex items-center justify-center text-xs rounded">✓</span>
                <span>Disponible (souhaité)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-4 h-4 bg-orange-100 text-orange-800 flex items-center justify-center text-xs rounded">★</span>
                <span>Surveillance obligatoire</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-4 h-4 bg-red-100 text-red-800 flex items-center justify-center text-xs rounded">✗</span>
                <span>Non disponible</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
