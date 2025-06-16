
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlanningGeneralItem {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  auditoire: string;
  code_examen: string;
  faculte: string;
  enseignant_nom: string;
  enseignant_email: string;
  statut_validation: string;
  surveillants: Array<{
    id: string;
    nom: string;
    prenom: string;
    email: string;
  }>;
  nombre_surveillants_requis: number;
}

export const usePlanningGeneral = (sessionId?: string, searchTerm?: string) => {
  return useQuery({
    queryKey: ['planning-general', sessionId, searchTerm],
    queryFn: async () => {
      console.log('Fetching planning data for session:', sessionId);
      
      if (!sessionId) {
        console.log('No session selected');
        return [];
      }

      // Récupérer les contraintes d'auditoires
      const { data: contraintes, error: contraintesError } = await supabase
        .from('contraintes_auditoires')
        .select('auditoire, nombre_surveillants_requis');
      
      if (contraintesError) {
        console.error('Error fetching contraintes:', contraintesError);
      }

      // Créer une map des contraintes
      const contraintesMap: Record<string, number> = {};
      (contraintes || []).forEach((item) => {
        const auditoire = item.auditoire.trim();
        // Ajouter plusieurs variations pour améliorer la correspondance
        const variations = [
          auditoire.toLowerCase(),
          auditoire,
          auditoire.toLowerCase().replace(/\s+/g, ''),
          auditoire.toLowerCase().replace(/\s+/g, ' '),
        ];
        
        variations.forEach(variation => {
          contraintesMap[variation] = item.nombre_surveillants_requis;
        });
      });

      // Requête pour récupérer tous les examens actifs avec leurs attributions
      let query = supabase
        .from('examens')
        .select(`
          id,
          date_examen,
          heure_debut,
          heure_fin,
          matiere,
          salle,
          code_examen,
          faculte,
          enseignant_nom,
          enseignant_email,
          statut_validation,
          nombre_surveillants,
          is_active,
          attributions (
            surveillant_id,
            surveillants (
              id,
              nom,
              prenom,
              email
            )
          )
        `)
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('date_examen')
        .order('heure_debut');

      const { data: examens, error } = await query;
      
      console.log('Query result:', { examens, error });
      
      if (error) {
        console.error('Error fetching examens:', error);
        throw error;
      }

      if (!examens || examens.length === 0) {
        console.log('No examens found for session:', sessionId);
        return [];
      }

      // Traitement des données pour split des auditoires multiples
      const planningItems: PlanningGeneralItem[] = [];
      
      examens.forEach((examen: any) => {
        console.log('Processing examen:', examen.id, examen.matiere);
        
        // Split des auditoires (ex: "51 B, 71 - Simonart" → ["51 B", "71 - Simonart"])
        const auditoires = examen.salle
          .split(',')
          .map((aud: string) => aud.trim())
          .filter((aud: string) => aud.length > 0);

        // Récupérer les surveillants attribués
        const surveillants = examen.attributions?.map((attr: any) => ({
          id: attr.surveillants?.id || '',
          nom: attr.surveillants?.nom || '',
          prenom: attr.surveillants?.prenom || '',
          email: attr.surveillants?.email || ''
        })).filter((s: any) => s.id) || [];

        // Créer une ligne par auditoire
        auditoires.forEach((auditoire: string) => {
          // Calculer le nombre de surveillants requis selon les contraintes
          const auditoireNormalized = auditoire.toLowerCase().trim();
          const nombreRequis = contraintesMap[auditoireNormalized] || 
                              contraintesMap[auditoire] || 
                              contraintesMap[auditoire.toLowerCase().replace(/\s+/g, '')] ||
                              examen.nombre_surveillants || 1;

          const item: PlanningGeneralItem = {
            id: `${examen.id}_${auditoire.replace(/\s+/g, '_')}`,
            date_examen: examen.date_examen,
            heure_debut: examen.heure_debut,
            heure_fin: examen.heure_fin,
            matiere: examen.matiere,
            auditoire: auditoire,
            code_examen: examen.code_examen || '',
            faculte: examen.faculte || '',
            enseignant_nom: examen.enseignant_nom || '',
            enseignant_email: examen.enseignant_email || '',
            statut_validation: examen.statut_validation || 'NON_TRAITE',
            surveillants: surveillants,
            nombre_surveillants_requis: nombreRequis
          };

          // Filtrage par terme de recherche
          if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
              item.matiere.toLowerCase().includes(searchLower) ||
              item.auditoire.toLowerCase().includes(searchLower) ||
              item.code_examen.toLowerCase().includes(searchLower) ||
              item.faculte.toLowerCase().includes(searchLower) ||
              item.enseignant_nom.toLowerCase().includes(searchLower) ||
              item.date_examen.includes(searchTerm) ||
              item.surveillants.some(s => 
                s.nom.toLowerCase().includes(searchLower) ||
                s.prenom.toLowerCase().includes(searchLower) ||
                s.email.toLowerCase().includes(searchLower)
              );
            
            if (matchesSearch) {
              planningItems.push(item);
            }
          } else {
            planningItems.push(item);
          }
        });
      });

      console.log('Final planning items:', planningItems.length);
      return planningItems;
    },
    enabled: !!sessionId
  });
};
