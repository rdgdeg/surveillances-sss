
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ExamenSlot {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
}

interface TimeSlot {
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  examens: ExamenSlot[];
  type: 'surveillance' | 'examen';
  heure_debut_surveillance?: string; // Heure de début de surveillance (45 min avant)
}

export const useOptimizedCreneaux = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['optimized-creneaux', sessionId],
    queryFn: async (): Promise<TimeSlot[]> => {
      if (!sessionId) return [];

      const { data: examens, error } = await supabase
        .from('examens')
        .select('id, date_examen, heure_debut, heure_fin, matiere, salle')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .eq('statut_validation', 'VALIDE')
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;

      // Définir les créneaux de surveillance fixes
      const creneauxSurveillance = [
        { debut: '08:15', fin: '11:00' },
        { debut: '08:15', fin: '12:00' },
        { debut: '12:15', fin: '15:00' },
        { debut: '15:15', fin: '18:00' },
        { debut: '15:45', fin: '18:30' }
      ];

      // Fonction helper pour convertir time en minutes
      const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      // Fonction pour convertir minutes en time
      const toTimeString = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      // Fonction pour vérifier si un examen est couvert par un créneau
      const verifierCouverture = (examen: any, creneau: any): boolean => {
        const creneauDebutMin = toMinutes(creneau.debut);
        const creneauFinMin = toMinutes(creneau.fin);
        const examDebutMin = toMinutes(examen.heure_debut);
        const examFinMin = toMinutes(examen.heure_fin);

        // L'examen doit commencer au plus tôt 45 minutes après le début du créneau
        const debutSurveillanceMin = examDebutMin - 45;
        return debutSurveillanceMin >= creneauDebutMin && examFinMin <= creneauFinMin;
      };

      // Grouper les examens par date
      const examensParDate = examens?.reduce((acc: Record<string, any[]>, examen) => {
        if (!acc[examen.date_examen]) {
          acc[examen.date_examen] = [];
        }
        acc[examen.date_examen].push(examen);
        return acc;
      }, {}) || {};

      const timeSlots: TimeSlot[] = [];

      Object.entries(examensParDate).forEach(([date, examensJour]) => {
        // 1. Créer les créneaux d'examens réels (nouveauté)
        const groupesExamens = new Map<string, any[]>();
        
        examensJour.forEach(examen => {
          const cleGroupe = `${examen.heure_debut}-${examen.heure_fin}`;
          if (!groupesExamens.has(cleGroupe)) {
            groupesExamens.set(cleGroupe, []);
          }
          groupesExamens.get(cleGroupe)!.push(examen);
        });

        // Ajouter les créneaux d'examens réels
        Array.from(groupesExamens.entries()).forEach(([cleGroupe, examensGroupe]) => {
          const [heure_debut, heure_fin] = cleGroupe.split('-');
          timeSlots.push({
            date_examen: date,
            heure_debut,
            heure_fin,
            examens: examensGroupe,
            type: 'examen'
          });
        });

        // 2. Créer les créneaux de surveillance optimisés (existant)
        const creneauxUtilises = new Map<string, TimeSlot>();
        
        Array.from(groupesExamens.values()).forEach(groupeExamens => {
          // Trouver tous les créneaux compatibles pour ce groupe
          const creneauxCompatibles = creneauxSurveillance.filter(creneau => 
            groupeExamens.every(examen => verifierCouverture(examen, creneau))
          );
          
          if (creneauxCompatibles.length > 0) {
            // Prendre le créneau le plus court qui couvre tous les examens du groupe
            const creneauOptimal = creneauxCompatibles.sort((a, b) => {
              const dureeA = toMinutes(a.fin) - toMinutes(a.debut);
              const dureeB = toMinutes(b.fin) - toMinutes(b.debut);
              return dureeA - dureeB;
            })[0];
            
            const creneauKey = `${date}-${creneauOptimal.debut}-${creneauOptimal.fin}`;
            
            if (!creneauxUtilises.has(creneauKey)) {
              // Calculer l'heure de début de surveillance (45 min avant le premier examen)
              const premierExamenDebut = Math.min(...groupeExamens.map(e => toMinutes(e.heure_debut)));
              const debutSurveillance = toTimeString(premierExamenDebut - 45);
              
              creneauxUtilises.set(creneauKey, {
                date_examen: date,
                heure_debut: creneauOptimal.debut,
                heure_fin: creneauOptimal.fin,
                heure_debut_surveillance: debutSurveillance,
                examens: [],
                type: 'surveillance'
              });
            }
            
            // Ajouter tous les examens du groupe à ce créneau
            creneauxUtilises.get(creneauKey)!.examens.push(...groupeExamens);
          }
        });

        // Ajouter les créneaux de surveillance de cette date au résultat final
        timeSlots.push(...Array.from(creneauxUtilises.values()));
      });

      return timeSlots.sort((a, b) => {
        const dateCompare = a.date_examen.localeCompare(b.date_examen);
        if (dateCompare !== 0) return dateCompare;
        // Trier par type (examens avant surveillance) puis par heure
        if (a.type !== b.type) {
          return a.type === 'examen' ? -1 : 1;
        }
        return a.heure_debut.localeCompare(b.heure_debut);
      });
    },
    enabled: !!sessionId
  });
};
